import type { LatLng, RouteCandidate } from "./types";
import {
  fetchBrouterAlternatives,
  type BrouterProfile,
} from "./routing";
import { fetchGreenPolygons } from "./overpass";
import { applyGreenRatios, routesBbox } from "./score";

interface SearchParams {
  from: LatLng;
  to: LatLng;
  /** Optional intermediate waypoints the route must pass through (in order). */
  vias?: LatLng[];
  /** [min, max] in kilometers. Use [0, Infinity] to disable filtering. */
  distanceKm: [number, number];
  profiles?: BrouterProfile[];
  /** If true (default), fetch green polygons and score each candidate. */
  scoreGreen?: boolean;
  /** Minimum required greenRatio to keep a candidate. 0 disables. */
  greenMin?: number;
  signal?: AbortSignal;
}

function dedupe(candidates: RouteCandidate[]): RouteCandidate[] {
  const kept: RouteCandidate[] = [];
  for (const cand of candidates) {
    const dup = kept.find((k) => Math.abs(k.distanceKm - cand.distanceKm) < 0.1);
    if (!dup) kept.push(cand);
  }
  return kept;
}

function withinWindow(
  r: RouteCandidate,
  [min, max]: [number, number],
  tolKm = 0.5,
): boolean {
  return r.distanceKm >= min - tolKm && r.distanceKm <= max + tolKm;
}

function windowDistance(r: RouteCandidate, [min, max]: [number, number]): number {
  if (r.distanceKm < min) return min - r.distanceKm;
  if (r.distanceKm > max) return r.distanceKm - max;
  return 0;
}

/**
 * Deterministic route search:
 *   1. Query BRouter with each selected profile (up to 4 alternatives each).
 *   2. Deduplicate by distance.
 *   3. Filter to the requested distance window (with small tolerance).
 *   4. Fetch green polygons over the union bbox, score each candidate.
 *   5. Filter by greenMin if requested, then rank by green ratio and
 *      proximity to the middle of the window.
 *
 * If no candidate fits the window, the closest ones are returned anyway
 * so the user can see what the routers produced.
 */
export async function searchHikingRoutes(
  params: SearchParams,
): Promise<{
  candidates: RouteCandidate[];
  greenPolygonCount: number;
  notice?: string;
}> {
  const profiles = params.profiles ?? ["hiking-beta", "trekking"];
  const allResults: RouteCandidate[] = [];
  const errors: string[] = [];

  for (const profile of profiles) {
    try {
      const alts = await fetchBrouterAlternatives({
        from: params.from,
        to: params.to,
        vias: params.vias,
        profile,
        maxAlternatives: 4,
        signal: params.signal,
      });
      allResults.push(...alts);
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      errors.push(`${profile}: ${(err as Error).message}`);
    }
  }

  if (allResults.length === 0) {
    throw new Error(
      `BRouter returned no route. ${errors.join(" · ") || ""}`.trim(),
    );
  }

  const unique = dedupe(allResults);
  const [min, max] = params.distanceKm;
  const inWindow = unique.filter((r) => withinWindow(r, [min, max]));
  const pool = inWindow.length > 0
    ? inWindow
    : [...unique].sort(
        (a, b) => windowDistance(a, [min, max]) - windowDistance(b, [min, max]),
      );

  let greenPolygonCount = 0;
  let notice: string | undefined;
  if (params.scoreGreen !== false) {
    const bbox = routesBbox(pool);
    if (bbox) {
      try {
        const polys = await fetchGreenPolygons(bbox, params.signal);
        greenPolygonCount = polys.length;
        applyGreenRatios(pool, polys);
      } catch (err) {
        if ((err as Error).name === "AbortError") throw err;
        notice = `Green scoring skipped: ${(err as Error).message}`;
      }
    }
  }

  const greenMin = params.greenMin ?? 0;
  let filtered = pool;
  if (greenMin > 0) {
    filtered = pool.filter((r) => (r.greenRatio ?? 0) >= greenMin);
    if (filtered.length === 0) {
      filtered = pool;
      notice = notice
        ? `${notice} · none met green ≥ ${Math.round(greenMin * 100)}%`
        : `None met green ≥ ${Math.round(greenMin * 100)}%, showing best available`;
    }
  }

  const mid = (min + max) / 2;
  filtered.sort((a, b) => {
    const ga = a.greenRatio ?? 0;
    const gb = b.greenRatio ?? 0;
    if (Math.abs(gb - ga) > 0.05) return gb - ga;
    return Math.abs(a.distanceKm - mid) - Math.abs(b.distanceKm - mid);
  });

  if (inWindow.length === 0) {
    notice = notice
      ? notice
      : "No route within the requested distance window — showing closest matches.";
  }

  return {
    candidates: filtered.slice(0, 3),
    greenPolygonCount,
    notice,
  };
}
