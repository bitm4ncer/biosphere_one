import type { LatLng, Station, StationTier } from "./types";

const ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
  "https://overpass.private.coffee/api/interpreter",
];

interface OverpassNode {
  type: "node";
  id: number;
  lat: number;
  lon: number;
  tags?: Record<string, string>;
}

interface OverpassWay {
  type: "way";
  id: number;
  nodes?: number[];
  geometry?: { lat: number; lon: number }[];
  tags?: Record<string, string>;
}

type OverpassElement = OverpassNode | OverpassWay;

interface OverpassResponse {
  elements: OverpassElement[];
}

async function overpass(
  query: string,
  signal?: AbortSignal,
): Promise<OverpassResponse> {
  let lastErr: unknown;
  for (const endpoint of ENDPOINTS) {
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
 * Classify a station node into a visual tier from its OSM tags alone.
 * ICE/IC-class stations are detected via `usage=main` + `train=yes`, with a
 * name-based boost for "Hauptbahnhof" / "Hbf" / "Central".
 */
export function tierFromTags(tags: Record<string, string>): StationTier {
  const railway = tags.railway ?? "";
  const station = tags.station ?? "";

  if (railway === "tram_stop" || station === "tram") return "tram";
  if (station === "subway" || tags.subway === "yes") return "subway";
  if (
    station === "light_rail" ||
    tags.light_rail === "yes" ||
    /s-?bahn/i.test(tags.network ?? "") ||
    /s-?bahn/i.test(tags.operator ?? "")
  ) {
    return "sBahn";
  }
  if (railway === "halt") return "halt";

  const name = [tags.name, tags["name:de"], tags["name:en"]]
    .filter(Boolean)
    .join(" ");
  const isHbf = /\b(hbf|hauptbahnhof|central)\b/i.test(name);

  if (tags.train === "yes" && tags.usage === "main") return "intercity";
  if (isHbf) return "intercity";
  if (tags.train === "yes" && tags.usage === "branch") return "regional";
  if (railway === "station") return "regional";
  return "halt";
}

function nodeToStation(node: OverpassNode): Station | null {
  const tags = node.tags ?? {};
  const name = tags.name ?? tags["name:de"] ?? tags["name:en"] ?? tags.ref ?? "";
  if (!name) return null;
  return {
    id: `node/${node.id}`,
    name,
    lat: node.lat,
    lon: node.lon,
    kind: tags.railway ?? "station",
    tier: tierFromTags(tags),
    ref: tags.ref,
    tags,
  };
}

function dedupeByLocation(stations: Station[]): Station[] {
  const seen = new Map<string, Station>();
  for (const s of stations) {
    const key = `${s.lat.toFixed(4)},${s.lon.toFixed(4)},${s.name}`;
    if (!seen.has(key)) seen.set(key, s);
  }
  return Array.from(seen.values());
}

export async function fetchStationsAround(
  center: LatLng,
  radiusKm: number,
  signal?: AbortSignal,
): Promise<Station[]> {
  const radiusM = Math.max(100, Math.round(radiusKm * 1000));
  const q = `
    [out:json][timeout:25];
    (
      node[railway=station](around:${radiusM},${center.lat},${center.lon});
      node[railway=halt](around:${radiusM},${center.lat},${center.lon});
      node[railway=tram_stop](around:${radiusM},${center.lat},${center.lon});
    );
    out body;
  `;
  const data = await overpass(q, signal);
  const out: Station[] = [];
  for (const el of data.elements) {
    if (el.type !== "node") continue;
    const s = nodeToStation(el);
    if (s) out.push(s);
  }
  return dedupeByLocation(out);
}

/**
 * Fetch rail stations within a bounding box. Used for the ambient
 * auto-stations layer shown alongside the rail overlay.
 *
 * bbox = [south, west, north, east] (Overpass order).
 */
export async function fetchStationsBbox(
  bbox: [number, number, number, number],
  signal?: AbortSignal,
): Promise<Station[]> {
  const [s, w, n, e] = bbox;
  const q = `
    [out:json][timeout:25];
    (
      node[railway=station](${s},${w},${n},${e});
      node[railway=halt](${s},${w},${n},${e});
      node[railway=tram_stop](${s},${w},${n},${e});
    );
    out body;
  `;
  const data = await overpass(q, signal);
  const out: Station[] = [];
  for (const el of data.elements) {
    if (el.type !== "node") continue;
    const st = nodeToStation(el);
    if (st) out.push(st);
  }
  return dedupeByLocation(out);
}

/**
 * Fetch green/natural polygons within a bounding box.
 * bbox = [south, west, north, east] (Overpass order).
 */
export async function fetchGreenPolygons(
  bbox: [number, number, number, number],
  signal?: AbortSignal,
): Promise<GeoJSON.Feature<GeoJSON.Polygon>[]> {
  const [s, w, n, e] = bbox;
  const q = `
    [out:json][timeout:30];
    (
      way[landuse~"^(forest|meadow|farmland|grass|recreation_ground|orchard|vineyard|cemetery|village_green|allotments)$"](${s},${w},${n},${e});
      way[natural~"^(wood|heath|grassland|scrub|fell)$"](${s},${w},${n},${e});
      way[leisure~"^(park|nature_reserve|garden|golf_course)$"](${s},${w},${n},${e});
    );
    out geom;
  `;
  const data = await overpass(q, signal);
  const polygons: GeoJSON.Feature<GeoJSON.Polygon>[] = [];
  for (const el of data.elements) {
    if (el.type !== "way" || !el.geometry || el.geometry.length < 3) continue;
    const coords: [number, number][] = el.geometry.map((g) => [g.lon, g.lat]);
    const first = coords[0];
    const last = coords[coords.length - 1];
    if (first[0] !== last[0] || first[1] !== last[1]) coords.push(first);
    polygons.push({
      type: "Feature",
      geometry: { type: "Polygon", coordinates: [coords] },
      properties: { id: el.id, ...(el.tags ?? {}) },
    });
  }
  return polygons;
}
