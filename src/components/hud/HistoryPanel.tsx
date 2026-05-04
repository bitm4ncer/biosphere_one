"use client";

import { HudPanel } from "./HudPanel";
import { HistoryTimeline } from "./HistoryTimeline";

interface HistoryPanelProps {
  // Timeline year — drives both the Timeline-Map basemap and (when
  // landmarks are on) the inception-year filter on landmark dots.
  year: number;
  onYearChange: (year: number) => void;
  earliestVisibleYear: number | null;
  visibleCount: number;
  loading: boolean;

  // Timeline Map: swap basemap to OHM "historical" for the chosen year.
  mapOn: boolean;
  onMapOnChange: (on: boolean) => void;

  // Historic Landmarks: independent overlay (OSM historic + Wikidata).
  landmarksOn: boolean;
  landmarksOpacity: number;
  onLandmarksOnChange: (on: boolean) => void;
  onLandmarksOpacityChange: (o: number) => void;
}

function OnOffRow({
  label,
  on,
  onChange,
}: {
  label: string;
  on: boolean;
  onChange: (on: boolean) => void;
}) {
  return (
    <div
      className="hud-tab-row"
      style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
      role="tablist"
      aria-label={`${label} on/off`}
    >
      <button
        type="button"
        className="hud-tab"
        data-active={!on}
        aria-pressed={!on}
        onClick={() => onChange(false)}
      >
        Off
      </button>
      <button
        type="button"
        className="hud-tab"
        data-active={on}
        aria-pressed={on}
        onClick={() => onChange(true)}
      >
        On
      </button>
    </div>
  );
}

export function HistoryPanel(props: HistoryPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <HudPanel label="Timeline Map">
        <div className="flex flex-col gap-2">
          <OnOffRow
            label="Timeline Map"
            on={props.mapOn}
            onChange={props.onMapOnChange}
          />

          {props.mapOn && (
            <HistoryTimeline
              year={props.year}
              onYearChange={props.onYearChange}
              earliestVisibleYear={props.earliestVisibleYear}
              visibleCount={props.visibleCount}
              loading={props.loading}
            />
          )}

          <p className="text-[10px] leading-snug text-[color:var(--hud-text-muted)]">
            Replaces the basemap with OpenHistoricalMap&apos;s sepia
            historical style for the chosen year. Drag the slider to
            travel through time. Off restores your normal basemap.
          </p>
        </div>
      </HudPanel>

      <HudPanel label="Historic Landmarks">
        <div className="flex flex-col gap-2">
          <OnOffRow
            label="Historic Landmarks"
            on={props.landmarksOn}
            onChange={props.onLandmarksOnChange}
          />

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
            <span style={{ color: "#ff2d92" }}>●</span> Wikidata (named,
            dated, links to Wikipedia){" "}
            <span style={{ color: "#22d3ee" }}>●</span> OpenStreetMap{" "}
            <span className="hud-mono">historic=*</span> (castles, ruins,
            archaeological sites, monuments &amp; battlefields). When the
            Timeline Map is on, the year slider also filters these. Tap a
            marker for a Wikipedia summary.
          </p>
        </div>
      </HudPanel>
    </div>
  );
}
