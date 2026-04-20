"use client";

import { useEffect } from "react";
import type { Map as MLMap } from "maplibre-gl";
import maplibregl from "maplibre-gl";
import destination from "@turf/destination";
import { point } from "@turf/helpers";
import { useHiking } from "@/lib/hiking/store";
import { selectStation } from "@/lib/hiking/store";
import type { RouteCandidate } from "@/lib/hiking/types";

const RADIUS_SOURCE = "hiking-radius";
const RADIUS_FILL = "hiking-radius-fill";
const RADIUS_LINE = "hiking-radius-line";
const STATION_SOURCE = "hiking-stations";
const STATION_LAYER = "hiking-stations-layer";
const STATION_LABEL = "hiking-stations-label";
const STATION_ENDPOINT_SOURCE = "hiking-endpoints";
const STATION_ENDPOINT_LAYER = "hiking-endpoints-layer";
const ROUTE_SOURCE = "hiking-routes";
const ROUTE_LAYER_PRIMARY = "hiking-routes-primary";
const ROUTE_LAYER_CASING = "hiking-routes-casing";
const ROUTE_LAYER_ALT = "hiking-routes-alt";
const ROUTE_LAYER_ALT_CASING = "hiking-routes-alt-casing";

const ROUTE_COLORS = {
  primary: "#d4ff38",
  alt: "#9dd4ff",
  alt2: "#ffb561",
} as const;

const START_COLOR = "#7df09e";
const END_COLOR = "#ff6b82";

function circlePolygon(
  lonLat: [number, number],
  radiusKm: number,
  steps = 64,
): GeoJSON.Feature<GeoJSON.Polygon> {
  const coords: [number, number][] = [];
  const origin = point(lonLat);
  for (let i = 0; i <= steps; i += 1) {
    const bearing = (i / steps) * 360 - 180;
    const d = destination(origin, radiusKm, bearing, { units: "kilometers" });
    coords.push([d.geometry.coordinates[0], d.geometry.coordinates[1]]);
  }
  return {
    type: "Feature",
    geometry: { type: "Polygon", coordinates: [coords] },
    properties: {},
  };
}

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

/**
 * Order (bottom-to-top) in which hiking layers must sit above every other
 * overlay. The last ID ends up on top after the `moveLayer` sweep.
 */
const HIKING_Z_ORDER: string[] = [
  RADIUS_FILL,
  RADIUS_LINE,
  ROUTE_LAYER_ALT_CASING,
  ROUTE_LAYER_ALT,
  ROUTE_LAYER_CASING,
  ROUTE_LAYER_PRIMARY,
  STATION_ENDPOINT_LAYER,
  STATION_LAYER,
  STATION_LABEL,
];

/**
 * Re-assert hiking layer stacking: move every existing hiking layer to the
 * top of the stack in priority order. Called after we add our own layers
 * and whenever another layer elsewhere in the app (e.g. the Rail raster
 * overlay) is added or the basemap is swapped.
 */
function raiseHikingLayers(map: MLMap) {
  for (const id of HIKING_Z_ORDER) {
    if (map.getLayer(id)) {
      try {
        map.moveLayer(id);
      } catch {
        // layer may be in a transient state during style swap — ignore
      }
    }
  }
}

function routesFeatureCollection(
  candidates: RouteCandidate[],
  selectedId: string | null,
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: candidates.map((c, i) => ({
      type: "Feature",
      geometry: {
        type: "LineString",
        coordinates: c.coordinates.map(([lon, lat]) => [lon, lat]),
      },
      properties: {
        id: c.id,
        index: i,
        selected: c.id === selectedId,
        color:
          c.id === selectedId
            ? ROUTE_COLORS.primary
            : i === 1
              ? ROUTE_COLORS.alt
              : i === 2
                ? ROUTE_COLORS.alt2
                : ROUTE_COLORS.primary,
      },
    })),
  };
}

