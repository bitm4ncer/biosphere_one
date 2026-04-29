// src/lib/settings.ts
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import {
  BASEMAPS,
  DEFAULT_IMAGE_BASEMAP_ID,
  DEFAULT_VECTOR_BASEMAP_ID,
  type BasemapCategory,
} from "./basemaps";

export type Projection = "mercator" | "globe";
export type OverlayKind = "clouds" | "rail" | "fires" | "ndvi";
export type RailStyle = "tiles" | "lines";
export type BasemapMode = BasemapCategory; // "photo" | "vector"

export interface Settings {
  imageBasemapId: string;
  vectorBasemapId: string;
  basemapMode: BasemapMode;
  projection: Projection;
  activeOverlay: OverlayKind | null;
  weatherOpacity: number;
  railwayOpacity: number;
  railStyle: RailStyle;
  firesOpacity: number;
  ndviOpacity: number;
  setImageBasemapId: (id: string) => void;
  setVectorBasemapId: (id: string) => void;
  setBasemapMode: (mode: BasemapMode) => void;
  toggleBasemapMode: () => void;
  setProjection: (p: Projection) => void;
  setActiveOverlay: (kind: OverlayKind | null) => void;
  setWeatherOpacity: (o: number) => void;
  setRailwayOpacity: (o: number) => void;
  setRailStyle: (style: RailStyle) => void;
  setFiresOpacity: (o: number) => void;
  setNdviOpacity: (o: number) => void;
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      imageBasemapId: DEFAULT_IMAGE_BASEMAP_ID,
      vectorBasemapId: DEFAULT_VECTOR_BASEMAP_ID,
      basemapMode: "photo",
      projection: "mercator",
      activeOverlay: null,
      weatherOpacity: 0.8,
      railwayOpacity: 0.85,
      railStyle: "lines",
      firesOpacity: 0.9,
      ndviOpacity: 0.7,
      setImageBasemapId: (id) => set({ imageBasemapId: id }),
      setVectorBasemapId: (id) => set({ vectorBasemapId: id }),
      setBasemapMode: (mode) => set({ basemapMode: mode }),
      toggleBasemapMode: () =>
        set((s) => ({ basemapMode: s.basemapMode === "photo" ? "vector" : "photo" })),
      setProjection: (p) => set({ projection: p }),
      setActiveOverlay: (kind) => set({ activeOverlay: kind }),
      setWeatherOpacity: (o) => set({ weatherOpacity: o }),
      setRailwayOpacity: (o) => set({ railwayOpacity: o }),
      setRailStyle: (style) => set({ railStyle: style }),
      setFiresOpacity: (o) => set({ firesOpacity: o }),
      setNdviOpacity: (o) => set({ ndviOpacity: o }),
    }),
    {
      name: "biosphere1:settings",
      version: 7,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        imageBasemapId: state.imageBasemapId,
        vectorBasemapId: state.vectorBasemapId,
        basemapMode: state.basemapMode,
        projection: state.projection,
        activeOverlay: state.activeOverlay,
        weatherOpacity: state.weatherOpacity,
        railwayOpacity: state.railwayOpacity,
        railStyle: state.railStyle,
        firesOpacity: state.firesOpacity,
        ndviOpacity: state.ndviOpacity,
      }),
      migrate: (persisted: unknown, _version: number) => {
        if (!persisted || typeof persisted !== "object") return persisted;
        const p = persisted as Record<string, unknown>;
        delete p.weatherMode;
        // Collapse the old per-overlay on-booleans into a single `activeOverlay`.
        if (!("activeOverlay" in p)) {
          let active: OverlayKind | null = null;
          if (p.weatherOn === true) active = "clouds";
          else if (p.railwayOn === true) active = "rail";
          else if (p.firesOn === true) active = "fires";
          else if (p.ndviOn === true) active = "ndvi";
          p.activeOverlay = active;
        }
        delete p.weatherOn;
        delete p.railwayOn;
        delete p.firesOn;
        delete p.ndviOn;
        if (typeof p.weatherOpacity !== "number") p.weatherOpacity = 0.8;
        if (typeof p.railwayOpacity !== "number") p.railwayOpacity = 0.85;
        if (typeof p.firesOpacity !== "number") p.firesOpacity = 0.9;
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
            // Photo, unknown id, or missing → treat as image.
            p.imageBasemapId = old?.id ?? DEFAULT_IMAGE_BASEMAP_ID;
            p.basemapMode = "photo";
            if (typeof p.vectorBasemapId !== "string") p.vectorBasemapId = DEFAULT_VECTOR_BASEMAP_ID;
          }
          delete p.basemapId;
        }
        if (typeof p.imageBasemapId !== "string") p.imageBasemapId = DEFAULT_IMAGE_BASEMAP_ID;
        if (typeof p.vectorBasemapId !== "string") p.vectorBasemapId = DEFAULT_VECTOR_BASEMAP_ID;
        if (p.basemapMode !== "photo" && p.basemapMode !== "vector") p.basemapMode = "photo";
        return p;
      },
    },
  ),
);
