import type { RouteCandidate, Waypoint } from "./types";
import {
  buildRoutePoints,
  fetchBrouterAlternatives,
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

function dedupe(candidates: RouteCandidate[]): RouteCandidate[] {
  const kept: RouteCandidate[] = [];
  for (const cand of candidates) {
    const dup = kept.find(
      (k) =>
        Math.abs(k.distanceKm - cand.distanceKm) < 0.1 &&
        Math.abs(k.durationMin - cand.durationMin) < 1,
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
 * Compute up to 3 hiking route candidates between user-defined waypoints.
 * Returns immediately after BRouter responds — routes have null
 * greenRatio at this point. Pass `onScored` to receive the same
 * candidates with greenRatio populated once the green polygon Overpass
 * query finishes (decoupled so the user sees the route line within ~1
 * second instead of waiting on green scoring).
 */
export async function computeHikingRoute(
  params: ComputeParams & {
    onScored?: (candidates: RouteCandidate[], notice?: string) => void;
  },
): Promise<ComputeResult> {
  const points = buildRoutePoints(params.waypoints, params.roundTrip);
  if (!points) {
    throw new Error("Add at least two waypoints to compute a route.");
  }

  const alts = await fetchBrouterAlternatives({
    points,
    profile: params.profile,
    maxAlternatives: 3,
    signal: params.signal,
  });

  if (alts.length === 0) throw new Error("BRouter returned no route.");

  const unique = dedupe(alts);

  // Phase 1: return the candidates immediately, ranked by distance only
  // (green is null). The caller can render the line right now.
  const initial = rankCandidates(unique).slice(0, 3);

  // Phase 2: kick off green scoring in the background. When it completes
  // we re-rank and notify via onScored.
  if (params.onScored) {
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
          params.onScored?.(initial, `Green scoring skipped: ${(err as Error).message}`);
        });
    }
  }

  return { candidates: initial };
}
