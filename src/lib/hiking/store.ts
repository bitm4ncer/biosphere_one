"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type {
  HikingPhase,
  LatLng,
  RouteCandidate,
  Station,
  Waypoint,
  WaypointRole,
  WaypointSource,
} from "./types";
import type { BrouterProfile } from "./routing";

interface AddWaypointArgs {
  role?: WaypointRole;
  lat: number;
  lon: number;
  label?: string;
  source: WaypointSource;
  stationId?: string;
}

interface HikingState {
  // persisted filters
  enabled: boolean;
  radiusKm: number;
  distanceMin: number;
  distanceMax: number;
  greenMin: number;
  profiles: BrouterProfile[];
  autoRoute: boolean;

  // transient
  center: LatLng | null;
  /** Stations fetched via the explicit "Find stations" radius scan. */
  stations: Station[];
  /** Stations auto-loaded alongside the rail overlay (viewport-based). */
  ambientStations: Station[];
  waypoints: Waypoint[];
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
  setAutoRoute: (on: boolean) => void;

  setCenter: (c: LatLng | null) => void;
  setStations: (s: Station[]) => void;
  setAmbientStations: (s: Station[]) => void;

  /** Toggle a station through the roles: none → start → end → via → none. */
  cycleStationRole: (station: Station) => void;
  addWaypoint: (args: AddWaypointArgs) => void;
  setWaypointRole: (id: string, role: WaypointRole) => void;
  removeWaypoint: (id: string) => void;
  moveWaypoint: (fromIdx: number, toIdx: number) => void;
  reverseWaypoints: () => void;
  clearWaypoints: () => void;
  replaceWaypoints: (ws: Waypoint[]) => void;

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
  autoRoute: true,
};

let waypointCounter = 0;
function makeWaypointId(): string {
  waypointCounter += 1;
  return `wp-${Date.now().toString(36)}-${waypointCounter}`;
}

/** Normalize a waypoint list so there is at most one start/end, with vias between. */
function normalizeWaypoints(list: Waypoint[]): Waypoint[] {
  // Preserve existing declared roles but collapse duplicates: first start wins,
  // last end wins, others become vias.
  let seenStart = false;
  let endIdx = -1;
  list.forEach((w, i) => {
    if (w.role === "end") endIdx = i;
  });
  return list.map((w, i) => {
    if (w.role === "start") {
      if (!seenStart) {
        seenStart = true;
        return w;
      }
      return { ...w, role: "via" as const };
    }
    if (w.role === "end") {
      if (i === endIdx) return w;
      return { ...w, role: "via" as const };
    }
    return w;
  });
}

/**
 * Decide a default role for a freshly added waypoint: fill start first,
 * then end, then insert as via before the end.
 */
function defaultRoleFor(list: Waypoint[]): WaypointRole {
  if (!list.some((w) => w.role === "start")) return "start";
  if (!list.some((w) => w.role === "end")) return "end";
  return "via";
}

function insertByRole(list: Waypoint[], wp: Waypoint): Waypoint[] {
  if (wp.role === "start") {
    const rest = list.filter((w) => w.role !== "start");
    return [wp, ...rest];
  }
  if (wp.role === "end") {
    const rest = list.filter((w) => w.role !== "end");
    return [...rest, wp];
  }
  // via → insert before end if present, otherwise at the tail
  const endIdx = list.findIndex((w) => w.role === "end");
  if (endIdx === -1) return [...list, wp];
  return [...list.slice(0, endIdx), wp, ...list.slice(endIdx)];
}

