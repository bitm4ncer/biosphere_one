import along from "@turf/along";
import length from "@turf/length";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import { lineString } from "@turf/helpers";
import type { RouteCandidate } from "./types";

/**
 * Compute the fraction (0..1) of a route that falls inside any of the
 * provided green/natural polygons. Samples every `stepKm` kilometers.
 */
export function computeGreenRatio(
  coordinates: [number, number, number?][],
  greenPolygons: GeoJSON.Feature<GeoJSON.Polygon>[],
  stepKm = 0.1,
): number {
  if (coordinates.length < 2) return 0;
  if (greenPolygons.length === 0) return 0;
  const line = lineString(coordinates.map((c) => [c[0], c[1]]));
  const totalKm = length(line, { units: "kilometers" });
  if (totalKm <= 0) return 0;
  let hits = 0;
  let total = 0;
  for (let d = 0; d <= totalKm + 1e-9; d += stepKm) {
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
  stepKm = 0.1,
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
