"use client";

import type { ReactNode } from "react";
import { HudPanel } from "./HudPanel";

interface BiospherePanelProps {
  // Species (GBIF)
  speciesOn: boolean;
  speciesOpacity: number;
  onSpeciesOnChange: (on: boolean) => void;
  onSpeciesOpacityChange: (o: number) => void;

  // Forest Loss (Global Forest Watch)
  forestLossOn: boolean;
  forestLossOpacity: number;
  forestLossProbeFinished: boolean;
  forestLossResolvedLabel: string | null;
  onForestLossOnChange: (on: boolean) => void;
  onForestLossOpacityChange: (o: number) => void;

  // NO₂ (NASA OMI / Sentinel-5P)
  no2On: boolean;
  no2Opacity: number;
  no2ProbeFinished: boolean;
  no2ResolvedLabel: string | null;
  no2ResolvedDate: string | null;
  onNo2OnChange: (on: boolean) => void;
  onNo2OpacityChange: (o: number) => void;
}

/**
 * Sidebar pane that surfaces three independent nature/biosphere
 * overlays. Each layer is its own card with on/off toggle, caption,
 * and (when on) opacity slider + status footer. Independent of the
 * `activeOverlay` system in the OverlayPanel — the user can stack
 * any combination of these on top of clouds/fires/rail/ndvi.
 */
export function BiospherePanel(props: BiospherePanelProps) {
  return (
    <div className="flex flex-col gap-3">
      <BiosphereLayerCard
        label="Species"
        on={props.speciesOn}
        opacity={props.speciesOpacity}
        onToggle={props.onSpeciesOnChange}
        onOpacityChange={props.onSpeciesOpacityChange}
        caption="Live biodiversity observations · GBIF · 2 B+ records · global"
        status={props.speciesOn ? "density tiles · classic-point style" : null}
      />

      <BiosphereLayerCard
        label="Forest Loss"
        on={props.forestLossOn}
        opacity={props.forestLossOpacity}
        onToggle={props.onForestLossOnChange}
        onOpacityChange={props.onForestLossOpacityChange}
        caption="Recent deforestation alerts · Global Forest Watch / UMD"
        status={
          !props.forestLossOn
            ? null
            : !props.forestLossProbeFinished
              ? "resolving source…"
              : props.forestLossResolvedLabel
                ? props.forestLossResolvedLabel
                : "no source available"
        }
      />

      <BiosphereLayerCard
        label="Air Quality · NO₂"
        on={props.no2On}
        opacity={props.no2Opacity}
        onToggle={props.onNo2OnChange}
        onOpacityChange={props.onNo2OpacityChange}
        caption="Tropospheric NO₂ column · NASA OMI / Sentinel-5P · daily"
        status={
          !props.no2On
            ? null
            : !props.no2ProbeFinished
              ? "resolving source…"
              : props.no2ResolvedLabel
                ? `${props.no2ResolvedLabel}${props.no2ResolvedDate ? ` · ${props.no2ResolvedDate}` : ""}`
                : "no source available"
        }
      />
    </div>
  );
}

interface BiosphereLayerCardProps {
  label: string;
  caption: string;
  on: boolean;
  opacity: number;
  status: ReactNode | null;
  onToggle: (on: boolean) => void;
  onOpacityChange: (o: number) => void;
}

function BiosphereLayerCard({
  label,
  caption,
  on,
  opacity,
  status,
  onToggle,
  onOpacityChange,
}: BiosphereLayerCardProps) {
  return (
    <HudPanel label={label}>
      <div className="flex flex-col gap-2">
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
            onClick={() => onToggle(false)}
          >
            Off
          </button>
          <button
            type="button"
            className="hud-tab"
            data-active={on}
            aria-pressed={on}
            onClick={() => onToggle(true)}
          >
            On
          </button>
        </div>

        {on && (
          <div className="flex items-center gap-2">
            <span className="hud-label text-[9px]">Opacity</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => onOpacityChange(Number(e.target.value))}
              className="hud-slider flex-1"
              style={{ ["--hud-fill" as string]: `${Math.round(opacity * 100)}%` }}
              aria-label={`${label} opacity`}
            />
            <span className="hud-mono w-8 text-right text-[10px] text-[color:var(--hud-text-muted)]">
              {Math.round(opacity * 100)}%
            </span>
          </div>
        )}

        <p className="text-[10px] leading-snug text-[color:var(--hud-text-muted)]">
          {caption}
        </p>

        {status && (
          <p className="hud-mono text-[9px] uppercase tracking-wider text-[color:var(--hud-text-muted)]">
            {status}
          </p>
        )}
      </div>
    </HudPanel>
  );
}
