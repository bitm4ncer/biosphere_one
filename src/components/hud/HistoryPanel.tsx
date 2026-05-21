"use client";

import { HudPanel } from "./HudPanel";
import { HistoryTimeline } from "./HistoryTimeline";

interface HistoryPanelProps {
  year: number;
  onYearChange: (year: number) => void;
  earliestVisibleYear: number | null;
  visibleCount: number;
  loading: boolean;

  mapOn: boolean;
  onMapOnChange: (on: boolean) => void;

  landmarksOn: boolean;
  landmarksOpacity: number;
  onLandmarksOnChange: (on: boolean) => void;
  onLandmarksOpacityChange: (o: number) => void;
}

function ToggleHeader({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <h3 className="text-[13px] font-semibold text-[color:var(--ink)]">
        {label}
      </h3>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={`${label} on/off`}
        onClick={() => onChange(!on)}
        className="hud-switch"
        data-on={on}
      >
        <span className="hud-switch-thumb" aria-hidden />
      </button>
    </div>
  );
}

export function HistoryPanel(props: HistoryPanelProps) {
  const showYearSlider = props.mapOn || props.landmarksOn;
  return (
    <div className="flex flex-col gap-3">
      {showYearSlider && (
        <HudPanel>
          <HistoryTimeline
            year={props.year}
            onYearChange={props.onYearChange}
            earliestVisibleYear={props.earliestVisibleYear}
            visibleCount={props.visibleCount}
            loading={props.loading}
          />
        </HudPanel>
      )}

      <HudPanel>
        <div className="flex flex-col gap-2.5">
          <ToggleHeader
            label="Timeline Map"
            on={props.mapOn}
            onChange={props.onMapOnChange}
          />
          <p className="text-[11px] leading-snug text-[color:var(--ink-dim)]">
            Replaces the basemap with OpenHistoricalMap&apos;s sepia
            historical style for the chosen year. Drag the Year slider
            above to travel through time.
          </p>
        </div>
      </HudPanel>

      <HudPanel>
        <div className="flex flex-col gap-2.5">
          <ToggleHeader
            label="Historic Landmarks"
            on={props.landmarksOn}
            onChange={props.onLandmarksOnChange}
          />

          {props.landmarksOn && (
            <div className="flex items-center gap-2">
              <span className="hud-label w-12 shrink-0">Opacity</span>
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
              <span className="hud-mono w-9 shrink-0 text-right text-[10px] text-[color:var(--ink-dim)]">
                {Math.round(props.landmarksOpacity * 100)}%
              </span>
            </div>
          )}

          <p className="text-[11px] leading-snug text-[color:var(--ink-dim)]">
            <span style={{ color: "#ff2d92" }}>●</span> Wikidata (named,
            dated, links to Wikipedia){" "}
            <span style={{ color: "#22d3ee" }}>●</span> OpenStreetMap{" "}
            <span className="hud-mono">historic=*</span> (castles, ruins,
            archaeological sites, monuments &amp; battlefields). Tap a
            marker for a Wikipedia summary.
          </p>
        </div>
      </HudPanel>
    </div>
  );
}
