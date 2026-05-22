import type { LatLng, RouteCandidate, Waypoint } from "./types";
import {
  buildRoutePoints,
  fetchBrouterAlternatives,
  fetchRoundTripAlternatives,
  type BrouterProfile,
} from "./routing";
import { fetchGreenPolygons } from "./overpass";
import { applyGreenRatios, routesBbox } from "./score";

interface ComputeParams {
  waypoints: Waypoint[];
  roundTrip: boolean;
  profile: BrouterProfile;
  signal?: AbortSignal;
}

interface ComputeResult {
  candidates: RouteCandidate[];
  notice?: string;
}

/**
 * Great-circle distance between two points in km. Used as a fast
 * pre-flight estimate so we can scale the routing strategy by length
 * without waiting on a network round-trip.
 */
function haversineKm(a: LatLng, b: LatLng): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const s =
    Math.sin(dLat / 2) ** 2
    + Math.sin(dLon / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2);
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Sum of leg great-circle distances. Real route is typically 1.2–1.5x
 *  longer; we multiply by 1.3 to get a working estimate. Round-trip
 *  doubles the path. */
function estimateRouteKm(waypoints: Waypoint[], roundTrip: boolean): number {
  if (waypoints.length < 2) return 0;
  let straight = 0;
  for (let i = 1; i < waypoints.length; i++) {
    straight += haversineKm(waypoints[i - 1], waypoints[i]);
  }
  const multiplier = roundTrip ? 2.6 : 1.3;
  return straight * multiplier;
}

/**
 * Adaptive alternative count: longer routes get fewer alternatives so
 * BRouter doesn't have to compute multiple 30-60s paths in parallel
 * (which both stresses the public endpoint and stretches the wait for
 * the user's first visible result).
 *
 * Thresholds tuned for BRouter's public endpoint:
 *   <  30 km → 3 alts (snappy, lots of choice)
 *   <  80 km → 2 alts (still useful, half the cost)
 *   ≥  80 km → 1 alt  (single best route, fastest path to UI)
 */
function alternativeCountFor(estimateKm: number): number {
  if (estimateKm < 30) return 3;
  if (estimateKm < 80) return 2;
  return 1;
}

/** Above this length the green-scoring bbox grows so large that the
 *  Overpass query is more expensive than the routing itself. Skip
 *  scoring rather than block the UI for an extra 30-60s. */
const GREEN_SCORING_MAX_KM = 120;

function dedupe(candidates: RouteCandidate[]): RouteCandidate[] {
  const kept: RouteCandidate[] = [];
  for (const cand of candidates) {
    const dup = kept.find(
      (k) =>
        Math.abs(k.distanceKm - cand.distanceKm) < 0.1
        && Math.abs(k.durationMin - cand.durationMin) < 1,
    );
    if (!dup) kept.push(cand);
  }
  return kept;
}

/**
 * scenicScore in [0..1]: prefers routes with more green coverage. We add a
 * gentle penalty for excessive detour so a route that is 80% green but 4×
 * the length of a 50% green alternative does not always win.
 */
function scenicScore(c: RouteCandidate, baselineKm: number): number {
  const green = c.greenRatio ?? 0;
  const ratio = baselineKm > 0 ? c.distanceKm / baselineKm : 1;
  const detourFactor = Math.max(0, 1 - Math.max(0, ratio - 1) * 0.6);
  return green * 0.85 + detourFactor * 0.15;
}

function rankCandidates(unique: RouteCandidate[]): RouteCandidate[] {
  if (unique.length === 0) return unique;
  const baselineKm = Math.min(...unique.map((c) => c.distanceKm));
  return [...unique].sort(
    (a, b) => scenicScore(b, baselineKm) - scenicScore(a, baselineKm),
  );
}

/**
 * Compute up to N hiking/biking route candidates between user-defined
 * waypoints. The number of alternatives + whether to attempt green
 * scoring is scaled by estimated route length so 200 km routes don't
 * wait minutes for things that mostly matter on 5 km routes.
 *
 * Two streaming callbacks let the UI render progressively:
 *   - `onCandidate(c, total)` fires for each BRouter alternative the
 *     moment it lands. The UI can show Route 1 as soon as ~25 s
 *     instead of waiting for the slowest alt to finish.
 *   - `onScored(candidates, notice?)` fires once green scoring
 *     finishes (or is skipped). The UI re-ranks at this point.
 */
export async function computeHikingRoute(
  params: ComputeParams & {
    onCandidate?: (c: RouteCandidate, expected: number) => void;
    onScored?: (candidates: RouteCandidate[], notice?: string) => void;
  },
): Promise<ComputeResult> {
  const points = buildRoutePoints(params.waypoints);
  if (!points) {
    throw new Error("Add at least two waypoints to compute a route.");
  }

  const estimateKm = estimateRouteKm(params.waypoints, params.roundTrip);
  const maxAlternatives = alternativeCountFor(estimateKm);

  const alts = params.roundTrip
    ? await fetchRoundTripAlternatives({
        waypoints: params.waypoints,
        profile: params.profile,
        maxAlternatives,
        signal: params.signal,
        onCandidate: params.onCandidate
          ? (c) => params.onCandidate?.(c, maxAlternatives)
          : undefined,
      })
    : await fetchBrouterAlternatives({
        points,
        profile: params.profile,
        maxAlternatives,
        signal: params.signal,
        onCandidate: params.onCandidate
          ? (c) => params.onCandidate?.(c, maxAlternatives)
          : undefined,
      });

  if (alts.length === 0) throw new Error("BRouter returned no route.");

  const unique = dedupe(alts);
  const initial = rankCandidates(unique).slice(0, 3);

  // Decide whether to attempt green scoring. For very long routes
  // the bbox is so large the Overpass call becomes the new dominant
  // wait — better to ship the route fast and surface a notice than
  // make the user wait another minute for a "% green" number.
  if (params.onScored) {
    const longestKm = Math.max(...unique.map((c) => c.distanceKm), 0);
    if (longestKm > GREEN_SCORING_MAX_KM) {
      // Notify the caller immediately so the phase indicator can
      // settle out of "scoring" without ever entering it.
      params.onScored(
        initial,
        `Green scoring skipped — route is ${Math.round(longestKm)} km (limit ${GREEN_SCORING_MAX_KM} km).`,
      );
    } else {
      const bbox = routesBbox(unique);
      if (bbox) {
        fetchGreenPolygons(bbox, params.signal)
          .then((polys) => {
            if (params.signal?.aborted) return;
            applyGreenRatios(unique, polys);
            const reranked = rankCandidates(unique).slice(0, 3);
            params.onScored?.(reranked);
          })
          .catch((err) => {
            if ((err as Error).name === "AbortError") return;
            params.onScored?.(
              initial,
              `Green scoring skipped: ${(err as Error).message}`,
            );
          });
      }
    }
  }

  return { candidates: initial };
}
