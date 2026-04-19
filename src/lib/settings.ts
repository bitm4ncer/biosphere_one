// src/lib/settings.ts
"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { DEFAULT_BASEMAP_ID } from "./basemaps";

export type Projection = "mercator" | "globe";

export interface Settings {
  basemapId: string;
  projection: Projection;
  weatherOn: boolean;
  weatherOpacity: number;
  railwayOn: boolean;
  railwayOpacity: number;
  firesOn: boolean;
  firesOpacity: number;
  ndviOn: boolean;
  ndviOpacity: number;
  setBasemapId: (id: string) => void;
  setProjection: (p: Projection) => void;
  setWeatherOn: (on: boolean) => void;
  setWeatherOpacity: (o: number) => void;
  setRailwayOn: (on: boolean) => void;
  setRailwayOpacity: (o: number) => void;
  setFiresOn: (on: boolean) => void;
  setFiresOpacity: (o: number) => void;
  setNdviOn: (on: boolean) => void;
  setNdviOpacity: (o: number) => void;
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      basemapId: DEFAULT_BASEMAP_ID,
      projection: "mercator",
      weatherOn: false,
      weatherOpacity: 0.8,
      railwayOn: false,
      railwayOpacity: 0.85,
      firesOn: false,
      firesOpacity: 0.9,
      ndviOn: false,
      ndviOpacity: 0.7,
      setBasemapId: (id) => set({ basemapId: id }),
      setProjection: (p) => set({ projection: p }),
      setWeatherOn: (on) => set({ weatherOn: on }),
      setWeatherOpacity: (o) => set({ weatherOpacity: o }),
      setRailwayOn: (on) => set({ railwayOn: on }),
      setRailwayOpacity: (o) => set({ railwayOpacity: o }),
      setFiresOn: (on) => set({ firesOn: on }),
      setFiresOpacity: (o) => set({ firesOpacity: o }),
      setNdviOn: (on) => set({ ndviOn: on }),
      setNdviOpacity: (o) => set({ ndviOpacity: o }),
    }),
    {
      name: "biosphere1:settings",
      version: 4,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        basemapId: state.basemapId,
        projection: state.projection,
        weatherOn: state.weatherOn,
        weatherOpacity: state.weatherOpacity,
        railwayOn: state.railwayOn,
        railwayOpacity: state.railwayOpacity,
        firesOn: state.firesOn,
        firesOpacity: state.firesOpacity,
        ndviOn: state.ndviOn,
        ndviOpacity: state.ndviOpacity,
      }),
      migrate: (persisted: unknown, _version: number) => {
        if (!persisted || typeof persisted !== "object") return persisted;
        const p = persisted as Record<string, unknown>;
        delete p.weatherMode;
        if (typeof p.railwayOn !== "boolean") p.railwayOn = false;
        if (typeof p.railwayOpacity !== "number") p.railwayOpacity = 0.85;
        if (typeof p.firesOn !== "boolean") p.firesOn = false;
        if (typeof p.firesOpacity !== "number") p.firesOpacity = 0.9;
        if (typeof p.ndviOn !== "boolean") p.ndviOn = false;
        if (typeof p.ndviOpacity !== "number") p.ndviOpacity = 0.7;
        return p;
      },
    },
  ),
);
