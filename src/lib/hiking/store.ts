"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { HikingPhase, RouteCandidate, Waypoint } from "./types";
import { BROUTER_PROFILES, type BrouterProfile } from "./routing";

const VALID_PROFILE_IDS = new Set<string>(BROUTER_PROFILES.map((p) => p.id));

interface HikingState {
  // persisted (cache)
  enabled: boolean;
  waypoints: Waypoint[];
  roundTrip: boolean;
  profile: BrouterProfile;
  candidates: RouteCandidate[];
  selectedCandidateId: string | null;
  /** When true, only the selected route is shown on the map; alts are hidden. */
  finalized: boolean;

  // transient
  phase: HikingPhase;
  notice: string | null;

  // actions
  setEnabled: (on: boolean) => void;

  addWaypoint: (w: Omit<Waypoint, "id">) => void;
  removeWaypoint: (id: string) => void;
  moveWaypoint: (id: string, dir: -1 | 1) => void;
  reverseWaypoints: () => void;
  clearWaypoints: () => void;

  setRoundTrip: (on: boolean) => void;
  setProfile: (p: BrouterProfile) => void;

  setCandidates: (c: RouteCandidate[]) => void;
  selectCandidate: (id: string | null) => void;
  finalizeRoute: () => void;
  unfinalize: () => void;
  clearRoute: () => void;

  setPhase: (p: HikingPhase) => void;
  setNotice: (n: string | null) => void;
  reset: () => void;
}

const DEFAULTS = {
  enabled: false,
  waypoints: [] as Waypoint[],
  roundTrip: false,
  profile: "hiking-beta" as BrouterProfile,
  candidates: [] as RouteCandidate[],
  selectedCandidateId: null as string | null,
  finalized: false,
};

let waypointCounter = 0;
function newWaypointId(): string {
  waypointCounter += 1;
  return `wp-${Date.now().toString(36)}-${waypointCounter}`;
}

export const useHiking = create<HikingState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      phase: { kind: "idle" },
      notice: null,

      setEnabled: (on) => set({ enabled: on }),

      addWaypoint: (w) =>
        set((s) => ({
          waypoints: [...s.waypoints, { ...w, id: newWaypointId() }],
          // adding a waypoint invalidates the previous final selection
          finalized: false,
          // auto-enable so the user sees the marker immediately even if they
          // added it from the rail overlay without opening the hiking panel
          enabled: true,
        })),
      removeWaypoint: (id) =>
        set((s) => ({
          waypoints: s.waypoints.filter((w) => w.id !== id),
          finalized: false,
        })),
      moveWaypoint: (id, dir) =>
        set((s) => {
          const idx = s.waypoints.findIndex((w) => w.id === id);
          if (idx < 0) return s;
          const ni = idx + dir;
          if (ni < 0 || ni >= s.waypoints.length) return s;
          const next = s.waypoints.slice();
          const [item] = next.splice(idx, 1);
          next.splice(ni, 0, item);
          return { waypoints: next, finalized: false };
        }),
      reverseWaypoints: () =>
        set((s) => ({
          waypoints: [...s.waypoints].reverse(),
          finalized: false,
        })),
      clearWaypoints: () =>
        set({
          waypoints: [],
          candidates: [],
          selectedCandidateId: null,
          finalized: false,
          phase: { kind: "idle" },
          notice: null,
        }),

      setRoundTrip: (on) => set({ roundTrip: on, finalized: false }),
      setProfile: (p) => set({ profile: p, finalized: false }),

      setCandidates: (candidates) =>
        set({
          candidates,
          selectedCandidateId: candidates[0]?.id ?? null,
          finalized: false,
        }),
      selectCandidate: (id) => set({ selectedCandidateId: id }),
      finalizeRoute: () => {
        const s = get();
        if (s.selectedCandidateId) set({ finalized: true });
      },
      unfinalize: () => set({ finalized: false }),
      clearRoute: () =>
        set({
          candidates: [],
          selectedCandidateId: null,
          finalized: false,
          phase: { kind: "idle" },
        }),

      setPhase: (phase) => set({ phase }),
      setNotice: (notice) => set({ notice }),
      reset: () =>
        set({
          waypoints: [],
          candidates: [],
          selectedCandidateId: null,
          finalized: false,
          phase: { kind: "idle" },
          notice: null,
        }),
    }),
    {
      name: "biosphere1:hiking",
      // v3: profile list reshuffled (walking-fast removed, bike profiles added).
      version: 3,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        enabled: state.enabled,
        waypoints: state.waypoints,
        roundTrip: state.roundTrip,
        profile: state.profile,
        candidates: state.candidates,
        selectedCandidateId: state.selectedCandidateId,
        finalized: state.finalized,
      }),
      migrate: (persisted: unknown, version: number) => {
        if (!persisted || typeof persisted !== "object") return persisted;
        if (version < 2) {
          // v1 stored station-pair workflow state — drop it.
          return {
            enabled: false,
            waypoints: [],
            roundTrip: false,
            profile: "hiking-beta",
            candidates: [],
            selectedCandidateId: null,
            finalized: false,
          };
        }
        if (version < 3) {
          // walking-fast was removed; clear stale routes and remap.
          const p = persisted as { profile?: string };
          const fallback: BrouterProfile =
            p.profile && VALID_PROFILE_IDS.has(p.profile)
              ? (p.profile as BrouterProfile)
              : "hiking-beta";
          return {
            ...persisted,
            profile: fallback,
            candidates: [],
            selectedCandidateId: null,
            finalized: false,
          };
        }
        return persisted;
      },
    },
  ),
);
