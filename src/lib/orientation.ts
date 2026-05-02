/**
 * Bearing helpers for the map-orientation toggle. Lightweight in-house
 * great-circle math + a brute-force segment scan, so we don't pull in
 * @turf/bearing or @turf/nearest-point-on-line just for two functions.
 */

/** Initial great-circle bearing A→B in degrees (0..360, clockwise from N). */
export function bearingTo(
  lonA: number,
  latA: number,
  lonB: number,
  latB: number,
): number {
  const phi1 = (latA * Math.PI) / 180;
  const phi2 = (latB * Math.PI) / 180;
  const dLambda = ((lonB - lonA) * Math.PI) / 180;
  const y = Math.sin(dLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(dLambda);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

/**
 * Squared planar distance from P to segment A→B. Treats lon/lat as
 * equirectangular near P with a cos(lat) longitude scale — accurate
 * enough for "which segment am I closest to" at any walking-speed scale.
 */
function distSqToSeg(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cosLat: number,
): number {
  const dx = (bx - ax) * cosLat;
  const dy = by - ay;
  const ex = (px - ax) * cosLat;
  const ey = py - ay;
  const len2 = dx * dx + dy * dy;
  const t = len2 > 0 ? Math.max(0, Math.min(1, (ex * dx + ey * dy) / len2)) : 0;
  const cx = ax + (dx * t) / cosLat;
  const cy = ay + dy * t;
  const fx = (px - cx) * cosLat;
  const fy = py - cy;
  return fx * fx + fy * fy;
}

/**
 * Brute-force scan: finds the segment of `coords` (a [lon,lat,?ele][]
 * polyline) closest to `pos`, and returns that segment's compass
 * bearing in degrees. Returns null if the polyline is too short. ~0.05
 * ms for 1k segments, well under any GPS / compass tick rate.
 */
export function bearingAlongRoute(
  coords: ReadonlyArray<readonly [number, number, number?]>,
  pos: readonly [number, number],
): number | null {
  if (coords.length < 2) return null;
  const [px, py] = pos;
  const cosLat = Math.cos((py * Math.PI) / 180);
  let best = Infinity;
  let bestI = 0;
  for (let i = 0; i < coords.length - 1; i++) {
    const [ax, ay] = coords[i];
    const [bx, by] = coords[i + 1];
    const d = distSqToSeg(px, py, ax, ay, bx, by, cosLat);
    if (d < best) {
      best = d;
      bestI = i;
    }
  }
  const [ax, ay] = coords[bestI];
  const [bx, by] = coords[bestI + 1];
  return bearingTo(ax, ay, bx, by);
}
