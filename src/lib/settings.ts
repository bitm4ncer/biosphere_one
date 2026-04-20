// src/lib/settings.ts
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEFAULT_BASEMAP_ID } from "./basemaps";

export type Projection = "mercator" | "globe";
export type OverlayKind = "clouds" | "rail" | "fires" | "ndvi";

export interface Settings {
  basemapId: string;
  projection: Projection;
  activeOverlay: OverlayKind | null;
  weatherOpacity: number;
  railwayOpacity: number;
  firesOpacity: number;
  ndviOpacity: number;
  setBasemapId: (id: string) => void;
  setProjection: (p: Projection) => void;
  setActiveOverlay: (kind: OverlayKind | null) => void;
  setWeatherOpacity: (o: number) => void;
  setRailwayOpacity: (o: number) => void;
  setFiresOpacity: (o: number) => void;
  setNdviOpacity: (o: number) => void;
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      basemapId: DEFAULT_BASEMAP_ID,
      projection: "mercator",
      activeOverlay: null,
      weatherOpacity: 0.8,
      railwayOpacity: 0.85,
      firesOpacity: 0.9,
      ndviOpacity: 0.7,
      setBasemapId: (id) => set({ basemapId: id }),
      setProjection: (p) => set({ projection: p }),
      setActiveOverlay: (kind) => set({ activeOverlay: kind }),
      setWeatherOpacity: (o) => set({ weatherOpacity: o }),
      setRailwayOpacity: (o) => set({ railwayOpacity: o }),
      setFiresOpacity: (o) => set({ firesOpacity: o }),
      setNdviOpacity: (o) => set({ ndviOpacity: o }),
    }),
    {
      name: "biosphere1:settings",
      version: 5,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        basemapId: state.basemapId,
        projection: state.projection,
        activeOverlay: state.activeOverlay,
        weatherOpacity: state.weatherOpacity,
        railwayOpacity: state.railwayOpacity,
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
        return p;
      },
    },
  ),
);
