// src/lib/settings.ts
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  BASEMAPS,
  DEFAULT_IMAGE_BASEMAP_ID,
  DEFAULT_VECTOR_BASEMAP_ID,
} from "./basemaps";

export type Projection = "mercator" | "globe";
export type RailStyle = "tiles" | "lines";
export type BasemapMode = "photo" | "hybrid" | "vector";
export type OrientationMode = "north" | "route" | "heading";

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));

export interface Settings {
  imageBasemapId: string;
  vectorBasemapId: string;
  basemapMode: BasemapMode;
  /** Per-basemap-id variant selection (e.g. Sentinel-2 year). */
  basemapVariants: Record<string, string>;
  /**
   * For the gibs-today basemap: 0 = yesterday UTC (default), 1..14 =
   * N days before yesterday. Driven by the Timeline "Live" tab.
   */
  liveBasemapDayOffset: number;
  projection: Projection;
  /**
   * Map rotation reference. north = bearing pinned to 0; route = align
   * to the active hike's segment under the user's GPS; heading =
   * align to the device compass heading.
   */
  orientationMode: OrientationMode;
  /** Rails panel — toggle the rail-network overlay (independent of the
   * Biosphere stack; only ever zero/one rail style at a time). */
  railOn: boolean;
  railwayOpacity: number;
  railStyle: RailStyle;
  /** Biosphere panel — independent overlay toggles, can stack. */
  ndviOn: boolean;
  ndviOpacity: number;
  speciesOn: boolean;
  speciesOpacity: number;
  /** GBIF taxonKey filter, null = all taxa. Common keys: 212 birds,
   * 359 mammals, 6 plants, 216 insects, 358 reptiles, 131 amphibians. */
  speciesTaxonKey: string | null;
  forestLossOn: boolean;
  forestLossOpacity: number;
  no2On: boolean;
  no2Opacity: number;
  /** Natura 2000 (FFH + SPA) protected areas, EEA WMS. */
  naturaSitesOn: boolean;
  naturaSitesOpacity: number;
  /** ESA WorldCover 10m global land cover. */
  landCoverOn: boolean;
  landCoverOpacity: number;
  /** History panel — when on, swaps the basemap to OHM's "historical"
   * style for the chosen year and exposes the year slider. */
  historyMapOn: boolean;
  /** History panel — independent of historyMapOn. Shows historic
   * landmarks (OSM `historic=*` + Wikidata). When the timeline map is
   * also on, the year slider filters them; otherwise all known sites
   * up to today are shown. */
  historyLandmarksOn: boolean;
  historyLandmarksOpacity: number;
  /** Currently selected year on the History timeline (1500..currentYear). */
  historyYear: number;
  setImageBasemapId: (id: string) => void;
  setVectorBasemapId: (id: string) => void;
  setBasemapMode: (mode: BasemapMode) => void;
  setBasemapVariant: (basemapId: string, variantId: string) => void;
  setLiveBasemapDayOffset: (offset: number) => void;
  setProjection: (p: Projection) => void;
  setOrientationMode: (m: OrientationMode) => void;
  setRailOn: (on: boolean) => void;
  setRailwayOpacity: (o: number) => void;
  setRailStyle: (style: RailStyle) => void;
  setNdviOn: (on: boolean) => void;
  setNdviOpacity: (o: number) => void;
  setSpeciesOn: (on: boolean) => void;
  setSpeciesOpacity: (o: number) => void;
  setSpeciesTaxonKey: (key: string | null) => void;
  setForestLossOn: (on: boolean) => void;
  setForestLossOpacity: (o: number) => void;
  setNo2On: (on: boolean) => void;
  setNo2Opacity: (o: number) => void;
  setNaturaSitesOn: (on: boolean) => void;
  setNaturaSitesOpacity: (o: number) => void;
  setLandCoverOn: (on: boolean) => void;
  setLandCoverOpacity: (o: number) => void;
  setHistoryLandmarksOn: (on: boolean) => void;
  setHistoryLandmarksOpacity: (o: number) => void;
  setHistoryMapOn: (on: boolean) => void;
  setHistoryYear: (year: number) => void;
}

