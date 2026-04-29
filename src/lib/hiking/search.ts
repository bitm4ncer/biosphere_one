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
  // 1.0 at ratio≤1, 0.7 at 1.5×, 0.4 at 2×, ~0 beyond 3×
  const detourFactor = Math.max(0, 1 - Math.max(0, ratio - 1) * 0.6);
  return green * 0.85 + detourFactor * 0.15;
}

/**
 * Compute up to 3 hiking route candidates between user-defined waypoints,
 * scored and ranked for scenic value (green coverage with mild detour
 * penalty). The first candidate is the recommended route.
 */
export async function computeHikingRoute(
  params: ComputeParams,
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

  let notice: string | undefined;
  const bbox = routesBbox(unique);
  if (bbox) {
    try {
      const polys = await fetchGreenPolygons(bbox, params.signal);
      applyGreenRatios(unique, polys);
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      notice = `Green scoring skipped: ${(err as Error).message}`;
    }
  }

  const baselineKm = Math.min(...unique.map((c) => c.distanceKm));
  unique.sort((a, b) => scenicScore(b, baselineKm) - scenicScore(a, baselineKm));

  return { candidates: unique.slice(0, 3), notice };
}
