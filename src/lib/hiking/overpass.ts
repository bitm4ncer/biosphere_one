import type { Station } from "./types";

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
 * Combined fetch: rail lines + railway stations + halts in the bbox in
 * a single Overpass call. Returns both as separate result sets. Halves
 * the request rate compared to two sequential queries.
 *
 * bbox = [south, west, north, east] (Overpass order).
 */
export async function fetchRailNetwork(
  bbox: [number, number, number, number],
  signal?: AbortSignal,
): Promise<{
  lines: GeoJSON.FeatureCollection<GeoJSON.LineString>;
  stations: Station[];
}> {
  const [s, w, n, e] = bbox;
  const q = `
    [out:json][timeout:25];
    (
      way[railway~"^(rail|light_rail|narrow_gauge|subway|tram|monorail)$"][service!~"."](${s},${w},${n},${e});
      way[railway~"^(rail|light_rail|narrow_gauge|subway|tram|monorail)$"][service=siding](${s},${w},${n},${e});
      node[railway=station](${s},${w},${n},${e});
      node[railway=halt](${s},${w},${n},${e});
    );
    out geom;
  `;
  const data = await overpass(q, signal);
  const lineFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];
  const stationNodes: OverpassNode[] = [];
  for (const el of data.elements) {
    if (el.type === "node") {
      stationNodes.push(el);
      continue;
    }
    if (el.type !== "way" || !el.geometry || el.geometry.length < 2) continue;
    const tags = el.tags ?? {};
    lineFeatures.push({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: el.geometry.map((g) => [g.lon, g.lat]),
      },
      properties: {
        id: el.id,
        kind: tags.railway ?? "rail",
        service: tags.service,
        tunnel: tags.tunnel === "yes",
      },
    });
  }
  const stations: Station[] = [];
  for (const el of stationNodes) {
    const tags = el.tags ?? {};
    const name = tags.name ?? tags["name:de"] ?? tags["name:en"] ?? tags.ref ?? "";
    if (!name) continue;
    stations.push({
      id: `node/${el.id}`,
      name,
      lat: el.lat,
      lon: el.lon,
      kind: tags.railway ?? "station",
      ref: tags.ref,
      tags,
    });
  }
  // dedupe stations by coarse location + name
  const seen = new Map<string, Station>();
  for (const st of stations) {
    const key = `${st.lat.toFixed(4)},${st.lon.toFixed(4)},${st.name}`;
    if (!seen.has(key)) seen.set(key, st);
  }
  return {
    lines: { type: "FeatureCollection", features: lineFeatures },
    stations: Array.from(seen.values()),
  };
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