export function useHikingLayers(map: MLMap | null) {
  const enabled = useHiking((s) => s.enabled);
  const center = useHiking((s) => s.center);
  const radiusKm = useHiking((s) => s.radiusKm);
  const stations = useHiking((s) => s.stations);
  const startId = useHiking((s) => s.startId);
  const endId = useHiking((s) => s.endId);
  const candidates = useHiking((s) => s.candidates);
  const selectedCandidateId = useHiking((s) => s.selectedCandidateId);
  const pickStation = useHiking((s) => s.pickStation);

  // Keep hiking layers above any other overlay that gets toggled on or any
  // basemap style swap. MapLibre fires `styledata` for both — we debounce
  // with rAF so the move happens after the new layers settle.
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

  // Radius circle around center
  useEffect(() => {
    if (!map) return;
    const apply = () => {
      if (!enabled || !center) {
        removeLayerIfExists(map, RADIUS_LINE);
        removeLayerIfExists(map, RADIUS_FILL);
        removeSourceIfExists(map, RADIUS_SOURCE);
        return;
      }
      const poly = circlePolygon([center.lon, center.lat], radiusKm);
      ensureSource(map, RADIUS_SOURCE, poly);
      if (!map.getLayer(RADIUS_FILL)) {
        map.addLayer({
          id: RADIUS_FILL,
          type: "fill",
          source: RADIUS_SOURCE,
          paint: {
            "fill-color": ROUTE_COLORS.primary,
            "fill-opacity": 0.06,
          },
        });
      }
      if (!map.getLayer(RADIUS_LINE)) {
        map.addLayer({
          id: RADIUS_LINE,
          type: "line",
          source: RADIUS_SOURCE,
          paint: {
            "line-color": ROUTE_COLORS.primary,
            "line-opacity": 0.35,
            "line-width": 1,
            "line-dasharray": [2, 2],
          },
        });
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
    map.on("style.load", apply);
    return () => {
      map.off("style.load", apply);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, enabled, center?.lat, center?.lon, radiusKm]);

  // Stations source + layer + click handling
  useEffect(() => {
    if (!map) return;
    const start = selectStation(stations, startId);
    const end = selectStation(stations, endId);
    const apply = () => {
      if (!enabled || stations.length === 0) {
        removeLayerIfExists(map, STATION_LABEL);
        removeLayerIfExists(map, STATION_LAYER);
        removeSourceIfExists(map, STATION_SOURCE);
        removeLayerIfExists(map, STATION_ENDPOINT_LAYER);
        removeSourceIfExists(map, STATION_ENDPOINT_SOURCE);
        return;
      }
      const fc: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: stations.map((s) => ({
          type: "Feature",
          geometry: { type: "Point", coordinates: [s.lon, s.lat] },
          properties: {
            id: s.id,
            name: s.name,
            role:
              s.id === startId ? "start" : s.id === endId ? "end" : "none",
          },
        })),
      };
      ensureSource(map, STATION_SOURCE, fc);
      if (!map.getLayer(STATION_LAYER)) {
        map.addLayer({
          id: STATION_LAYER,
          type: "circle",
          source: STATION_SOURCE,
          paint: {
            "circle-radius": [
              "case",
              ["!=", ["get", "role"], "none"],
              7,
              4.5,
            ],
            "circle-color": [
              "match",
              ["get", "role"],
              "start",
              START_COLOR,
              "end",
              END_COLOR,
              "#d4ff38",
            ],
            "circle-stroke-color": "#0a0a0b",
            "circle-stroke-width": 1.5,
          },
        });
      }
      if (!map.getLayer(STATION_LABEL)) {
        map.addLayer({
          id: STATION_LABEL,
          type: "symbol",
          source: STATION_SOURCE,
          layout: {
            "text-field": ["get", "name"],
            "text-size": 11,
            "text-offset": [0, 1.2],
            "text-anchor": "top",
            "text-optional": true,
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": "#e5e7eb",
            "text-halo-color": "#0a0a0b",
            "text-halo-width": 1.2,
          },
        });
      }

      // endpoint highlight ring (pulsing feeling via thicker stroke)
      const endpoints: GeoJSON.FeatureCollection = {
        type: "FeatureCollection",
        features: [start, end]
          .filter((s): s is NonNullable<typeof s> => Boolean(s))
          .map((s) => ({
            type: "Feature",
            geometry: { type: "Point", coordinates: [s!.lon, s!.lat] },
            properties: { role: s!.id === startId ? "start" : "end" },
          })),
      };
      ensureSource(map, STATION_ENDPOINT_SOURCE, endpoints);
      if (!map.getLayer(STATION_ENDPOINT_LAYER)) {
        map.addLayer({
          id: STATION_ENDPOINT_LAYER,
          type: "circle",
          source: STATION_ENDPOINT_SOURCE,
          paint: {
            "circle-radius": 12,
            "circle-color": "transparent",
            "circle-stroke-color": [
              "match",
              ["get", "role"],
              "start",
              START_COLOR,
              END_COLOR,
            ],
            "circle-stroke-width": 2,
            "circle-stroke-opacity": 0.7,
          },
        });
      }
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
    map.on("style.load", apply);

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const feats = map.queryRenderedFeatures(e.point, {
        layers: [STATION_LAYER],
      });
      if (feats.length === 0) return;
      const id = feats[0].properties?.id;
      if (typeof id === "string") pickStation(id);
    };
    const onEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
    };
    const attach = () => {
      map.on("click", STATION_LAYER, onClick);
      map.on("mouseenter", STATION_LAYER, onEnter);
      map.on("mouseleave", STATION_LAYER, onLeave);
    };
    const detach = () => {
      map.off("click", STATION_LAYER, onClick);
      map.off("mouseenter", STATION_LAYER, onEnter);
      map.off("mouseleave", STATION_LAYER, onLeave);
    };
    if (enabled && stations.length > 0) attach();
    return () => {
      detach();
      map.off("style.load", apply);
    };
  }, [map, enabled, stations, startId, endId, pickStation]);

  // Route candidates
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
      const fc = routesFeatureCollection(candidates, selectedCandidateId);
      ensureSource(map, ROUTE_SOURCE, fc);

      // Non-selected routes (thinner, dashed)
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
            "line-opacity": 0.6,
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
            "line-color": ["get", "color"],
            "line-width": 2.5,
            "line-opacity": 0.55,
            "line-dasharray": [2, 1.5],
          },
        });
      }
      // Selected route (thicker, solid, top)
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
            "line-color": ["get", "color"],
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
      if (typeof id === "string") useHiking.getState().selectCandidate(id);
    };
    const onEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
    };
    if (enabled && candidates.length > 0) {
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
  }, [map, enabled, candidates, selectedCandidateId]);
}
