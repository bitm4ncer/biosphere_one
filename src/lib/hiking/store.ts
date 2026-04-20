"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  HikingPhase,
  LatLng,
  RouteCandidate,
  Station,
} from "./types";
import type { BrouterProfile } from "./routing";

interface HikingState {
  // persisted filters
  enabled: boolean;
  radiusKm: number;
  distanceMin: number;
  distanceMax: number;
  greenMin: number;
  profiles: BrouterProfile[];

  // transient
  center: LatLng | null;
  stations: Station[];
  startId: string | null;
  endId: string | null;
  candidates: RouteCandidate[];
  selectedCandidateId: string | null;
  phase: HikingPhase;
  notice: string | null;

  // actions
  setEnabled: (on: boolean) => void;
  setRadiusKm: (km: number) => void;
  setDistanceRange: (min: number, max: number) => void;
  setGreenMin: (v: number) => void;
  toggleProfile: (p: BrouterProfile) => void;

  setCenter: (c: LatLng | null) => void;
  setStations: (s: Station[]) => void;
  pickStation: (id: string) => void;
  clearStationSelection: () => void;

  setCandidates: (c: RouteCandidate[]) => void;
  selectCandidate: (id: string | null) => void;

  setPhase: (p: HikingPhase) => void;
  setNotice: (n: string | null) => void;
  reset: () => void;
}

const DEFAULTS = {
  enabled: false,
  radiusKm: 8,
  distanceMin: 10,
  distanceMax: 16,
  greenMin: 0.4,
  profiles: ["hiking-beta", "trekking"] as BrouterProfile[],
};

export const useHiking = create<HikingState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      center: null,
      stations: [],
      startId: null,
      endId: null,
      candidates: [],
      selectedCandidateId: null,
      phase: { kind: "idle" },
      notice: null,

      setEnabled: (on) => set({ enabled: on }),
      setRadiusKm: (km) =>
        set({ radiusKm: Math.max(1, Math.min(50, Math.round(km))) }),
      setDistanceRange: (min, max) => {
        const lo = Math.max(1, Math.min(min, max));
        const hi = Math.min(60, Math.max(lo + 1, max));
        set({ distanceMin: lo, distanceMax: hi });
      },
      setGreenMin: (v) => set({ greenMin: Math.max(0, Math.min(1, v)) }),
      toggleProfile: (p) =>
        set((s) => ({
          profiles: s.profiles.includes(p)
            ? s.profiles.filter((x) => x !== p)
            : [...s.profiles, p],
        })),

      setCenter: (c) => set({ center: c }),
      setStations: (stations) => set({ stations }),
      pickStation: (id) => {
        const s = get();
        if (s.startId === id) {
          set({ startId: null });
          return;
        }
        if (s.endId === id) {
          set({ endId: null });
          return;
        }
        if (!s.startId) {
          set({ startId: id });
          return;
        }
        if (!s.endId) {
          set({ endId: id });
          return;
        }
        // both set — replace end with new pick, keep start
        set({ endId: id });
      },
      clearStationSelection: () => set({ startId: null, endId: null }),

      setCandidates: (candidates) =>
        set({
          candidates,
          selectedCandidateId: candidates[0]?.id ?? null,
        }),
      selectCandidate: (id) => set({ selectedCandidateId: id }),

      setPhase: (phase) => set({ phase }),
      setNotice: (notice) => set({ notice }),
      reset: () =>
        set({
          stations: [],
          startId: null,
          endId: null,
          candidates: [],
          selectedCandidateId: null,
          phase: { kind: "idle" },
          notice: null,
        }),
    }),
    {
      name: "biosphere1:hiking",
      version: 1,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        enabled: state.enabled,
        radiusKm: state.radiusKm,
        distanceMin: state.distanceMin,
        distanceMax: state.distanceMax,
        greenMin: state.greenMin,
        profiles: state.profiles,
      }),
    },
  ),
);

export function selectStation(
  stations: Station[],
  id: string | null,
): Station | null {
  if (!id) return null;
  return stations.find((s) => s.id === id) ?? null;
}
