import type { LatLng, Station } from "./types";

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
    );
    out body;
  `;
  const data = await overpass(q, signal);
  const out: Station[] = [];
  for (const el of data.elements) {
    if (el.type !== "node") continue;
    const tags = el.tags ?? {};
    const name = tags.name ?? tags["name:de"] ?? tags["name:en"] ?? tags.ref ?? "";
    if (!name) continue;
    out.push({
      id: `node/${el.id}`,
      name,
      lat: el.lat,
      lon: el.lon,
      kind: tags.railway ?? "station",
      ref: tags.ref,
      tags,
    });
  }
  // dedupe by coarse location (same stop may be mapped twice)
  const seen = new Map<string, Station>();
  for (const s of out) {
    const key = `${s.lat.toFixed(4)},${s.lon.toFixed(4)},${s.name}`;
    if (!seen.has(key)) seen.set(key, s);
  }
  return Array.from(seen.values());
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
