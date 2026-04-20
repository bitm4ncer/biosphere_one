"use client";

import { useEffect, useRef } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { useHiking } from "@/lib/hiking/store";
import { fetchStationsBbox } from "@/lib/hiking/overpass";
import type { Station } from "@/lib/hiking/types";

const MIN_ZOOM = 10;
/** Pad the viewport so small pans stay inside the prefetched bbox. */
const BBOX_PAD_FACTOR = 0.5;
const DEBOUNCE_MS = 450;

interface CacheEntry {
  bbox: [number, number, number, number];
  stations: Station[];
}

/**
 * Auto-loads rail stations inside the current viewport while the rail overlay
 * is active. Caches the last prefetched bbox and skips refetching while the
 * visible area stays within it.
 */
export function useAmbientStations(map: MLMap | null, active: boolean) {
  const setAmbient = useHiking((s) => s.setAmbientStations);
  const cacheRef = useRef<CacheEntry | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    if (!map) return;

    const clear = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      abortRef.current?.abort();
      abortRef.current = null;
      cacheRef.current = null;
      setAmbient([]);
    };

    if (!active) {
      clear();
      return;
    }

    const run = async () => {
      if (map.getZoom() < MIN_ZOOM) {
        setAmbient([]);
        cacheRef.current = null;
        return;
      }
      const b = map.getBounds();
      const vw = b.getEast() - b.getWest();
      const vh = b.getNorth() - b.getSouth();

      const cache = cacheRef.current;
      if (cache) {
        const [cs, cw, cn, ce] = cache.bbox;
        const contains =
          b.getSouth() >= cs &&
          b.getNorth() <= cn &&
          b.getWest() >= cw &&
          b.getEast() <= ce;
        if (contains) return;
      }

      // Pad the bbox outward by BBOX_PAD_FACTOR on each side.
      const padW = vw * BBOX_PAD_FACTOR;
      const padH = vh * BBOX_PAD_FACTOR;
      const bbox: [number, number, number, number] = [
        b.getSouth() - padH,
        b.getWest() - padW,
        b.getNorth() + padH,
        b.getEast() + padW,
      ];

      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;

      try {
        const stations = await fetchStationsBbox(bbox, ctrl.signal);
        if (ctrl.signal.aborted) return;
        cacheRef.current = { bbox, stations };
        setAmbient(stations);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        // swallow — ambient stations are nice-to-have
      }
    };

    const schedule = () => {
      if (timerRef.current !== null) {
        window.clearTimeout(timerRef.current);
      }
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void run();
      }, DEBOUNCE_MS);
    };

    // Initial kick + listen to view changes
    if (map.isStyleLoaded()) schedule();
    else map.once("load", schedule);
    map.on("moveend", schedule);
    map.on("zoomend", schedule);

    return () => {
      map.off("moveend", schedule);
      map.off("zoomend", schedule);
      clear();
    };
  }, [map, active, setAmbient]);
}