export const useHiking = create<HikingState>()(
  persist(
    (set, get) => ({
      ...DEFAULTS,
      center: null,
      stations: [],
      ambientStations: [],
      waypoints: [],
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
      setAutoRoute: (on) => set({ autoRoute: on }),

      setCenter: (c) => set({ center: c }),
      setStations: (stations) => set({ stations }),
      setAmbientStations: (ambientStations) => set({ ambientStations }),

      cycleStationRole: (station) => {
        const { waypoints } = get();
        const existing = waypoints.find(
          (w) => w.stationId === station.id,
        );
        if (existing) {
          // rotate: start → end → via → remove
          if (existing.role === "start") {
            get().setWaypointRole(existing.id, "end");
            return;
          }
          if (existing.role === "end") {
            get().setWaypointRole(existing.id, "via");
            return;
          }
          get().removeWaypoint(existing.id);
          return;
        }
        get().addWaypoint({
          lat: station.lat,
          lon: station.lon,
          label: station.name,
          source: "station",
          stationId: station.id,
        });
      },

      addWaypoint: ({ role, lat, lon, label, source, stationId }) => {
        set((s) => {
          const effectiveRole = role ?? defaultRoleFor(s.waypoints);
          const wp: Waypoint = {
            id: makeWaypointId(),
            role: effectiveRole,
            lat,
            lon,
            label,
            source,
            stationId,
          };
          return { waypoints: normalizeWaypoints(insertByRole(s.waypoints, wp)) };
        });
      },

      setWaypointRole: (id, role) => {
        set((s) => {
          const target = s.waypoints.find((w) => w.id === id);
          if (!target) return {};
          // Remove it, then re-insert with the new role so ordering stays correct.
          const without = s.waypoints.filter((w) => w.id !== id);
          const updated: Waypoint = { ...target, role };
          return {
            waypoints: normalizeWaypoints(insertByRole(without, updated)),
          };
        });
      },

      removeWaypoint: (id) =>
        set((s) => ({
          waypoints: s.waypoints.filter((w) => w.id !== id),
        })),

      moveWaypoint: (fromIdx, toIdx) =>
        set((s) => {
          if (
            fromIdx === toIdx ||
            fromIdx < 0 ||
            toIdx < 0 ||
            fromIdx >= s.waypoints.length ||
            toIdx >= s.waypoints.length
          ) {
            return {};
          }
          const next = s.waypoints.slice();
          const [moved] = next.splice(fromIdx, 1);
          next.splice(toIdx, 0, moved);
          return { waypoints: normalizeWaypoints(next) };
        }),

      reverseWaypoints: () =>
        set((s) => {
          if (s.waypoints.length < 2) return {};
          const reversed = s.waypoints.slice().reverse().map((w) => {
            if (w.role === "start") return { ...w, role: "end" as const };
            if (w.role === "end") return { ...w, role: "start" as const };
            return w;
          });
          return { waypoints: normalizeWaypoints(reversed) };
        }),

      clearWaypoints: () => set({ waypoints: [] }),
      replaceWaypoints: (ws) =>
        set({ waypoints: normalizeWaypoints(ws) }),

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
          ambientStations: [],
          waypoints: [],
          candidates: [],
          selectedCandidateId: null,
          phase: { kind: "idle" },
          notice: null,
        }),
    }),
    {
      name: "biosphere1:hiking",
      version: 2,
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        enabled: state.enabled,
        radiusKm: state.radiusKm,
        distanceMin: state.distanceMin,
        distanceMax: state.distanceMax,
        greenMin: state.greenMin,
        profiles: state.profiles,
        autoRoute: state.autoRoute,
      }),
      migrate: (persisted: unknown, version: number) => {
        if (!persisted || typeof persisted !== "object") return persisted;
        const p = persisted as Record<string, unknown>;
        if (version < 2) {
          // v1 had startId/endId transient fields; they were never persisted
          // (not in partialize), so nothing to migrate structurally. Just add
          // the new autoRoute default.
          if (typeof p.autoRoute !== "boolean") p.autoRoute = true;
        }
        return p;
      },
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

/** Accessors that derive start/end from the waypoint list. */
export function getStart(waypoints: Waypoint[]): Waypoint | null {
  return waypoints.find((w) => w.role === "start") ?? null;
}
export function getEnd(waypoints: Waypoint[]): Waypoint | null {
  return waypoints.find((w) => w.role === "end") ?? null;
}
export function getVias(waypoints: Waypoint[]): Waypoint[] {
  return waypoints.filter((w) => w.role === "via");
}
