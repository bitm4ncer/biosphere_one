// src/lib/history/landmarks.ts
//
// Loader for historic landmarks shown on the History tab. Combines two
// sources: OSM `historic=*` features via Overpass (dense, but most
// entries lack a date) and Wikidata SPARQL (sparser, but every result
// has an inception date and often a Wikipedia article). Results are
// merged into a single GeoJSON FeatureCollection ready for a MapLibre
// GeoJSON source. Slider-year filtering happens in the map layer via
// `setFilter`, so this module does no time filtering itself.

const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

const WIKIDATA_SPARQL = "https://query.wikidata.org/sparql";

// Wikidata QIDs of "things that are not landmarks" — events, people,
// administrative units. Used as a *negative* filter on the bbox query
// to reduce noise without forcing items into a narrow whitelist
// (`wdt:P31` direct match on a positive list missed most heritage
// sites because OSM/Wikidata kinds are highly heterogeneous).
const WIKIDATA_EXCLUDE_QIDS = [
  "Q5", // human
  "Q1656682", // event
  "Q15275719", // recurrent event
  "Q1190554", // occurrence
  "Q3024240", // historical country (admin)
  "Q56061", // administrative territorial entity
  "Q515", // city
  "Q3957", // town
  "Q532", // village
  "Q702492", // urban municipality
];

export interface LandmarkProperties {
  id: string;
  name: string;
  kind: string;
  /** Year as a number (e.g. 1485). Undefined when unknown. */
  inception?: number;
  /** Year of dissolution / destruction, when known. */
  dissolved?: number;
  /** Wikidata QID (without prefix), when known. */
  wikidataId?: string;
  /** Wikipedia article title, when known. */
  wikipediaTitle?: string;
  /** Wikipedia language edition for the title above (default "en"). */
  wikipediaLang?: string;
  /** Source bucket — useful for diagnostics + potential UI filters. */
  source: "osm" | "wikidata";
}

export type LandmarkFeature = GeoJSON.Feature<
  GeoJSON.Point,
  LandmarkProperties
>;

export type LandmarkCollection = GeoJSON.FeatureCollection<
  GeoJSON.Point,
  LandmarkProperties
>;

// ─── Overpass ─────────────────────────────────────────────────────────

interface OverpassElement {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}
interface OverpassResponse {
  elements: OverpassElement[];
}

