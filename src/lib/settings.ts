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
  setBasemapId: (id: string) => void;
  setProjection: (p: Projection) => void;
  setWeatherOn: (on: boolean) => void;
  setWeatherOpacity: (o: number) => void;
}

export const useSettings = create<Settings>()(
  persist(
    (set) => ({
      basemapId: DEFAULT_BASEMAP_ID,
      projection: "mercator",
      weatherOn: false,
      weatherOpacity: 0.8,
      setBasemapId: (id) => set({ basemapId: id }),
      setProjection: (p) => set({ projection: p }),
      setWeatherOn: (on) => set({ weatherOn: on }),
      setWeatherOpacity: (o) => set({ weatherOpacity: o }),
    }),
    {
      name: "biosphere1:settings",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        basemapId: state.basemapId,
        projection: state.projection,
        weatherOn: state.weatherOn,
        weatherOpacity: state.weatherOpacity,
      }),
      migrate: (persisted: unknown, _version: number) => {
        if (!persisted || typeof persisted !== "object") return persisted;
        const p = persisted as Record<string, unknown>;
        delete p.weatherMode;
        return p;
      },
    },
  ),
);
