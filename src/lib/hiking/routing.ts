import type { LatLng, RouteCandidate } from "./types";

const BROUTER_URL = "https://brouter.de/brouter";

export const BROUTER_PROFILES = [
  { id: "hiking-beta", label: "Hiking" },
  { id: "hiking-mountain", label: "Hiking · Mountain" },
  { id: "trekking", label: "Trekking" },
  { id: "walking-fast", label: "Walking · fast" },
] as const;

export type BrouterProfile = (typeof BROUTER_PROFILES)[number]["id"];

interface BrouterProperties {
  "track-length"?: string;
  "total-time"?: string;
  "filtered ascend"?: string;
  "plain-ascend"?: string;
  "filtered descend"?: string;
  messages?: unknown[];
}

/**
 * Call BRouter's public endpoint and parse the GeoJSON response.
 * Returns a single RouteCandidate for the requested alternative index.
 */
export async function fetchBrouterRoute(params: {
  from: LatLng;
  to: LatLng;
  vias?: LatLng[];
  profile: BrouterProfile;
  alternativeIdx: number;
  signal?: AbortSignal;
}): Promise<RouteCandidate> {
  const waypoints = [params.from, ...(params.vias ?? []), params.to];
  const lonlats = waypoints
    .map((p) => `${p.lon.toFixed(6)},${p.lat.toFixed(6)}`)
    .join("|");
  const qs = new URLSearchParams({
    lonlats,
    profile: params.profile,
    alternativeidx: String(params.alternativeIdx),
    format: "geojson",
  });
  const res = await fetch(`${BROUTER_URL}?${qs}`, { signal: params.signal });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`BRouter ${res.status}: ${text.slice(0, 200)}`);
  }
  if (!text.trim().startsWith("{")) {
    throw new Error(`BRouter: ${text.trim().slice(0, 200)}`);
  }
  const data = JSON.parse(text) as GeoJSON.FeatureCollection;
  const feature = data.features?.[0];
  if (!feature || feature.geometry.type !== "LineString") {
    throw new Error("BRouter: no route geometry");
  }
  const coords = feature.geometry.coordinates as [number, number, number?][];
  const props = (feature.properties ?? {}) as BrouterProperties;
  const distanceKm = Number(props["track-length"] ?? 0) / 1000;
  const durationMin = Number(props["total-time"] ?? 0) / 60;
  const ascentM = Number(props["filtered ascend"] ?? props["plain-ascend"] ?? 0);
  const descentM = Number(props["filtered descend"] ?? 0);
  return {
    id: `brouter:${params.profile}:${params.alternativeIdx}:${lonlats}`,
    source: "brouter",
    profile: params.profile,
    alternativeIdx: params.alternativeIdx,
    distanceKm,
    durationMin,
    ascentM,
    descentM,
    greenRatio: null,
    coordinates: coords,
  };
}

/**
 * Fetch all available alternatives for one profile by iterating `alternativeidx`
 * from 0 until BRouter reports no further alternative.
 */
export async function fetchBrouterAlternatives(params: {
  from: LatLng;
  to: LatLng;
  vias?: LatLng[];
  profile: BrouterProfile;
  maxAlternatives?: number;
  signal?: AbortSignal;
}): Promise<RouteCandidate[]> {
  const max = params.maxAlternatives ?? 4;
  const out: RouteCandidate[] = [];
  for (let alt = 0; alt < max; alt += 1) {
    try {
      const r = await fetchBrouterRoute({
        from: params.from,
        to: params.to,
        vias: params.vias,
        profile: params.profile,
        alternativeIdx: alt,
        signal: params.signal,
      });
      out.push(r);
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      // no more alternatives — break, but keep what we have
      if (alt === 0) throw err;
      break;
    }
  }
  return out;
}
