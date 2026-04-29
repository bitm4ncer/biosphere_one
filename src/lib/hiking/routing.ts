import type { LatLng, RouteCandidate, Waypoint } from "./types";

const BROUTER_URL = "https://brouter.de/brouter";

export const BROUTER_PROFILES = [
  // Walking / hiking
  { id: "hiking-beta", label: "Hike", mode: "walk" },
  { id: "hiking-mountain", label: "Mountain", mode: "walk" },
  { id: "shortest", label: "Fast", mode: "walk" },
  // Bike — quality-first ordering. Trekking prefers cycle paths, low-traffic
  // avoids busy roads (quality > distance), gravel & mtb open up off-road.
  { id: "trekking", label: "Trekking", mode: "bike" },
  { id: "fastbike-lowtraffic", label: "Low traffic", mode: "bike" },
  { id: "gravel", label: "Gravel", mode: "bike" },
  { id: "mtb", label: "MTB", mode: "bike" },
] as const;

export type BrouterProfile = (typeof BROUTER_PROFILES)[number]["id"];
export type RouteMode = (typeof BROUTER_PROFILES)[number]["mode"];

export function profileMode(id: BrouterProfile): RouteMode {
  return BROUTER_PROFILES.find((p) => p.id === id)?.mode ?? "walk";
}

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
 * Convert a waypoint list to BRouter `lonlats` order. For round trips we
 * route forward + return separately (see fetchRoundTripAlternatives) so
 * this helper no longer appends a closing point.
 */
export function buildRoutePoints(waypoints: Waypoint[]): LatLng[] | null {
  if (waypoints.length < 2) return null;
  return waypoints.map((w) => ({ lat: w.lat, lon: w.lon }));
}

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

/**
 * Approximate fraction of `b`'s vertices that fall in the same ~50 m cell
 * as some vertex of `a`. Used to rank loop combos: lower = more new
 * ground covered.
 */
function pathOverlapFraction(
  a: RouteCandidate,
  b: RouteCandidate,
  cellMeters = 50,
): number {
  if (b.coordinates.length === 0) return 0;
  const cellDeg = cellMeters / 111_000;
  const cells = new Set<string>();
  for (const [lon, lat] of a.coordinates) {
    cells.add(`${Math.round(lon / cellDeg)}:${Math.round(lat / cellDeg)}`);
  }
  let hit = 0;
  for (const [lon, lat] of b.coordinates) {
    if (cells.has(`${Math.round(lon / cellDeg)}:${Math.round(lat / cellDeg)}`))
      hit += 1;
  }
  return hit / b.coordinates.length;
}

function mergeLegs(forward: RouteCandidate, back: RouteCandidate): RouteCandidate {
  // Last vertex of forward should equal first of back; drop the dup.
  const coords = forward.coordinates.concat(back.coordinates.slice(1));
  return {
    id: `loop:${forward.profile}:${forward.alternativeIdx}-${back.alternativeIdx}:${coords.length}`,
    source: "brouter",
    profile: forward.profile,
    alternativeIdx: forward.alternativeIdx,
    distanceKm: forward.distanceKm + back.distanceKm,
    durationMin: forward.durationMin + back.durationMin,
    ascentM: forward.ascentM + back.ascentM,
    descentM: forward.descentM + back.descentM,
    greenRatio: null,
    coordinates: coords,
  };
}

/**
 * For round-trip mode, request forward + return legs as separate BRouter
 * calls and combine each forward alt with the *least-overlapping* return
 * alt. This produces real loops that visit new ground rather than the
 * usual out-and-back.
 */
export async function fetchRoundTripAlternatives(params: {
  waypoints: Waypoint[];
  profile: BrouterProfile;
  signal?: AbortSignal;
}): Promise<RouteCandidate[]> {
  const fwdPts: LatLng[] = params.waypoints.map((w) => ({
    lat: w.lat,
    lon: w.lon,
  }));
  if (fwdPts.length < 2) {
    throw new Error("Round trip needs at least two waypoints.");
  }
  const backPts = [...fwdPts].reverse();

  const [forward, back] = await Promise.all([
    fetchBrouterAlternatives({
      points: fwdPts,
      profile: params.profile,
      maxAlternatives: 3,
      signal: params.signal,
    }),
    fetchBrouterAlternatives({
      points: backPts,
      profile: params.profile,
      maxAlternatives: 3,
      signal: params.signal,
    }),
  ]);

  const usedBack = new Set<number>();
  const combos: RouteCandidate[] = [];
  for (const f of forward) {
    let best: { b: RouteCandidate; overlap: number } | null = null;
    // First pass: prefer a back leg we haven't used yet to maximise variety.
    for (const b of back) {
      if (usedBack.has(b.alternativeIdx)) continue;
      const overlap = pathOverlapFraction(f, b);
      if (best == null || overlap < best.overlap) best = { b, overlap };
    }
    // Fallback: if every back leg is already used, allow reuse so we still
    // produce a candidate.
    if (!best) {
      for (const b of back) {
        const overlap = pathOverlapFraction(f, b);
        if (best == null || overlap < best.overlap) best = { b, overlap };
      }
    }
    if (best) {
      usedBack.add(best.b.alternativeIdx);
      combos.push(mergeLegs(f, best.b));
    }
  }
  if (combos.length === 0) {
    throw new Error("BRouter returned no round-trip route.");
  }
  return combos;
}
