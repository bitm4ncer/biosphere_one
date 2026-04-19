import type { Bbox } from "@/types/sentinel";

const EARTH_RADIUS_KM = 6371;

export function bboxAreaKm2(bbox: Bbox): number {
  const [west, south, east, north] = bbox;
  const latMid = ((north + south) / 2) * (Math.PI / 180);
  const widthKm = ((east - west) * Math.PI * EARTH_RADIUS_KM * Math.cos(latMid)) / 180;
  const heightKm = ((north - south) * Math.PI * EARTH_RADIUS_KM) / 180;
  return Math.abs(widthKm * heightKm);
}

export function bboxAspectRatio(bbox: Bbox): number {
  const [west, south, east, north] = bbox;
  const latMid = ((north + south) / 2) * (Math.PI / 180);
  const widthDeg = (east - west) * Math.cos(latMid);
  const heightDeg = north - south;
  return Math.abs(widthDeg / heightDeg);
}

export function formatBbox(bbox: Bbox, precision = 4): string {
  return bbox.map((v) => v.toFixed(precision)).join(", ");
}

export function isValidBbox(bbox: Bbox | null | undefined): bbox is Bbox {
  if (!bbox || bbox.length !== 4) return false;
  const [w, s, e, n] = bbox;
  return (
    Number.isFinite(w) &&
    Number.isFinite(s) &&
    Number.isFinite(e) &&
    Number.isFinite(n) &&
    w < e &&
    s < n &&
    w >= -180 &&
    e <= 180 &&
    s >= -90 &&
    n <= 90
  );
}
