"use client";

import { HISTORY_YEAR_MAX, HISTORY_YEAR_MIN } from "@/lib/settings";

interface HistoryTimelineProps {
  year: number;
  onYearChange: (year: number) => void;
  /**
   * Earliest inception year among the landmarks currently in the
   * viewport. The track shows a faint accent bar from this year to
   * today, marking "where the data lives" without trapping the slider.
   */
  earliestVisibleYear: number | null;
  /** Number of features currently rendered on the map. */
  visibleCount: number;
  loading: boolean;
}

const SNAP_POINTS = [1500, 1700, 1800, 1900, 1945, 1972, 2000, 2018];
const SNAP_TOLERANCE = 3;

function clampYear(y: number): number {
  if (!Number.isFinite(y)) return HISTORY_YEAR_MAX;
  return Math.max(HISTORY_YEAR_MIN, Math.min(HISTORY_YEAR_MAX, Math.round(y)));
}

function yearToPercent(y: number): number {
  const span = HISTORY_YEAR_MAX - HISTORY_YEAR_MIN;
  if (span <= 0) return 0;
  return ((y - HISTORY_YEAR_MIN) / span) * 100;
}

function snapNearby(y: number): number {
  for (const snap of [...SNAP_POINTS, HISTORY_YEAR_MAX]) {
    if (Math.abs(y - snap) <= SNAP_TOLERANCE) return snap;
  }
  return y;
}

export function HistoryTimeline({
  year,
  onYearChange,
  earliestVisibleYear,
  visibleCount,
  loading,
}: HistoryTimelineProps) {
  const dataStart =
    earliestVisibleYear !== null
      ? Math.max(HISTORY_YEAR_MIN, earliestVisibleYear)
      : null;
  const dataStartPct = dataStart !== null ? yearToPercent(dataStart) : null;
  const dataEndPct = yearToPercent(HISTORY_YEAR_MAX);
  const yearPct = yearToPercent(year);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="hud-label text-[9px]">Year</span>
        <span className="hud-mono text-[14px] text-[color:var(--hud-accent)]">
          {year}
        </span>
        <span className="hud-mono text-[9px] uppercase tracking-wider text-[color:var(--hud-text-muted)]">
          {loading
            ? "loading…"
            : visibleCount > 0
              ? `${visibleCount} site${visibleCount === 1 ? "" : "s"}`
              : "no data"}
        </span>
      </div>

      <div className="relative">
        {/* Data-extent hint bar — sits behind the slider track. */}
        {dataStartPct !== null && (
          <div
            className="pointer-events-none absolute left-0 right-0 top-1/2 h-[6px] -translate-y-1/2 rounded-full"
            style={{
              background: `linear-gradient(to right,
                transparent 0%,
                transparent ${dataStartPct}%,
                color-mix(in srgb, var(--hud-accent) 22%, transparent) ${dataStartPct}%,
                color-mix(in srgb, var(--hud-accent) 22%, transparent) ${dataEndPct}%,
                transparent ${dataEndPct}%)`,
            }}
            aria-hidden
          />
        )}
        <input
          type="range"
          min={HISTORY_YEAR_MIN}
          max={HISTORY_YEAR_MAX}
          step={1}
          value={year}
          onChange={(e) => onYearChange(clampYear(Number(e.target.value)))}
          onMouseUp={(e) =>
            onYearChange(clampYear(snapNearby(Number(e.currentTarget.value))))
          }
          onTouchEnd={(e) =>
            onYearChange(clampYear(snapNearby(Number(e.currentTarget.value))))
          }
          className="hud-slider relative w-full"
          style={{ ["--hud-fill" as string]: `${yearPct}%` }}
          aria-label="History year"
        />
        {/* Snap-point tick marks. */}
        <div className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2">
          {SNAP_POINTS.map((snap) => (
            <span
              key={snap}
              className="absolute top-1/2 h-2.5 w-px -translate-y-1/2 bg-[color:var(--hud-text-muted)] opacity-60"
              style={{ left: `${yearToPercent(snap)}%` }}
              aria-hidden
            />
          ))}
        </div>
      </div>

      <div className="flex justify-between text-[9px] text-[color:var(--hud-text-muted)]">
        <span>{HISTORY_YEAR_MIN}</span>
        <span>1800</span>
        <span>1900</span>
        <span>2000</span>
        <span>{HISTORY_YEAR_MAX}</span>
      </div>
    </div>
  );
}
