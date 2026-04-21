"use client";

import { useEffect, useRef } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { useHiking, getStart, getEnd, getVias } from "@/lib/hiking/store";
import { searchHikingRoutes } from "@/lib/hiking/search";
import type { BrouterProfile } from "@/lib/hiking/routing";

const DEBOUNCE_MS = 500;

function waypointsSignature(
  list: { id: string; role: string; lat: number; lon: number }[],
): string {
  return list
    .map((w) => `${w.id}:${w.role}:${w.lat.toFixed(5)},${w.lon.toFixed(5)}`)
    .join("|");
}

/**
 * Automatically compute routes whenever there is a start + end waypoint.
 * Debounced so dragging / adding vias in quick succession collapses into a
 * single request. Previous in-flight requests are aborted.
 */
export function useAutoRoute(map: MLMap | null) {
  const waypoints = useHiking((s) => s.waypoints);
  const profiles = useHiking((s) => s.profiles);
  const distanceMin = useHiking((s) => s.distanceMin);
  const distanceMax = useHiking((s) => s.distanceMax);
  const greenMin = useHiking((s) => s.greenMin);
  const autoRoute = useHiking((s) => s.autoRoute);
  const setCandidates = useHiking((s) => s.setCandidates);
  const setPhase = useHiking((s) => s.setPhase);
  const setNotice = useHiking((s) => s.setNotice);

  const abortRef = useRef<AbortController | null>(null);
  const lastSigRef = useRef<string>("");
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!autoRoute) return;
    const start = getStart(waypoints);
    const end = getEnd(waypoints);
    if (!start || !end || profiles.length === 0) return;

    const sig = waypointsSignature(waypoints) + `|p=${profiles.join(",")}|d=${distanceMin}-${distanceMax}|g=${greenMin}`;
    if (sig === lastSigRef.current) return;
    lastSigRef.current = sig;

    if (timerRef.current !== null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(async () => {
      timerRef.current = null;
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setPhase({ kind: "routing" });
      setNotice(null);
      try {
        const vias = getVias(waypoints);
        const result = await searchHikingRoutes({
          from: { lat: start.lat, lon: start.lon },
          to: { lat: end.lat, lon: end.lon },
          vias: vias.map((v) => ({ lat: v.lat, lon: v.lon })),
          distanceKm: [distanceMin, distanceMax],
          profiles: profiles as BrouterProfile[],
          greenMin,
          signal: ctrl.signal,
        });
        if (ctrl.signal.aborted) return;
        setCandidates(result.candidates);
        setPhase({ kind: "routed" });
        if (result.notice) setNotice(result.notice);
        const best = result.candidates[0];
        if (map && best) {
          let south = Infinity,
            west = Infinity,
            north = -Infinity,
            east = -Infinity;
          for (const [lon, lat] of best.coordinates) {
            if (lat < south) south = lat;
            if (lat > north) north = lat;
            if (lon < west) west = lon;
            if (lon > east) east = lon;
          }
          if (Number.isFinite(south)) {
            map.fitBounds(
              [
                [west, south],
                [east, north],
              ],
              { padding: 60, duration: 700, maxZoom: 14 },
            );
          }
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setPhase({ kind: "error", message: (err as Error).message });
      }
    }, DEBOUNCE_MS);

    return () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [
    map,
    waypoints,
    profiles,
    distanceMin,
    distanceMax,
    greenMin,
    autoRoute,
    setCandidates,
    setPhase,
    setNotice,
  ]);
}
