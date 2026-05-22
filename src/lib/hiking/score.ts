import along from "@turf/along";
import length from "@turf/length";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { lineString } from "@turf/helpers";
import type { RouteCandidate } from "./types";

// Target number of samples per route, regardless of length. Keeps
// point-in-polygon work bounded so a 200 km route doesn't cost 200x
// the CPU of a 1 km route. ~400 samples is enough to get a stable
// green ratio while staying fast.
const TARGET_SAMPLES_PER_ROUTE = 400;
const MIN_STEP_KM = 0.05; // resolution cap for very short routes
const MAX_STEP_KM = 1.0;  // resolution floor for very long routes

function adaptiveStepKm(totalKm: number): number {
  if (totalKm <= 0) return MIN_STEP_KM;
  const raw = totalKm / TARGET_SAMPLES_PER_ROUTE;
  return Math.min(MAX_STEP_KM, Math.max(MIN_STEP_KM, raw));
}

/**
 * Compute the fraction (0..1) of a route that falls inside any of the
 * provided green/natural polygons. Sample density adapts to route
 * length so cost stays roughly constant.
 */
export function computeGreenRatio(
  coordinates: [number, number, number?][],
  greenPolygons: GeoJSON.Feature<GeoJSON.Polygon>[],
  stepKm?: number,
): number {
  if (coordinates.length < 2) return 0;
  if (greenPolygons.length === 0) return 0;
  const line = lineString(coordinates.map((c) => [c[0], c[1]]));
  const totalKm = length(line, { units: "kilometers" });
  if (totalKm <= 0) return 0;
  const step = stepKm ?? adaptiveStepKm(totalKm);
  let hits = 0;
  let total = 0;
  for (let d = 0; d <= totalKm + 1e-9; d += step) {
    const p = along(line, d, { units: "kilometers" });
    total += 1;
    for (const poly of greenPolygons) {
      if (booleanPointInPolygon(p, poly)) {
        hits += 1;
        break;
      }
    }
  }
  return total === 0 ? 0 : hits / total;
}

export function applyGreenRatios(
  candidates: RouteCandidate[],
  greenPolygons: GeoJSON.Feature<GeoJSON.Polygon>[],
  stepKm?: number,
): void {
  for (const c of candidates) {
    c.greenRatio = computeGreenRatio(c.coordinates, greenPolygons, stepKm);
  }
}

/**
 * Compute the bounding box union for a set of routes.
 * Returns [south, west, north, east] for Overpass.
 */
export function routesBbox(
  candidates: RouteCandidate[],
  paddingDeg = 0.01,
): [number, number, number, number] | null {
  if (candidates.length === 0) return null;
  let south = Infinity;
  let west = Infinity;
  let north = -Infinity;
  let east = -Infinity;
  for (const c of candidates) {
    for (const [lon, lat] of c.coordinates) {
      if (lat < south) south = lat;
      if (lat > north) north = lat;
      if (lon < west) west = lon;
      if (lon > east) east = lon;
    }
  }
  if (!Number.isFinite(south)) return null;
  return [
    south - paddingDeg,
    west - paddingDeg,
    north + paddingDeg,
    east + paddingDeg,
  ];
}