async function overpass(
  query: string,
  signal?: AbortSignal,
): Promise<OverpassResponse> {
  let lastErr: unknown;
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(query)}`,
        signal,
      });
      if (!res.ok) {
        lastErr = new Error(`Overpass ${endpoint} → ${res.status}`);
        continue;
      }
      return (await res.json()) as OverpassResponse;
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      lastErr = err;
    }
  }
  throw new Error(
    `All Overpass endpoints failed: ${(lastErr as Error)?.message ?? "unknown"}`,
  );
}

/**
 * OSM start_date and end_date come in many flavours: "1485", "1485-04",
 * "C16", "early 19th century", "~1200". The pragmatic move is to grab
 * the first 4-digit year-looking token. Returns undefined if none.
 */
function parseOsmYear(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const m = value.match(/-?\d{3,4}/);
  if (!m) return undefined;
  const y = Number(m[0]);
  if (!Number.isFinite(y)) return undefined;
  // Slider only goes 1500..now; clamp older to undefined so they
  // surface as "undated" rather than mis-positioning at year 1500.
  return y;
}

async function fetchOverpassLandmarks(
  bbox: [number, number, number, number],
  signal?: AbortSignal,
): Promise<LandmarkFeature[]> {
  const [s, w, n, e] = bbox;
  const q = `
    [out:json][timeout:25];
    (
      node[historic](${s},${w},${n},${e});
      way[historic](${s},${w},${n},${e});
    );
    out tags center 400;
  `;
  const data = await overpass(q, signal);
  const out: LandmarkFeature[] = [];
  for (const el of data.elements) {
    const tags = el.tags ?? {};
    const lat = el.lat ?? el.center?.lat;
    const lon = el.lon ?? el.center?.lon;
    if (lat === undefined || lon === undefined) continue;
    const name =
      tags.name ?? tags["name:en"] ?? tags["name:de"] ?? tags.historic ?? "";
    if (!name) continue;
    const kind = tags.historic ?? "site";
    const inception = parseOsmYear(tags.start_date);
    const dissolved = parseOsmYear(tags.end_date);
    const wikidataId =
      typeof tags.wikidata === "string" && /^Q\d+$/.test(tags.wikidata)
        ? tags.wikidata
        : undefined;
    // OSM `wikipedia` tag format: `lang:Article Title` (e.g. "de:Düsseldorf").
    // Both pieces matter — the lang tells us which Wikipedia edition has the
    // article. Without it we'd default to en.wikipedia and 404 on most
    // German-only sites.
    let wikipediaLang: string | undefined;
    let wikipediaTitle: string | undefined;
    if (typeof tags.wikipedia === "string" && tags.wikipedia.includes(":")) {
      const idx = tags.wikipedia.indexOf(":");
      const lang = tags.wikipedia.slice(0, idx);
      const title = tags.wikipedia.slice(idx + 1);
      if (/^[a-z]{2,3}$/i.test(lang) && title) {
        wikipediaLang = lang.toLowerCase();
        wikipediaTitle = title;
      }
    }
    const props: LandmarkProperties = {
      id: `osm/${el.type}/${el.id}`,
      name,
      kind,
      source: "osm",
    };
    if (inception !== undefined) props.inception = inception;
    if (dissolved !== undefined) props.dissolved = dissolved;
    if (wikidataId) props.wikidataId = wikidataId;
    if (wikipediaTitle) props.wikipediaTitle = wikipediaTitle;
    if (wikipediaLang) props.wikipediaLang = wikipediaLang;
    out.push({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lon, lat] },
      properties: props,
    });
  }
  return out;
}

// ─── Wikidata SPARQL ──────────────────────────────────────────────────

interface SparqlBinding {
  type: string;
  value: string;
  "xml:lang"?: string;
  datatype?: string;
}

interface SparqlRow {
  item: SparqlBinding;
  itemLabel?: SparqlBinding;
  coord: SparqlBinding;
  inception?: SparqlBinding;
  dissolved?: SparqlBinding;
  kind?: SparqlBinding;
  wpTitle?: SparqlBinding;
}

interface SparqlResponse {
  results: { bindings: SparqlRow[] };
}

/**
 * Wikidata stores dates as `+1485-04-12T00:00:00Z`. Slice the year and
 * coerce to number. BCE dates start with a minus and are out of scope
 * (slider is 1500+) — those return undefined.
 */
function parseWikidataYear(value: string | undefined): number | undefined {
  if (!value) return undefined;
  const m = value.match(/^([+-]?)(\d{1,5})/);
  if (!m) return undefined;
  const sign = m[1] === "-" ? -1 : 1;
  const y = sign * Number(m[2]);
  if (!Number.isFinite(y)) return undefined;
  return y;
}

/**
 * Wikidata coords are `Point(lon lat)` WKT literals.
 */
function parseWktPoint(value: string): [number, number] | null {
  const m = value.match(/^Point\(([-\d.]+)\s+([-\d.]+)\)$/);
  if (!m) return null;
  const lon = Number(m[1]);
  const lat = Number(m[2]);
  if (!Number.isFinite(lon) || !Number.isFinite(lat)) return null;
  return [lon, lat];
}

async function fetchWikidataLandmarks(
  bbox: [number, number, number, number],
  signal?: AbortSignal,
): Promise<LandmarkFeature[]> {
  const [s, w, n, e] = bbox;
  // Force decimal formatting — integer-only WKT literals (e.g.
  // "Point(6 51)") are silently rejected by the box service.
  const fmt = (n: number) => n.toFixed(5);
  const excludeList = WIKIDATA_EXCLUDE_QIDS.map((q) => `wd:${q}`).join(" ");
  // All items in the bbox that have an inception date (P571) and are
  // not in the exclusion list. Wikibase's box service does the spatial
  // filter; the inception triple is what lets us place items on the
  // timeline. Keeping the kind unfiltered turned out to be essential —
  // OSM/Wikidata heritage classes are highly heterogeneous (Q23413
  // castle, Q1149531 fort, Q57831 fortress, etc.) and a positive
  // VALUES list silently skipped most of them.
  const query = `
    SELECT ?item ?itemLabel ?coord ?inception ?dissolved ?kind ?wpTitle WHERE {
      SERVICE wikibase:box {
        ?item wdt:P625 ?coord .
        bd:serviceParam wikibase:cornerSouthWest "Point(${fmt(w)} ${fmt(s)})"^^geo:wktLiteral .
        bd:serviceParam wikibase:cornerNorthEast "Point(${fmt(e)} ${fmt(n)})"^^geo:wktLiteral .
      }
      ?item wdt:P571 ?inception .
      OPTIONAL { ?item wdt:P31 ?kind . }
      OPTIONAL { ?item wdt:P576 ?dissolved . }
      OPTIONAL {
        ?wpArticle schema:about ?item ;
                   schema:isPartOf <https://en.wikipedia.org/> ;
                   schema:name ?wpTitle .
      }
      FILTER NOT EXISTS {
        ?item wdt:P31 ?excluded .
        VALUES ?excluded { ${excludeList} }
      }
      SERVICE wikibase:label { bd:serviceParam wikibase:language "en,de". }
    }
    LIMIT 400
  `;
  // POST avoids the URL-length cliff (the QID VALUES list pushes us
  // close to the 414 limit on some proxies).
  const res = await fetch(WIKIDATA_SPARQL, {
    method: "POST",
    headers: {
      Accept: "application/sparql-results+json",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: `query=${encodeURIComponent(query)}`,
    signal,
  });
  if (!res.ok) {
    throw new Error(`Wikidata SPARQL → ${res.status}`);
  }
  const data = (await res.json()) as SparqlResponse;
  const out: LandmarkFeature[] = [];
  // A Q-id may have multiple inception triples (estimates); keep the
  // earliest, drop duplicates by item.
  const byItem = new Map<string, LandmarkFeature>();
  for (const row of data.results.bindings) {
    const itemUri = row.item?.value ?? "";
    const qid = itemUri.split("/").pop() ?? "";
    if (!qid) continue;
    const coords = parseWktPoint(row.coord.value);
    if (!coords) continue;
    const inception = parseWikidataYear(row.inception?.value);
    if (inception === undefined) continue;
    const dissolved = parseWikidataYear(row.dissolved?.value);
    const name = row.itemLabel?.value ?? qid;
    const kindUri = row.kind?.value ?? "";
    const kindQid = kindUri.split("/").pop() ?? "site";
    const wikipediaTitle = row.wpTitle?.value;
    const existing = byItem.get(qid);
    if (existing) {
      const prev = existing.properties.inception;
      if (prev !== undefined && inception >= prev) continue;
    }
    const props: LandmarkProperties = {
      id: `wd/${qid}`,
      name,
      kind: kindQid,
      inception,
      wikidataId: qid,
      source: "wikidata",
    };
    if (dissolved !== undefined) props.dissolved = dissolved;
    if (wikipediaTitle) {
      props.wikipediaTitle = wikipediaTitle;
      props.wikipediaLang = "en";
    }
    byItem.set(qid, {
      type: "Feature",
      geometry: { type: "Point", coordinates: coords },
      properties: props,
    });
  }
  for (const f of byItem.values()) out.push(f);
  return out;
}

// ─── Tile cache ───────────────────────────────────────────────────────
//
// Same pattern as the rail-network cache in Map.tsx: slippy-map tiles
// at zoom 9 (~80 km × 50 km per tile in mid-latitudes). Pans within an
// already-loaded tile render instantly from cache.

export const HISTORY_TILE_ZOOM = 9;

interface CachedTile {
  features: LandmarkFeature[];
}
const tileCache = new Map<string, CachedTile>();
const tileInFlight = new Map<string, Promise<LandmarkFeature[]>>();
let rateLimitedUntil = 0;
const RATE_LIMIT_BACKOFF_MS = 15_000;

function isRateLimitError(err: unknown): boolean {
  const msg = (err as Error)?.message ?? "";
  return (
    msg.includes("429") ||
    msg.includes("CONNECTION_CLOSED") ||
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError")
  );
}

function tileKey(x: number, y: number): string {
  return `${x}/${y}`;
}

function lon2tileX(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * (1 << z));
}
function lat2tileY(lat: number, z: number): number {
  const r = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2) * (1 << z),
  );
}
function tileX2lon(x: number, z: number): number {
  return (x / (1 << z)) * 360 - 180;
}
function tileY2lat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / (1 << z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}

export function tilesForBounds(
  bounds: { west: number; south: number; east: number; north: number },
  z: number,
): { x: number; y: number }[] {
  const xMin = lon2tileX(bounds.west, z);
  const xMax = lon2tileX(bounds.east, z);
  const yMin = lat2tileY(bounds.north, z);
  const yMax = lat2tileY(bounds.south, z);
  const out: { x: number; y: number }[] = [];
  for (let x = xMin; x <= xMax; x += 1) {
    for (let y = yMin; y <= yMax; y += 1) {
      out.push({ x, y });
    }
  }
  return out;
}

export function tileBbox(
  z: number,
  x: number,
  y: number,
): [number, number, number, number] {
  // [south, west, north, east] — matches Overpass + our fetcher
  return [
    tileY2lat(y + 1, z),
    tileX2lon(x, z),
    tileY2lat(y, z),
    tileX2lon(x + 1, z),
  ];
}

async function loadTile(
  x: number,
  y: number,
  signal?: AbortSignal,
): Promise<LandmarkFeature[]> {
  const key = tileKey(x, y);
  const cached = tileCache.get(key);
  if (cached) return cached.features;
  const inFlight = tileInFlight.get(key);
  if (inFlight) return inFlight;
  const bbox = tileBbox(HISTORY_TILE_ZOOM, x, y);
  const promise = (async () => {
    // Run both queries in parallel; either failing alone shouldn't
    // wipe out the other source.
    const [osmRes, wdRes] = await Promise.allSettled([
      fetchOverpassLandmarks(bbox, signal),
      fetchWikidataLandmarks(bbox, signal),
    ]);
    const merged: LandmarkFeature[] = [];
    if (osmRes.status === "fulfilled") merged.push(...osmRes.value);
    else if (isRateLimitError(osmRes.reason)) {
      rateLimitedUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
    }
    if (wdRes.status === "fulfilled") merged.push(...wdRes.value);
    // Prefer Wikidata entry when both sources reference the same QID
    // (Wikidata always has a date; OSM rarely does).
    const seenQids = new Set<string>();
    for (const f of merged) {
      if (f.properties.source === "wikidata" && f.properties.wikidataId) {
        seenQids.add(f.properties.wikidataId);
      }
    }
    const deduped = merged.filter(
      (f) =>
        f.properties.source !== "osm" ||
        !f.properties.wikidataId ||
        !seenQids.has(f.properties.wikidataId),
    );
    tileCache.set(key, { features: deduped });
    return deduped;
  })();
  tileInFlight.set(key, promise);
  try {
    return await promise;
  } catch (err) {
    if (isRateLimitError(err)) {
      rateLimitedUntil = Date.now() + RATE_LIMIT_BACKOFF_MS;
    }
    throw err;
  } finally {
    tileInFlight.delete(key);
  }
}

/**
 * Public API — fetch all tiles intersecting the bounds, returning the
 * merged FeatureCollection. Resolves after every tile has loaded (or
 * failed). Caller decides when to call this (typically on `moveend`).
 */
export async function fetchLandmarksForBounds(
  bounds: { west: number; south: number; east: number; north: number },
  signal?: AbortSignal,
): Promise<LandmarkCollection> {
  if (Date.now() < rateLimitedUntil) {
    return featuresToCollection(collectCachedFeaturesForBounds(bounds));
  }
  const tiles = tilesForBounds(bounds, HISTORY_TILE_ZOOM);
  // Cap parallelism — Wikidata SPARQL throttles aggressively.
  const MAX_PARALLEL = 2;
  const queue = tiles.slice();
  const results: LandmarkFeature[] = [];
  const seen = new Set<string>();
  async function worker() {
    while (queue.length > 0) {
      const t = queue.shift();
      if (!t) return;
      try {
        const tileFeatures = await loadTile(t.x, t.y, signal);
        for (const f of tileFeatures) {
          if (seen.has(f.properties.id)) continue;
          seen.add(f.properties.id);
          results.push(f);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") throw err;
        // Surface load failures so users can see why a region is empty
        // (rate limit, network, query syntax) rather than silent zeros.
        console.warn(`[history-landmarks] tile ${t.x}/${t.y} failed`, err);
      }
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(MAX_PARALLEL, tiles.length) }, () => worker()),
  );
  return featuresToCollection(results);
}

function collectCachedFeaturesForBounds(bounds: {
  west: number;
  south: number;
  east: number;
  north: number;
}): LandmarkFeature[] {
  const tiles = tilesForBounds(bounds, HISTORY_TILE_ZOOM);
  const seen = new Set<string>();
  const out: LandmarkFeature[] = [];
  for (const t of tiles) {
    const data = tileCache.get(tileKey(t.x, t.y));
    if (!data) continue;
    for (const f of data.features) {
      if (seen.has(f.properties.id)) continue;
      seen.add(f.properties.id);
      out.push(f);
    }
  }
  return out;
}

function featuresToCollection(features: LandmarkFeature[]): LandmarkCollection {
  return { type: "FeatureCollection", features };
}

/**
 * Synchronous render of whatever is cached for the given bounds.
 * Useful for instant repaint while a fresh fetch is still in flight.
 */
export function landmarksFromCache(bounds: {
  west: number;
  south: number;
  east: number;
  north: number;
}): LandmarkCollection {
  return featuresToCollection(collectCachedFeaturesForBounds(bounds));
}
