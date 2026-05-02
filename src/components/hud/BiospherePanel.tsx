"use client";

import type { ReactNode } from "react";
import { HudPanel } from "./HudPanel";

interface SpeciesTaxonOption {
  key: string | null;
  label: string;
}

interface BiospherePanelProps {
  // Species (GBIF)
  speciesOn: boolean;
  speciesOpacity: number;
  speciesTaxonKey: string | null;
  speciesTaxonOptions: readonly SpeciesTaxonOption[];
  onSpeciesOnChange: (on: boolean) => void;
  onSpeciesOpacityChange: (o: number) => void;
  onSpeciesTaxonKeyChange: (key: string | null) => void;

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

  // Natura 2000 (EEA)
  naturaSitesOn: boolean;
  naturaSitesOpacity: number;
  naturaProbeFinished: boolean;
  naturaResolvedLabel: string | null;
  onNaturaSitesOnChange: (on: boolean) => void;
  onNaturaSitesOpacityChange: (o: number) => void;

  // Land Cover (ESA WorldCover)
  landCoverOn: boolean;
  landCoverOpacity: number;
  onLandCoverOnChange: (on: boolean) => void;
  onLandCoverOpacityChange: (o: number) => void;
}

interface LegendSpec {
  gradient: string;
  minLabel: string;
  midLabel?: string;
  maxLabel: string;
  unit?: string;
}

interface SwatchSpec {
  /** Discrete colour swatches with labels (e.g. land-cover classes). */
  swatches: { color: string; label: string }[];
  unit?: string;
}

const SPECIES_GRADIENT =
  "linear-gradient(to right, #fde047, #fb923c, #ef4444, #7f1d1d)";

// Forest Loss legends adapt to whichever GFW product resolved.
const FOREST_LOSS_LEGENDS: Record<string, LegendSpec> = {
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

const NATURA_GRADIENT =
  "linear-gradient(to right, #4ade80, #16a34a, #14532d)";

// ESA WorldCover 2021 official class colours (subset — the most common
// classes worldwide; a full 11-class palette would be too noisy in the
// HUD card).
const LAND_COVER_SWATCHES: SwatchSpec = {
  swatches: [
    { color: "#006400", label: "Tree cover" },
    { color: "#ffbb22", label: "Shrubland" },
    { color: "#ffff4c", label: "Grassland" },
    { color: "#f096ff", label: "Cropland" },
    { color: "#fa0000", label: "Built-up" },
    { color: "#0064c8", label: "Water" },
    { color: "#0096a0", label: "Wetland" },
    { color: "#00cf75", label: "Mangroves" },
    { color: "#fae6a0", label: "Sparse / bare" },
  ],
  unit: "ESA WorldCover 2021 · 10 m",
};

/**
 * Sidebar pane that surfaces five independent nature/biosphere
 * overlays. Each layer is its own card with on/off toggle, caption,
 * legend, and (when on) opacity slider + status footer.
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
        extras={
          props.speciesOn && (
            <div className="flex flex-col gap-1">
              <span className="hud-label text-[9px]">Taxon</span>
              <div className="hud-variant-chips no-scrollbar" role="radiogroup" aria-label="Taxonomic filter">
                {props.speciesTaxonOptions.map((opt) => {
                  const active = (opt.key ?? null) === (props.speciesTaxonKey ?? null);
                  return (
                    <button
                      key={opt.key ?? "all"}
                      type="button"
                      role="radio"
                      aria-checked={active}
                      onClick={() => props.onSpeciesTaxonKeyChange(opt.key)}
                      data-active={active}
                      className="hud-variant-chip"
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )
        }
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

      <BiosphereLayerCard
        label="Protected Areas"
        on={props.naturaSitesOn}
        opacity={props.naturaSitesOpacity}
        onToggle={props.onNaturaSitesOnChange}
        onOpacityChange={props.onNaturaSitesOpacityChange}
        caption="Natura 2000 (FFH-Gebiete + Vogelschutzgebiete) · EEA · Europe-wide"
        status={
          !props.naturaSitesOn
            ? null
            : !props.naturaProbeFinished
              ? "resolving WMS layers…"
              : props.naturaResolvedLabel
                ? props.naturaResolvedLabel
                : "no WMS sublayer responded"
        }
        legend={{
          gradient: NATURA_GRADIENT,
          minLabel: "site outline",
          maxLabel: "core area",
          unit: "EU Habitats + Birds Directives",
        }}
      />

      <BiosphereLayerCard
        label="Land Cover"
        on={props.landCoverOn}
        opacity={props.landCoverOpacity}
        onToggle={props.onLandCoverOnChange}
        onOpacityChange={props.onLandCoverOpacityChange}
        caption="ESA WorldCover 2021 · 10 m · global · 11 classes incl. cropland"
        status={null}
        swatches={LAND_COVER_SWATCHES}
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
  swatches?: SwatchSpec;
  extras?: ReactNode;
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
  swatches,
  extras,
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

        {extras}

        <p className="text-[10px] leading-snug text-[color:var(--hud-text-muted)]">
          {caption}
        </p>

        {legend && on && <LegendBar spec={legend} />}
        {swatches && on && <SwatchGrid spec={swatches} />}

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

function SwatchGrid({ spec }: { spec: SwatchSpec }) {
  return (
    <div className="flex flex-col gap-1" aria-label="Class legend">
      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5">
        {spec.swatches.map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span
              className="h-2.5 w-2.5 shrink-0 rounded-sm"
              style={{ backgroundColor: s.color }}
              aria-hidden
            />
            <span className="text-[9px] text-[color:var(--hud-text-muted)]">
              {s.label}
            </span>
          </div>
        ))}
      </div>
      {spec.unit && (
        <span className="hud-mono text-[9px] text-[color:var(--hud-text-muted)]">
          {spec.unit}
        </span>
      )}
    </div>
  );
}
