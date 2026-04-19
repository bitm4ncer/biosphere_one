export interface XfadeOptions {
  frameCount: number;
  framePauseSeconds: number;
  transitionSeconds: number;
  fps: number;
  width: number;
  height: number;
  transition?: string;
}

export interface XfadeBuild {
  filter: string;
  clipSeconds: number;
  totalSeconds: number;
}

export function buildXfadeGraph({
  frameCount,
  framePauseSeconds,
  transitionSeconds,
  fps,
  width,
  height,
  transition = "dissolve",
}: XfadeOptions): XfadeBuild {
  if (frameCount < 2) {
    throw new Error("xfade graph needs at least 2 frames");
  }

  const clipSeconds = framePauseSeconds + transitionSeconds;
  const scale = `scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2:black,setsar=1,format=yuv420p,fps=${fps},settb=AVTB,setpts=PTS-STARTPTS`;

  const normalize: string[] = [];
  for (let i = 0; i < frameCount; i += 1) {
    normalize.push(`[${i}:v]${scale}[v${i}]`);
  }

  const xfades: string[] = [];
  let prev = "v0";
  for (let i = 1; i < frameCount; i += 1) {
    const offset = framePauseSeconds * i + transitionSeconds * (i - 1);
    const label = i === frameCount - 1 ? "vout" : `x${i}`;
    xfades.push(
      `[${prev}][v${i}]xfade=transition=${transition}:duration=${transitionSeconds.toFixed(3)}:offset=${offset.toFixed(3)}[${label}]`,
    );
    prev = label;
  }

  const filter = [...normalize, ...xfades].join(";");
  const totalSeconds = framePauseSeconds * frameCount + transitionSeconds * (frameCount - 1);

  return { filter, clipSeconds, totalSeconds };
}
