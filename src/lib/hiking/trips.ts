"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { SavedTripCandidate, Trip, Waypoint } from "./types";

interface TripsState {
  trips: Trip[];
  /** Save the current route state as a new trip. Returns the new trip id. */
  saveTrip: (t: Omit<Trip, "id" | "savedAt">) => string;
  /** Update name/filters/waypoints/candidate of an existing trip. */
  updateTrip: (id: string, patch: Partial<Omit<Trip, "id">>) => void;
  rename: (id: string, name: string) => void;
  remove: (id: string) => void;
  duplicate: (id: string) => string | null;
}

let counter = 0;
function newId(): string {
  counter += 1;
  return `trip-${Date.now().toString(36)}-${counter}`;
}

export const useTrips = create<TripsState>()(
  persist(
    (set, get) => ({
      trips: [],
      saveTrip: (t) => {
        const id = newId();
        const trip: Trip = { id, savedAt: Date.now(), ...t };
        set((s) => ({ trips: [trip, ...s.trips] }));
        return id;
      },
      updateTrip: (id, patch) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === id ? { ...t, ...patch, savedAt: Date.now() } : t,
          ),
        })),
      rename: (id, name) =>
        set((s) => ({
          trips: s.trips.map((t) =>
            t.id === id ? { ...t, name, savedAt: Date.now() } : t,
          ),
        })),
      remove: (id) =>
        set((s) => ({ trips: s.trips.filter((t) => t.id !== id) })),
      duplicate: (id) => {
        const t = get().trips.find((x) => x.id === id);
        if (!t) return null;
        const copyId = newId();
        const copy: Trip = {
          ...t,
          id: copyId,
          name: `${t.name} (copy)`,
          savedAt: Date.now(),
        };
        set((s) => ({ trips: [copy, ...s.trips] }));
        return copyId;
      },
    }),
    {
      name: "biosphere1:hiking:trips",
      version: 1,
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export function makeTripCandidate(
  c: {
    coordinates: [number, number, number?][];
    distanceKm: number;
    durationMin: number;
    ascentM: number;
    descentM: number;
    greenRatio: number | null;
    source: "brouter" | "ors";
    profile: string;
  } | null,
): SavedTripCandidate | undefined {
  if (!c) return undefined;
  return {
    coordinates: c.coordinates,
    distanceKm: c.distanceKm,
    durationMin: c.durationMin,
    ascentM: c.ascentM,
    descentM: c.descentM,
    greenRatio: c.greenRatio,
    source: c.source,
    profile: c.profile,
  };
}

export function waypointsForTrip(waypoints: Waypoint[]): Waypoint[] {
  // Deep-copy to avoid sharing identity with the live state.
  return waypoints.map((w) => ({ ...w }));
}
