import type { LatLng, RouteCandidate, Waypoint } from "./types";

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

function lonlatsParam(points: LatLng[]): string {
  return points.map((p) => `${p.lon.toFixed(6)},${p.lat.toFixed(6)}`).join("|");
}

/**
 * Convert waypoints (+ optional round-trip closing point) into the BRouter
 * `lonlats` parameter format. Returns null if there are too few points.
 */
export function buildRoutePoints(
  waypoints: Waypoint[],
  roundTrip: boolean,
): LatLng[] | null {
  if (waypoints.length < 2) return null;
  const points: LatLng[] = waypoints.map((w) => ({ lat: w.lat, lon: w.lon }));
  if (roundTrip) points.push(points[0]);
  return points;
}

/**
 * Call BRouter for a sequence of waypoints + a single alternative index.
 * The first and last entries of `points` are start and end; everything in
 * between is treated as a via.
 */
export async function fetchBrouterRoute(params: {
  points: LatLng[];
  profile: BrouterProfile;
  alternativeIdx: number;
  signal?: AbortSignal;
}): Promise<RouteCandidate> {
  const lonlats = lonlatsParam(params.points);
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
 * Fetch up to `maxAlternatives` alternatives for a single profile in
 * parallel. ~3× faster than the previous sequential loop.
 */
export async function fetchBrouterAlternatives(params: {
  points: LatLng[];
  profile: BrouterProfile;
  maxAlternatives?: number;
  signal?: AbortSignal;
}): Promise<RouteCandidate[]> {
  const max = params.maxAlternatives ?? 3;
  const promises = Array.from({ length: max }, (_, alt) =>
    fetchBrouterRoute({
      points: params.points,
      profile: params.profile,
      alternativeIdx: alt,
      signal: params.signal,
    }).catch((err) => {
      if ((err as Error).name === "AbortError") throw err;
      return null as RouteCandidate | null;
    }),
  );
  const settled = await Promise.all(promises);
  const out = settled.filter((r): r is RouteCandidate => r != null);
  if (out.length === 0) {
    throw new Error("BRouter returned no route.");
  }
  return out;
}
