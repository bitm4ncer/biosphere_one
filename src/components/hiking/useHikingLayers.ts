"use client";

import { useEffect } from "react";
import type { Map as MLMap } from "maplibre-gl";
import maplibregl from "maplibre-gl";
import { useHiking } from "@/lib/hiking/store";
import type { RouteCandidate, Waypoint } from "@/lib/hiking/types";

const WAYPOINT_SOURCE = "hiking-waypoints";
const WAYPOINT_HALO_LAYER = "hiking-waypoints-halo";
const WAYPOINT_DOT_LAYER = "hiking-waypoints-dot";
const WAYPOINT_LABEL_LAYER = "hiking-waypoints-label";
const ROUTE_SOURCE = "hiking-routes";
const ROUTE_LAYER_PRIMARY = "hiking-routes-primary";
const ROUTE_LAYER_CASING = "hiking-routes-casing";
const ROUTE_LAYER_ALT = "hiking-routes-alt";
const ROUTE_LAYER_ALT_CASING = "hiking-routes-alt-casing";

const COLOR_PRIMARY = "#d4ff38"; // accent
export const COLOR_START = "#7df09e";
export const COLOR_END = "#ff6b82";

function hashStr(s: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Map [0..360) into the hue ranges that don't clash with start-green or
// end-red: [30..80] (warm yellows/oranges) ∪ [185..330] (cyan→pink).
function safeHue(rawHue: number): number {
  const total = 50 + 145; // 195 deg of usable hue
  const x = ((rawHue % 360) / 360) * total;
  if (x < 50) return 30 + x;
  return 185 + (x - 50);
}

function hslToHex(h: number, s: number, l: number): string {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const c = l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1));
    return Math.round(255 * c)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/** Stable pastel hex color for a via waypoint. Spaced by golden angle so
 *  consecutive vias never collide visually even if their ids hash close. */
export function pastelForWaypoint(id: string, index: number): string {
  const base = (hashStr(id) % 360) + index * 137.508;
  return hslToHex(safeHue(base), 0.78, 0.76);
}

const HIKING_Z_ORDER: string[] = [
  ROUTE_LAYER_ALT_CASING,
  ROUTE_LAYER_ALT,
  ROUTE_LAYER_CASING,
  ROUTE_LAYER_PRIMARY,
  WAYPOINT_HALO_LAYER,
  WAYPOINT_DOT_LAYER,
  WAYPOINT_LABEL_LAYER,
];

type GeoJsonData =
  | GeoJSON.Feature
  | GeoJSON.FeatureCollection
  | GeoJSON.Geometry;

function ensureSource(map: MLMap, id: string, data: GeoJsonData) {
  const src = map.getSource(id) as unknown as
    | { setData?: (d: GeoJsonData) => void }
    | undefined;
  if (src?.setData) {
    src.setData(data);
    return;
  }
  map.addSource(id, { type: "geojson", data });
}

function removeLayerIfExists(map: MLMap, id: string) {
  if (map.getLayer(id)) map.removeLayer(id);
}
function removeSourceIfExists(map: MLMap, id: string) {
  if (map.getSource(id)) map.removeSource(id);
}

function raiseHikingLayers(map: MLMap) {
  for (const id of HIKING_Z_ORDER) {
    if (map.getLayer(id)) {
      try {
        map.moveLayer(id);
      } catch {
        /* ignore — style is mid-swap */
      }
    }
  }
}

function waypointFeatures(waypoints: Waypoint[]): GeoJSON.FeatureCollection {
  const last = waypoints.length - 1;
  return {
    type: "FeatureCollection",
    features: waypoints.map((w, i) => {
      const role = i === 0 ? "start" : i === last ? "end" : "via";
      const color =
        role === "start"
          ? COLOR_START
          : role === "end"
            ? COLOR_END
            : pastelForWaypoint(w.id, i);
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [w.lon, w.lat] },
        properties: {
          id: w.id,
          index: i,
          number: String(i + 1),
          role,
          color,
        },
      };
    }),
  };
}

