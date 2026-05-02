import type { Bbox } from "@/types/sentinel";
import { fetchFrame } from "./process";

export interface LatestOverlayResult {
  blob: Blob;
  from: string;
  to: string;
  bbox: Bbox;
  width: number;
  height: number;
}

const EARTH_RADIUS_M = 6378137;

function bboxMeters(bbox: Bbox): { wm: number; hm: number } {
  const [west, south, east, north] = bbox;
  const latMid = ((north + south) / 2) * (Math.PI / 180);
  const wm = (east - west) * (Math.PI / 180) * EARTH_RADIUS_M * Math.cos(latMid);
  const hm = (north - south) * (Math.PI / 180) * EARTH_RADIUS_M;
  return { wm: Math.abs(wm), hm: Math.abs(hm) };
}

export function pickFetchResolution(
  bbox: Bbox,
  maxPixelsPerSide = 2048,
): { width: number; height: number } {
  const { wm, hm } = bboxMeters(bbox);
  const longestMeters = Math.max(wm, hm);
  const shortestMeters = Math.min(wm, hm);
  const aspect = wm / hm;

  const pixelsLongestAt10m = longestMeters / 10;
  const longest = Math.min(maxPixelsPerSide, Math.max(256, Math.round(pixelsLongestAt10m)));
  const shortest = Math.max(
    256,
    Math.round((longest * shortestMeters) / longestMeters),
  );

  return aspect >= 1
    ? { width: longest, height: shortest }
    : { width: shortest, height: longest };
}

export interface DayOverlayOptions {
  bbox: Bbox;
  accessToken: string;
  date: string;
  maxPixelsPerSide?: number;
}

export async function fetchDayOverlay({
  bbox,
  accessToken,
  date,
  maxPixelsPerSide = 2048,
}: DayOverlayOptions): Promise<LatestOverlayResult> {
  const day = date.slice(0, 10);
  const fromIso = `${day}T00:00:00Z`;
  const toIso = `${day}T23:59:59Z`;
  const { width, height } = pickFetchResolution(bbox, maxPixelsPerSide);
  const blob = await fetchFrame({
    bbox,
    from: fromIso,
    to: toIso,
    width,
    height,
    accessToken,
  });
  return { blob, from: fromIso, to: toIso, bbox, width, height };
}