export const HISTORY_YEAR_MIN = 1500;
export const HISTORY_YEAR_MAX = new Date().getFullYear();

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      imageBasemapId: DEFAULT_IMAGE_BASEMAP_ID,
      vectorBasemapId: DEFAULT_VECTOR_BASEMAP_ID,
      basemapMode: "photo",
      basemapVariants: {},
      liveBasemapDayOffset: 0,
      projection: "mercator",
      orientationMode: "north",
      railOn: false,
      railwayOpacity: 0.85,
      railStyle: "lines",
      ndviOn: false,
      ndviOpacity: 0.7,
      speciesOn: false,
      speciesOpacity: 0.85,
      speciesTaxonKey: null,
      forestLossOn: false,
      forestLossOpacity: 0.85,
      no2On: false,
      no2Opacity: 0.55,
      naturaSitesOn: false,
      naturaSitesOpacity: 0.4,
      landCoverOn: false,
      landCoverOpacity: 0.55,
      historyMapOn: false,
      historyLandmarksOn: false,
      historyLandmarksOpacity: 0.9,
      historyYear: HISTORY_YEAR_MAX,
      setImageBasemapId: (id) => set({ imageBasemapId: id }),
      setVectorBasemapId: (id) => set({ vectorBasemapId: id }),
      setBasemapMode: (mode) => set({ basemapMode: mode }),
      setBasemapVariant: (basemapId, variantId) =>
        set((s) => ({
          basemapVariants: { ...s.basemapVariants, [basemapId]: variantId },
        })),
      setLiveBasemapDayOffset: (offset) =>
        set({ liveBasemapDayOffset: Math.max(0, Math.min(14, Math.round(offset))) }),
      setProjection: (p) => set({ projection: p }),
      setOrientationMode: (m) => set({ orientationMode: m }),
      setRailOn: (on) => set({ railOn: on }),
      setRailwayOpacity: (o) => set({ railwayOpacity: clamp01(o) }),
      setRailStyle: (style) => set({ railStyle: style }),
      setNdviOn: (on) => set({ ndviOn: on }),
      setNdviOpacity: (o) => set({ ndviOpacity: clamp01(o) }),
      setSpeciesOn: (on) => set({ speciesOn: on }),
      setSpeciesOpacity: (o) => set({ speciesOpacity: clamp01(o) }),
      setSpeciesTaxonKey: (key) => set({ speciesTaxonKey: key }),
      setForestLossOn: (on) => set({ forestLossOn: on }),
      setForestLossOpacity: (o) => set({ forestLossOpacity: clamp01(o) }),
      setNo2On: (on) => set({ no2On: on }),
      setNo2Opacity: (o) => set({ no2Opacity: clamp01(o) }),
      setNaturaSitesOn: (on) => set({ naturaSitesOn: on }),
      setNaturaSitesOpacity: (o) => set({ naturaSitesOpacity: clamp01(o) }),
      setLandCoverOn: (on) => set({ landCoverOn: on }),
      setLandCoverOpacity: (o) => set({ landCoverOpacity: clamp01(o) }),
      setHistoryLandmarksOn: (on) => set({ historyLandmarksOn: on }),
      setHistoryLandmarksOpacity: (o) =>
        set({ historyLandmarksOpacity: clamp01(o) }),
      setHistoryMapOn: (on) => set({ historyMapOn: on }),
      setHistoryYear: (year) =>
        set({
          historyYear: Math.max(
            HISTORY_YEAR_MIN,
            Math.min(HISTORY_YEAR_MAX, Math.round(year)),
          ),
        }),
    }),
    {
      name: "biosphere1:settings",
      version: 19,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        imageBasemapId: state.imageBasemapId,
        vectorBasemapId: state.vectorBasemapId,
        basemapMode: state.basemapMode,
        basemapVariants: state.basemapVariants,
        liveBasemapDayOffset: state.liveBasemapDayOffset,
        projection: state.projection,
        orientationMode: state.orientationMode,
        railOn: state.railOn,
        railwayOpacity: state.railwayOpacity,
        railStyle: state.railStyle,
        ndviOn: state.ndviOn,
        ndviOpacity: state.ndviOpacity,
        speciesOn: state.speciesOn,
        speciesOpacity: state.speciesOpacity,
        speciesTaxonKey: state.speciesTaxonKey,
        forestLossOn: state.forestLossOn,
        forestLossOpacity: state.forestLossOpacity,
        no2On: state.no2On,
        no2Opacity: state.no2Opacity,
        naturaSitesOn: state.naturaSitesOn,
        naturaSitesOpacity: state.naturaSitesOpacity,
        landCoverOn: state.landCoverOn,
        landCoverOpacity: state.landCoverOpacity,
        historyMapOn: state.historyMapOn,
        historyLandmarksOn: state.historyLandmarksOn,
        historyLandmarksOpacity: state.historyLandmarksOpacity,
        historyYear: state.historyYear,
      }),
      migrate: (persisted: unknown, version: number) => {
        if (!persisted || typeof persisted !== "object") return persisted;
        const p = persisted as Record<string, unknown>;
        // v18 → v19: Clouds + Fires removed entirely; NDVI moved out of
        // the exclusive `activeOverlay` slot and into the Biosphere stack
        // as an independent toggle. Rail collapses to its own boolean.
        if (version < 19) {
          const prev = p.activeOverlay;
          p.railOn = prev === "rail";
          p.ndviOn = prev === "ndvi";
          delete p.activeOverlay;
          delete p.weatherOpacity;
          delete p.firesOpacity;
          if (typeof p.ndviOpacity !== "number") p.ndviOpacity = 0.7;
        }
        // v17 → v18: collapse the master `historyTimeTravelOn` switch.
        // Timeline-Map and Landmarks now toggle independently. Carry
        // each user's effective state forward — both layers were
        // gated on Time Travel before, so OR them in.
        if (version < 18) {
          const hadTimeTravel = p.historyTimeTravelOn === true;
          if (!hadTimeTravel) {
            p.historyMapOn = false;
            p.historyLandmarksOn = false;
          }
          delete p.historyTimeTravelOn;
        }
        // v16 → v17: drop `historyMapOpacity`. The historical map is no
        // longer an overlay (which had an opacity slider) — it's now a
        // basemap swap, where opacity is meaningless.
        if (version < 17) {
          delete p.historyMapOpacity;
        }
        // v15 → v16: split the History panel into a master "Time Travel"
        // toggle + per-layer toggles (Map / Landmarks).
        if (version < 16) {
          if (typeof p.historyTimeTravelOn !== "boolean")
            p.historyTimeTravelOn = false;
          if (typeof p.historyMapOn !== "boolean") p.historyMapOn = true;
        }
        // v14 → v15: add History panel — landmarks toggle + opacity +
        // selected year.
        if (version < 15) {
          if (typeof p.historyLandmarksOn !== "boolean")
            p.historyLandmarksOn = false;
          if (typeof p.historyLandmarksOpacity !== "number")
            p.historyLandmarksOpacity = 0.9;
          if (
            typeof p.historyYear !== "number" ||
            p.historyYear < HISTORY_YEAR_MIN ||
            p.historyYear > HISTORY_YEAR_MAX
          ) {
            p.historyYear = HISTORY_YEAR_MAX;
          }
        }
        // v13 → v14: extend Biosphere panel with taxon filter for
        // species + Natura 2000 + ESA WorldCover layer toggles.
        if (version < 14) {
          if (
            p.speciesTaxonKey !== null &&
            typeof p.speciesTaxonKey !== "string"
          ) {
            p.speciesTaxonKey = null;
          }
          if (typeof p.naturaSitesOn !== "boolean") p.naturaSitesOn = false;
          if (typeof p.naturaSitesOpacity !== "number") p.naturaSitesOpacity = 0.6;
          if (typeof p.landCoverOn !== "boolean") p.landCoverOn = false;
          if (typeof p.landCoverOpacity !== "number") p.landCoverOpacity = 0.55;
        }
        // v12 → v13: introduce Biosphere panel layers.
        if (version < 13) {
          if (typeof p.speciesOn !== "boolean") p.speciesOn = false;
          if (typeof p.speciesOpacity !== "number") p.speciesOpacity = 0.85;
          if (typeof p.forestLossOn !== "boolean") p.forestLossOn = false;
          if (typeof p.forestLossOpacity !== "number") p.forestLossOpacity = 0.85;
          if (typeof p.no2On !== "boolean") p.no2On = false;
          if (typeof p.no2Opacity !== "number") p.no2Opacity = 0.55;
        }
        // v11 → v12: introduce orientationMode.
        if (version < 12) {
          if (
            p.orientationMode !== "north" &&
            p.orientationMode !== "route" &&
            p.orientationMode !== "heading"
          ) {
            p.orientationMode = "north";
          }
        }
        // v9 → v10: revert the temporary "tiles" default. Lines is the
        // primary mode again.
        if (version < 10 && p.railStyle === "tiles") {
          p.railStyle = "lines";
        }
        // v10 → v11: previously reset the cloud-overlay default. Clouds
        // are now removed entirely (see v19); we keep the deletion of
        // the legacy field here for users coming from very old versions.
        if (version < 11) {
          if (typeof p.liveBasemapDayOffset !== "number") {
            p.liveBasemapDayOffset = 0;
          }
        }
        delete p.weatherMode;
        // Pre-activeOverlay shape: per-overlay booleans. Map them onto
        // railOn/ndviOn (the only survivors after v19).
        if (!("activeOverlay" in p) && version < 19) {
          if (p.railwayOn === true) p.railOn = true;
          if (p.ndviOn === undefined) p.ndviOn = false;
        }
        delete p.weatherOn;
        delete p.railwayOn;
        delete p.firesOn;
        if (typeof p.railwayOpacity !== "number") p.railwayOpacity = 0.85;
        if (typeof p.ndviOpacity !== "number") p.ndviOpacity = 0.7;
        if (p.railStyle !== "tiles" && p.railStyle !== "lines") p.railStyle = "lines";
        // v6 → v7: split single basemapId into image/vector slots + mode.
        if ("basemapId" in p) {
          const oldId = typeof p.basemapId === "string" ? p.basemapId : "";
          const old = BASEMAPS.find((b) => b.id === oldId);
          if (old?.category === "vector") {
            p.vectorBasemapId = old.id;
            p.basemapMode = "vector";
            if (typeof p.imageBasemapId !== "string") p.imageBasemapId = DEFAULT_IMAGE_BASEMAP_ID;
          } else {
            p.imageBasemapId = old?.id ?? DEFAULT_IMAGE_BASEMAP_ID;
            p.basemapMode = "photo";
            if (typeof p.vectorBasemapId !== "string") p.vectorBasemapId = DEFAULT_VECTOR_BASEMAP_ID;
          }
          delete p.basemapId;
        }
        // v7 → v8: collapse "s2cloudless-YYYY" into "s2cloudless" + variant year.
        if (typeof p.basemapVariants !== "object" || p.basemapVariants === null) {
          p.basemapVariants = {};
        }
        const variants = p.basemapVariants as Record<string, string>;
        const s2match = typeof p.imageBasemapId === "string"
          ? p.imageBasemapId.match(/^s2cloudless-(\d{4})$/)
          : null;
        if (s2match) {
          variants["s2cloudless"] = s2match[1];
          p.imageBasemapId = "s2cloudless";
        }

        if (typeof p.imageBasemapId !== "string") p.imageBasemapId = DEFAULT_IMAGE_BASEMAP_ID;
        if (typeof p.vectorBasemapId !== "string") p.vectorBasemapId = DEFAULT_VECTOR_BASEMAP_ID;
        if (
          p.basemapMode !== "photo" &&
          p.basemapMode !== "hybrid" &&
          p.basemapMode !== "vector"
        ) {
          p.basemapMode = "photo";
        }
        if (typeof p.railOn !== "boolean") p.railOn = false;
        if (typeof p.ndviOn !== "boolean") p.ndviOn = false;
        return p;
      },
    },
  ),
);
