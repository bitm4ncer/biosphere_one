"use client";

import { HudPanel } from "./HudPanel";
import { HistoryTimeline } from "./HistoryTimeline";

interface HistoryPanelProps {
  // Timeline
  year: number;
  onYearChange: (year: number) => void;
  earliestVisibleYear: number | null;
  visibleCount: number;
  loading: boolean;

  // Landmarks layer
  landmarksOn: boolean;
  landmarksOpacity: number;
  onLandmarksOnChange: (on: boolean) => void;
  onLandmarksOpacityChange: (o: number) => void;
}

export function HistoryPanel(props: HistoryPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <HudPanel label="Timeline">
        <div className="flex flex-col gap-2">
          <HistoryTimeline
            year={props.year}
            onYearChange={props.onYearChange}
            earliestVisibleYear={props.earliestVisibleYear}
            visibleCount={props.visibleCount}
            loading={props.loading}
          />
          <p className="text-[10px] leading-snug text-[color:var(--hud-text-muted)]">
            Drag to travel through time. Sites without a known build date
            appear once the slider passes the year 2000 (treated as
            present-day heritage).
          </p>
        </div>
      </HudPanel>

      <HudPanel label="Historic Landmarks">
        <div className="flex flex-col gap-2">
          <div
            className="hud-tab-row"
            style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
            role="tablist"
            aria-label="Historic Landmarks on/off"
          >
            <button
              type="button"
              className="hud-tab"
              data-active={!props.landmarksOn}
              aria-pressed={!props.landmarksOn}
              onClick={() => props.onLandmarksOnChange(false)}
            >
              Off
            </button>
            <button
              type="button"
              className="hud-tab"
              data-active={props.landmarksOn}
              aria-pressed={props.landmarksOn}
              onClick={() => props.onLandmarksOnChange(true)}
            >
              On
            </button>
          </div>

          {props.landmarksOn && (
            <div className="flex items-center gap-2">
              <span className="hud-label text-[9px]">Opacity</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={props.landmarksOpacity}
                onChange={(e) =>
                  props.onLandmarksOpacityChange(Number(e.target.value))
                }
                className="hud-slider flex-1"
                style={{
                  ["--hud-fill" as string]: `${Math.round(
                    props.landmarksOpacity * 100,
                  )}%`,
                }}
                aria-label="Historic Landmarks opacity"
              />
              <span className="hud-mono w-8 text-right text-[10px] text-[color:var(--hud-text-muted)]">
                {Math.round(props.landmarksOpacity * 100)}%
              </span>
            </div>
          )}

          <p className="text-[10px] leading-snug text-[color:var(--hud-text-muted)]">
            Castles, ruins, archaeological sites, monuments &amp;
            battlefields. OpenStreetMap{" "}
            <span className="hud-mono">historic=*</span> + Wikidata
            (dated). Tap a marker for a Wikipedia summary.
          </p>
        </div>
      </HudPanel>
    </div>
  );
}
