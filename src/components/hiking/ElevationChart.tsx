"use client";

import { useMemo } from "react";

interface Props {
  /** [lon, lat, ele?] */
  coordinates: [number, number, number?][];
  distanceKm: number;
  width?: number;
  height?: number;
}

export function ElevationChart({
  coordinates,
  distanceKm,
  width = 220,
  height = 48,
}: Props) {
  const path = useMemo(() => {
    const elevations: number[] = [];
    for (const c of coordinates) {
      const ele = c[2];
      if (typeof ele === "number") elevations.push(ele);
    }
    if (elevations.length < 2) return null;
    const min = Math.min(...elevations);
    const max = Math.max(...elevations);
    const span = Math.max(1, max - min);
    const step = width / (elevations.length - 1);
    const parts: string[] = [];
    elevations.forEach((e, i) => {
      const x = i * step;
      const y = height - ((e - min) / span) * height;
      parts.push(`${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`);
    });
    return { d: parts.join(" "), min, max };
  }, [coordinates, width, height]);

  if (!path) return null;

  return (
    <div className="flex flex-col gap-1">
      <svg
        width="100%"
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        preserveAspectRatio="none"
        className="block w-full"
        aria-label="Elevation profile"
      >
        {/* Stroke + fill both use currentColor so the chart stays
            readable regardless of the surrounding card's background.
            Inside an active route card (.hud-card-flat[data-active])
            the cascaded color becomes --accent-ink, giving high
            contrast against the olive accent fill; on idle/dark
            cards it inherits the pane's --accent. */}
        <path
          d={`${path.d} L${width},${height} L0,${height} Z`}
          fill="currentColor"
          opacity="0.22"
        />
        <path
          d={path.d}
          fill="none"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      </svg>
      <div className="flex justify-between text-[9px] opacity-70">
        <span>0 km</span>
        <span>
          {Math.round(path.min)}–{Math.round(path.max)} m
        </span>
        <span>{distanceKm.toFixed(1)} km</span>
      </div>
    </div>
  );
}