function routeFeatures(
  candidates: RouteCandidate[],
  selectedId: string | null,
  finalized: boolean,
): GeoJSON.FeatureCollection {
  // When finalized, drop the alts entirely so they don't render.
  const visible = finalized
    ? candidates.filter((c) => c.id === selectedId)
    : candidates;
  return {
    type: "FeatureCollection",
    features: visible.map((c) => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: c.coordinates.map(([lon, lat]) => [lon, lat]),
      },
      properties: {
        id: c.id,
        selected: c.id === selectedId,
      },
    })),
  };
}

export function useHikingLayers(map: MLMap | null) {
  const enabled = useHiking((s) => s.enabled);
  const waypoints = useHiking((s) => s.waypoints);
  const candidates = useHiking((s) => s.candidates);
  const selectedCandidateId = useHiking((s) => s.selectedCandidateId);
  const finalized = useHiking((s) => s.finalized);
  const removeWaypoint = useHiking((s) => s.removeWaypoint);
  const selectCandidate = useHiking((s) => s.selectCandidate);

  // Re-raise hiking layers after a basemap or overlay style swap.
  useEffect(() => {
    if (!map) return;
    let frame = 0;
    const bump = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => raiseHikingLayers(map));
    };
    map.on("styledata", bump);
    return () => {
      cancelAnimationFrame(frame);
      map.off("styledata", bump);
    };
  }, [map]);

  // Waypoint pins (numbered)
  useEffect(() => {
    if (!map) return;
    const apply = () => {
      if (!enabled || waypoints.length === 0) {
        removeLayerIfExists(map, WAYPOINT_LABEL_LAYER);
        removeLayerIfExists(map, WAYPOINT_DOT_LAYER);
        removeLayerIfExists(map, WAYPOINT_HALO_LAYER);
        removeSourceIfExists(map, WAYPOINT_SOURCE);
        return;
      }
      ensureSource(map, WAYPOINT_SOURCE, waypointFeatures(waypoints));
      if (!map.getLayer(WAYPOINT_HALO_LAYER)) {
        map.addLayer({
          id: WAYPOINT_HALO_LAYER,
          type: "circle",
          source: WAYPOINT_SOURCE,
          paint: {
            "circle-radius": 14,
            "circle-color": "transparent",
            "circle-stroke-color": ["get", "color"],
            "circle-stroke-width": 2,
            "circle-stroke-opacity": 0.55,
          },
        });
      }
      if (!map.getLayer(WAYPOINT_DOT_LAYER)) {
        map.addLayer({
          id: WAYPOINT_DOT_LAYER,
          type: "circle",
          source: WAYPOINT_SOURCE,
          paint: {
            "circle-radius": 10,
            "circle-color": ["get", "color"],
            "circle-stroke-color": "#0a0a0b",
            "circle-stroke-width": 2,
            "circle-opacity": 0.95,
          },
        });
      }
      if (!map.getLayer(WAYPOINT_LABEL_LAYER)) {
        map.addLayer({
          id: WAYPOINT_LABEL_LAYER,
          type: "symbol",
          source: WAYPOINT_SOURCE,
          layout: {
            "text-field": ["get", "number"],
            "text-size": 11,
            "text-allow-overlap": true,
            "text-ignore-placement": true,
            "text-font": ["Noto Sans Bold"],
          },
          paint: {
            "text-color": "#0a0a0b",
          },
        });
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
    map.on("style.load", apply);

    // Tap a waypoint to remove it.
    const onClick = (e: maplibregl.MapMouseEvent) => {
      const feats = map.queryRenderedFeatures(e.point, {
        layers: [WAYPOINT_DOT_LAYER],
      });
      if (feats.length === 0) return;
      const id = feats[0].properties?.id;
      if (typeof id === "string") {
        // stop the click from bubbling so the long-press / map click handlers
        // don't also fire
        e.preventDefault();
        e.originalEvent?.stopPropagation();
        removeWaypoint(id);
      }
    };
    const onEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
    };
    if (enabled && waypoints.length > 0) {
      map.on("click", WAYPOINT_DOT_LAYER, onClick);
      map.on("mouseenter", WAYPOINT_DOT_LAYER, onEnter);
      map.on("mouseleave", WAYPOINT_DOT_LAYER, onLeave);
    }
    return () => {
      map.off("click", WAYPOINT_DOT_LAYER, onClick);
      map.off("mouseenter", WAYPOINT_DOT_LAYER, onEnter);
      map.off("mouseleave", WAYPOINT_DOT_LAYER, onLeave);
      map.off("style.load", apply);
    };
  }, [map, enabled, waypoints, removeWaypoint]);

  // Routes (selected + alts), with alt-tap to switch.
  useEffect(() => {
    if (!map) return;
    const apply = () => {
      if (!enabled || candidates.length === 0) {
        removeLayerIfExists(map, ROUTE_LAYER_ALT);
        removeLayerIfExists(map, ROUTE_LAYER_ALT_CASING);
        removeLayerIfExists(map, ROUTE_LAYER_PRIMARY);
        removeLayerIfExists(map, ROUTE_LAYER_CASING);
        removeSourceIfExists(map, ROUTE_SOURCE);
        return;
      }
      ensureSource(
        map,
        ROUTE_SOURCE,
        routeFeatures(candidates, selectedCandidateId, finalized),
      );
      if (!map.getLayer(ROUTE_LAYER_ALT_CASING)) {
        map.addLayer({
          id: ROUTE_LAYER_ALT_CASING,
          type: "line",
          source: ROUTE_SOURCE,
          filter: ["!", ["get", "selected"]],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#0a0a0b",
            "line-width": 5,
            "line-opacity": 0.55,
          },
        });
      }
      if (!map.getLayer(ROUTE_LAYER_ALT)) {
        map.addLayer({
          id: ROUTE_LAYER_ALT,
          type: "line",
          source: ROUTE_SOURCE,
          filter: ["!", ["get", "selected"]],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": COLOR_PRIMARY,
            "line-width": 2.5,
            "line-opacity": 0.5,
            "line-dasharray": [2, 1.5],
          },
        });
      }
      if (!map.getLayer(ROUTE_LAYER_CASING)) {
        map.addLayer({
          id: ROUTE_LAYER_CASING,
          type: "line",
          source: ROUTE_SOURCE,
          filter: ["==", ["get", "selected"], true],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": "#0a0a0b",
            "line-width": 7,
            "line-opacity": 0.8,
          },
        });
      }
      if (!map.getLayer(ROUTE_LAYER_PRIMARY)) {
        map.addLayer({
          id: ROUTE_LAYER_PRIMARY,
          type: "line",
          source: ROUTE_SOURCE,
          filter: ["==", ["get", "selected"], true],
          layout: { "line-cap": "round", "line-join": "round" },
          paint: {
            "line-color": COLOR_PRIMARY,
            "line-width": 4,
            "line-opacity": 0.95,
          },
        });
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
    map.on("style.load", apply);

    const onClickAlt = (e: maplibregl.MapMouseEvent) => {
      const feats = map.queryRenderedFeatures(e.point, {
        layers: [ROUTE_LAYER_ALT],
      });
      if (feats.length === 0) return;
      const id = feats[0].properties?.id;
      if (typeof id === "string") selectCandidate(id);
    };
    const onEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
    };
    if (enabled && candidates.length > 0 && !finalized) {
      map.on("click", ROUTE_LAYER_ALT, onClickAlt);
      map.on("mouseenter", ROUTE_LAYER_ALT, onEnter);
      map.on("mouseleave", ROUTE_LAYER_ALT, onLeave);
    }
    return () => {
      map.off("click", ROUTE_LAYER_ALT, onClickAlt);
      map.off("mouseenter", ROUTE_LAYER_ALT, onEnter);
      map.off("mouseleave", ROUTE_LAYER_ALT, onLeave);
      map.off("style.load", apply);
    };
  }, [map, enabled, candidates, selectedCandidateId, finalized, selectCandidate]);
}
