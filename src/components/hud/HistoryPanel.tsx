"use client";

import { HudPanel } from "./HudPanel";
import { HistoryTimeline } from "./HistoryTimeline";

interface HistoryPanelProps {
  // Master "Time Travel" toggle — gates everything else.
  timeTravelOn: boolean;
  onTimeTravelOnChange: (on: boolean) => void;

  // Timeline
  year: number;
  onYearChange: (year: number) => void;
  earliestVisibleYear: number | null;
  visibleCount: number;
  loading: boolean;

  // Historical map (OpenHistoricalMap raster overlay)
  mapOn: boolean;
  mapOpacity: number;
  onMapOnChange: (on: boolean) => void;
  onMapOpacityChange: (o: number) => void;

  // Landmarks layer (OSM historic + Wikidata)
  landmarksOn: boolean;
  landmarksOpacity: number;
  onLandmarksOnChange: (on: boolean) => void;
  onLandmarksOpacityChange: (o: number) => void;
}

export function HistoryPanel(props: HistoryPanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <HudPanel label="Time Travel">
        <div className="flex flex-col gap-2">
          <div
            className="hud-tab-row"
            style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
            role="tablist"
            aria-label="Time Travel mode"
          >
            <button
              type="button"
              className="hud-tab"
              data-active={!props.timeTravelOn}
              aria-pressed={!props.timeTravelOn}
              onClick={() => props.onTimeTravelOnChange(false)}
            >
              Off
            </button>
            <button
              type="button"
              className="hud-tab"
              data-active={props.timeTravelOn}
              aria-pressed={props.timeTravelOn}
              onClick={() => props.onTimeTravelOnChange(true)}
            >
              On
            </button>
          </div>
          <p className="text-[10px] leading-snug text-[color:var(--hud-text-muted)]">
            Master switch for the History view. Toggle on to activate the
            timeline slider, the historical-map overlay, and date-filtered
            landmarks. Off restores the normal map.
          </p>
        </div>
      </HudPanel>

      {props.timeTravelOn && (
        <>
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
                Drag to travel through time. Sites without a known build
                date appear once the slider passes the year 2000 (treated
                as present-day heritage).
              </p>
            </div>
          </HudPanel>

          <HudPanel label="Historical Map">
            <div className="flex flex-col gap-2">
              <div
                className="hud-tab-row"
                style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
                role="tablist"
                aria-label="Historical Map on/off"
              >
                <button
                  type="button"
                  className="hud-tab"
                  data-active={!props.mapOn}
                  aria-pressed={!props.mapOn}
                  onClick={() => props.onMapOnChange(false)}
                >
                  Off
                </button>
                <button
                  type="button"
                  className="hud-tab"
                  data-active={props.mapOn}
                  aria-pressed={props.mapOn}
                  onClick={() => props.onMapOnChange(true)}
                >
                  On
                </button>
              </div>

              {props.mapOn && (
                <div className="flex items-center gap-2">
                  <span className="hud-label text-[9px]">Opacity</span>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={props.mapOpacity}
                    onChange={(e) =>
                      props.onMapOpacityChange(Number(e.target.value))
                    }
                    className="hud-slider flex-1"
                    style={{
                      ["--hud-fill" as string]: `${Math.round(
                        props.mapOpacity * 100,
                      )}%`,
                    }}
                    aria-label="Historical Map opacity"
                  />
                  <span className="hud-mono w-8 text-right text-[10px] text-[color:var(--hud-text-muted)]">
                    {Math.round(props.mapOpacity * 100)}%
                  </span>
                </div>
              )}

              <p className="text-[10px] leading-snug text-[color:var(--hud-text-muted)]">
                OpenHistoricalMap: community-mapped historical roads,
                fortifications, and settlements as a sepia overlay. Year
                filtering on this layer requires vector tiles (Phase 2).
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
                <span className="hud-mono">historic=*</span> +{" "}
                Wikidata (any geo-tagged item with an inception date).
                Tap a marker for a Wikipedia summary.
              </p>
            </div>
          </HudPanel>
        </>
      )}
    </div>
  );
}
