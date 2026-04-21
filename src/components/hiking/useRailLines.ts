"use client";

import { useEffect, useRef } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { fetchRailLinesBbox } from "@/lib/hiking/overpass";

const MIN_ZOOM = 10;
const BBOX_PAD_FACTOR = 0.5;
const DEBOUNCE_MS = 450;

const SOURCE_ID = "rail-vector";
const LAYER_MAIN = "rail-vector-main";
const LAYER_CASING = "rail-vector-casing";
const LAYER_BRANCH = "rail-vector-branch";
const LAYER_MINOR = "rail-vector-minor";

interface CacheEntry {
  bbox: [number, number, number, number];
  data: GeoJSON.FeatureCollection<GeoJSON.LineString>;
}

function ensureLayers(map: MLMap) {
  if (!map.getSource(SOURCE_ID)) {
    map.addSource(SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  if (!map.getLayer(LAYER_CASING)) {
    map.addLayer({
      id: LAYER_CASING,
      type: "line",
      source: SOURCE_ID,
      filter: ["match", ["get", "kind"], ["rail", "light_rail"], true, false],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#0a0a0b",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          1.8,
          14,
          4,
          18,
          8,
        ],
        "line-opacity": 0.85,
      },
    });
  }
  if (!map.getLayer(LAYER_MAIN)) {
    map.addLayer({
      id: LAYER_MAIN,
      type: "line",
      source: SOURCE_ID,
      filter: [
        "all",
        ["==", ["get", "kind"], "rail"],
        [
          "match",
          ["get", "usage"],
          ["main", "branch"],
          true,
          ["!=", ["get", "tunnel"], true],
        ],
      ],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#e6e8ef",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          0.9,
          14,
          2.2,
          18,
          4,
        ],
        "line-dasharray": [4, 2],
        "line-opacity": 0.9,
      },
    });
  }
  if (!map.getLayer(LAYER_BRANCH)) {
    map.addLayer({
      id: LAYER_BRANCH,
      type: "line",
      source: SOURCE_ID,
      filter: ["==", ["get", "kind"], "light_rail"],
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#7dd4ff",
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          10,
          0.8,
          14,
          1.8,
          18,
          3,
        ],
        "line-opacity": 0.9,
      },
    });
  }
  if (!map.getLayer(LAYER_MINOR)) {
    map.addLayer({
      id: LAYER_MINOR,
      type: "line",
      source: SOURCE_ID,
      filter: [
        "match",
        ["get", "kind"],
        ["subway", "tram", "monorail", "narrow_gauge"],
        true,
        false,
      ],
      minzoom: 12,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": [
          "match",
          ["get", "kind"],
          "subway",
          "#c7a6ff",
          "tram",
          "#ffb561",
          "#aab1bc",
        ],
        "line-width": [
          "interpolate",
          ["linear"],
          ["zoom"],
          12,
          0.8,
          16,
          1.8,
        ],
        "line-opacity": 0.75,
      },
    });
  }
}

function removeLayers(map: MLMap) {
  for (const id of [LAYER_MINOR, LAYER_BRANCH, LAYER_MAIN, LAYER_CASING]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID);
}

function setData(
  map: MLMap,
  data: GeoJSON.FeatureCollection<GeoJSON.LineString>,
) {
  const src = map.getSource(SOURCE_ID) as unknown as
    | { setData?: (d: GeoJSON.FeatureCollection) => void }
    | undefined;
  src?.setData?.(data);
}

/**
 * Vector rail lines in the current viewport. Replaces the slow OpenRailwayMap
 * raster overlay with an Overpass-backed GeoJSON layer. BBox is padded so
 * small pans stay inside the prefetched area; a single-entry cache avoids
 * refetching while the viewport stays inside.
 */
export function useRailLines(map: MLMap | null, active: boolean) {
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
      if (map.isStyleLoaded()) removeLayers(map);
    };

    if (!active) {
      clear();
      return;
    }

    const install = () => ensureLayers(map);
    if (map.isStyleLoaded()) install();
    else map.once("load", install);
    map.on("style.load", install);

    const run = async () => {
      if (map.getZoom() < MIN_ZOOM) {
        setData(map, { type: "FeatureCollection", features: [] });
        cacheRef.current = null;
        return;
      }
      const b = map.getBounds();
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

      const vw = b.getEast() - b.getWest();
      const vh = b.getNorth() - b.getSouth();
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
        const data = await fetchRailLinesBbox(bbox, ctrl.signal);
        if (ctrl.signal.aborted) return;
        cacheRef.current = { bbox, data };
        if (map.isStyleLoaded()) {
          ensureLayers(map);
          setData(map, data);
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        // swallow — overlay is best-effort
      }
    };

    const schedule = () => {
      if (timerRef.current !== null) window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => {
        timerRef.current = null;
        void run();
      }, DEBOUNCE_MS);
    };

    if (map.isStyleLoaded()) schedule();
    else map.once("load", schedule);
    map.on("moveend", schedule);
    map.on("zoomend", schedule);

    return () => {
      map.off("moveend", schedule);
      map.off("zoomend", schedule);
      map.off("style.load", install);
      clear();
    };
  }, [map, active]);
}
