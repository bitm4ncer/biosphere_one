"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import { buildXfadeGraph } from "./xfade-filter";

const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

let instance: FFmpeg | null = null;
let loadPromise: Promise<FFmpeg> | null = null;

async function getFfmpeg(onLog?: (msg: string) => void): Promise<FFmpeg> {
  if (instance) return instance;
  if (loadPromise) return loadPromise;

  const ff = new FFmpeg();
  if (onLog) ff.on("log", ({ message }) => onLog(message));

  loadPromise = ff
    .load({
      coreURL: `${BASE_PATH}/ffmpeg/ffmpeg-core.js`,
      wasmURL: `${BASE_PATH}/ffmpeg/ffmpeg-core.wasm`,
      workerURL: `${BASE_PATH}/ffmpeg/ffmpeg-core.worker.js`,
    })
    .then(() => {
      instance = ff;
      return ff;
    })
    .catch((err) => {
      loadPromise = null;
      throw err;
    });

  return loadPromise;
}

export interface EncodeOptions {
  frames: Blob[];
  width: number;
  height: number;
  fps: number;
  framePauseSeconds: number;
  transitionSeconds: number;
  transition?: string;
  onProgress?: (ratio: number) => void;
  onLog?: (msg: string) => void;
}

export async function encodeTimelapse(opts: EncodeOptions): Promise<Blob> {
  const {
    frames,
    width,
    height,
    fps,
    framePauseSeconds,
    transitionSeconds,
    transition,
    onProgress,
    onLog,
  } = opts;

  if (frames.length < 2) {
    throw new Error("Need at least 2 frames to encode a timelapse");
  }

  const ff = await getFfmpeg(onLog);
  if (onProgress) {
    ff.on("progress", ({ progress }) => onProgress(Math.min(1, Math.max(0, progress))));
  }

  const graph = buildXfadeGraph({
    frameCount: frames.length,
    framePauseSeconds,
    transitionSeconds,
    fps,
    width,
    height,
    transition,
  });

  const inputNames: string[] = [];
  for (let i = 0; i < frames.length; i += 1) {
    const name = `in_${String(i).padStart(3, "0")}.png`;
    await ff.writeFile(name, await fetchFile(frames[i]));
    inputNames.push(name);
  }

  const args: string[] = [];
  for (const name of inputNames) {
    args.push("-loop", "1", "-t", graph.clipSeconds.toFixed(3), "-i", name);
  }
  args.push(
    "-filter_complex",
    graph.filter,
    "-map",
    "[vout]",
    "-r",
    String(fps),
    "-c:v",
    "libx264",
    "-pix_fmt",
    "yuv420p",
    "-preset",
    "veryfast",
    "-movflags",
    "+faststart",
    "-y",
    "out.mp4",
  );

  await ff.exec(args);

  const out = await ff.readFile("out.mp4");
  const data = out as Uint8Array;

  await Promise.all(inputNames.map((n) => ff.deleteFile(n).catch(() => undefined)));
  await ff.deleteFile("out.mp4").catch(() => undefined);

  return new Blob([data], { type: "video/mp4" });
}
