import type { Bbox } from "@/types/sentinel";
import { bboxAreaKm2 } from "@/lib/utils/bbox";

export interface PUEstimateInput {
  bbox: Bbox;
  frames: number;
  width: number;
  height: number;
  bands?: number;
}

const BASE_RESOLUTION_M = 10;
const PU_PIXEL_CONSTANT = 512 * 512;

export function estimateProcessingUnits(input: PUEstimateInput): number {
  const { frames, width, height, bands = 3 } = input;

  const pixelFactor = (width * height) / PU_PIXEL_CONSTANT;
  const bandFactor = Math.max(1, bands / 3);
  const puPerFrame = pixelFactor * bandFactor;

  return Math.ceil(puPerFrame * frames * 10) / 10;
}

export interface LimitCheck {
  ok: boolean;
  reason?: string;
}

export const MAX_AREA_KM2 = 2500;
export const MAX_FRAMES = 30;

export function checkHardLimits(bbox: Bbox, frames: number): LimitCheck {
  const area = bboxAreaKm2(bbox);
  if (area > MAX_AREA_KM2) {
    return {
      ok: false,
      reason: `Bbox too large: ${area.toFixed(0)} km² (max ${MAX_AREA_KM2} km²)`,
    };
  }
  if (frames > MAX_FRAMES) {
    return { ok: false, reason: `Too many frames: ${frames} (max ${MAX_FRAMES})` };
  }
  if (frames < 2) {
    return { ok: false, reason: "Need at least 2 frames for a timelapse" };
  }
  return { ok: true };
}

export function puEstimateColor(pu: number): "green" | "yellow" | "red" {
  if (pu < 50) return "green";
  if (pu < 200) return "yellow";
  return "red";
}
