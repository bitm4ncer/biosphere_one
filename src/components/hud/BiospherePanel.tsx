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

interface LegendSpec {
  gradient: string;
  minLabel: string;
  midLabel?: string;
  maxLabel: string;
  unit?: string;
}

// Standardised colour ramps used by the underlying tile services.
// Kept inline as Tailwind-friendly CSS gradients so a separate stylesheet
// is not required.
const SPECIES_GRADIENT =
  "linear-gradient(to right, #fde047, #fb923c, #ef4444, #7f1d1d)";

// Forest Loss legends adapt to whichever GFW product resolved — the
// visible map colours differ a lot between GLAD-DIST (blue/cyan
// disturbance pixels), GLAD-L (red/orange alert dots) and Hansen TCL
// (pink-by-year). A single static gradient would always lie about
// what the user actually sees on the map.
const FOREST_LOSS_LEGENDS: Record<
  string,
  Omit<LegendSpec, "unit"> & { unit?: string }
> = {
  "GLAD-DIST integrated alerts": {
    gradient: "linear-gradient(to right, #67e8f9, #22d3ee, #1e40af)",
    minLabel: "low confidence",
    midLabel: "moderate",
    maxLabel: "high confidence",
    unit: "vegetation disturbance",
  },
  "GLAD-L weekly alerts": {
    gradient: "linear-gradient(to right, #fed7aa, #fb923c, #b91c1c)",
    minLabel: "older",
    midLabel: "this month",
    maxLabel: "this week",
    unit: "tree-cover loss alerts",
  },
  "Hansen tree-cover loss (≥30 %)": {
    gradient: "linear-gradient(to right, #fbcfe8, #ec4899, #581c87)",
    minLabel: "2001",
    midLabel: "2013",
    maxLabel: "2024",
    unit: "year of tree-cover loss",
  },
};
const FOREST_LOSS_LEGEND_FALLBACK: LegendSpec = {
  gradient: "linear-gradient(to right, #67e8f9, #22d3ee, #1e40af)",
  minLabel: "older",
  maxLabel: "recent",
  unit: "tree-cover / disturbance",
};

const NO2_GRADIENT =
  "linear-gradient(to right, #1e3a8a, #06b6d4, #fde047, #fb923c, #b91c1c)";

/**
 * Sidebar pane that surfaces three independent nature/biosphere
 * overlays. Each layer is its own card with on/off toggle, caption,
 * legend, and (when on) opacity slider + status footer. Independent
 * of the `activeOverlay` system in the OverlayPanel — the user can
 * stack any combination of these on top of clouds/fires/rail/ndvi.
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
        legend={{
          gradient: SPECIES_GRADIENT,
          minLabel: "few",
          midLabel: "many",
          maxLabel: "very many",
          unit: "observations / tile",
        }}
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
        legend={
          props.forestLossResolvedLabel
            ? FOREST_LOSS_LEGENDS[props.forestLossResolvedLabel] ??
              FOREST_LOSS_LEGEND_FALLBACK
            : FOREST_LOSS_LEGEND_FALLBACK
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
        legend={{
          gradient: NO2_GRADIENT,
          minLabel: "low",
          midLabel: "moderate",
          maxLabel: "high",
          unit: "molecules/cm² · 10¹⁵",
        }}
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
  legend?: LegendSpec;
  onToggle: (on: boolean) => void;
  onOpacityChange: (o: number) => void;
}

function BiosphereLayerCard({
  label,
  caption,
  on,
  opacity,
  status,
  legend,
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

        {legend && on && <LegendBar spec={legend} />}

        {status && (
          <p className="hud-mono text-[9px] uppercase tracking-wider text-[color:var(--hud-text-muted)]">
            {status}
          </p>
        )}
      </div>
    </HudPanel>
  );
}

function LegendBar({ spec }: { spec: LegendSpec }) {
  return (
    <div className="flex flex-col gap-0.5" aria-label="Legend">
      <div
        className="h-1.5 w-full rounded-full"
        style={{ background: spec.gradient }}
        aria-hidden
      />
      <div className="flex justify-between text-[9px] text-[color:var(--hud-text-muted)]">
        <span>{spec.minLabel}</span>
        {spec.midLabel && <span>{spec.midLabel}</span>}
        <span>{spec.maxLabel}</span>
      </div>
      {spec.unit && (
        <span className="hud-mono text-[9px] text-[color:var(--hud-text-muted)]">
          {spec.unit}
        </span>
      )}
    </div>
  );
}
