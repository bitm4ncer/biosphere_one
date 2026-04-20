"use client";

import { useEffect } from "react";
import type { Map as MLMap } from "maplibre-gl";
import maplibregl from "maplibre-gl";
import destination from "@turf/destination";
import { point } from "@turf/helpers";
import { useHiking } from "@/lib/hiking/store";
import type { RouteCandidate, Station, Waypoint } from "@/lib/hiking/types";
import { openMapPopup, openStationPopup } from "./waypointPopup";

const RADIUS_SOURCE = "hiking-radius";
const RADIUS_FILL = "hiking-radius-fill";
const RADIUS_LINE = "hiking-radius-line";
const STATION_SOURCE = "hiking-stations";
const STATION_LAYER = "hiking-stations-layer";
const STATION_LABEL = "hiking-stations-label";
const WAYPOINT_SOURCE = "hiking-waypoints";
const WAYPOINT_RING = "hiking-waypoints-ring";
const WAYPOINT_DOT = "hiking-waypoints-dot";
const WAYPOINT_LABEL = "hiking-waypoints-label";
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
const VIA_COLOR = "#d4ff38";

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

function stationsFeatureCollection(
  stations: Station[],
  waypoints: Waypoint[],
): GeoJSON.FeatureCollection {
  const byStationId = new Map<string, Waypoint>();
  for (const w of waypoints) {
    if (w.stationId) byStationId.set(w.stationId, w);
  }
  return {
    type: "FeatureCollection",
    features: stations.map((s) => {
      const wp = byStationId.get(s.id);
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [s.lon, s.lat] },
        properties: {
          id: s.id,
          name: s.name,
          tier: s.tier,
          role: wp?.role ?? "none",
        },
      };
    }),
  };
}

function waypointsFeatureCollection(
  waypoints: Waypoint[],
): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: waypoints.map((w, i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [w.lon, w.lat] },
      properties: {
        id: w.id,
        role: w.role,
        label:
          w.label ??
          (w.role === "start"
            ? "Start"
            : w.role === "end"
              ? "End"
              : `Via ${i}`),
        idx: i,
      },
    })),
  };
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
  const ambientStations = useHiking((s) => s.ambientStations);
  const waypoints = useHiking((s) => s.waypoints);
  const candidates = useHiking((s) => s.candidates);
  const selectedCandidateId = useHiking((s) => s.selectedCandidateId);

  const showRadius = enabled && Boolean(center) && stations.length > 0;

  // Radius circle around center
  useEffect(() => {
    if (!map) return;
    const apply = () => {
      if (!showRadius || !center) {
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
  }, [map, showRadius, center?.lat, center?.lon, radiusKm]);

  // Stations (merged: explicit scan + ambient rail-overlay pool)
  useEffect(() => {
    if (!map) return;

    // Merge with ambient-wins-on-tie: explicit scan first (user intent),
    // ambient appended for the rest.
    const merged = (() => {
      const byId = new Map<string, Station>();
      for (const s of stations) byId.set(s.id, s);
      for (const s of ambientStations) if (!byId.has(s.id)) byId.set(s.id, s);
      return Array.from(byId.values());
    })();

    const apply = () => {
      if (merged.length === 0) {
        removeLayerIfExists(map, STATION_LABEL);
        removeLayerIfExists(map, STATION_LAYER);
        removeSourceIfExists(map, STATION_SOURCE);
        return;
      }
      const fc = stationsFeatureCollection(merged, waypoints);
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
              8,
              [
                "match",
                ["get", "tier"],
                "intercity",
                6.5,
                "regional",
                5,
                "sBahn",
                4,
                "subway",
                3.5,
                "tram",
                2.5,
                "halt",
                3,
                3,
              ],
            ],
            "circle-color": [
              "match",
              ["get", "role"],
              "start",
              START_COLOR,
              "end",
              END_COLOR,
              "via",
              VIA_COLOR,
              [
                "match",
                ["get", "tier"],
                "intercity",
                "#d4ff38",
                "regional",
                "#cfe6ff",
                "sBahn",
                "#8ee5a4",
                "subway",
                "#c7a6ff",
                "tram",
                "#ffb561",
                "#aab1bc",
              ],
            ],
            "circle-stroke-color": "#0a0a0b",
            "circle-stroke-width": [
              "case",
              ["!=", ["get", "role"], "none"],
              2,
              [
                "match",
                ["get", "tier"],
                "intercity",
                1.8,
                "regional",
                1.4,
                "sBahn",
                1.2,
                1,
              ],
            ],
          },
        });
      }
      if (!map.getLayer(STATION_LABEL)) {
        map.addLayer({
          id: STATION_LABEL,
          type: "symbol",
          source: STATION_SOURCE,
          // show labels for bigger tiers at lower zoom, small ones only close-up
          minzoom: 11,
          filter: [
            "any",
            [
              "all",
              [">=", ["zoom"], 11],
              ["match", ["get", "tier"], ["intercity", "regional"], true, false],
            ],
            [
              "all",
              [">=", ["zoom"], 13],
              ["match", ["get", "tier"], ["sBahn", "subway"], true, false],
            ],
            [">=", ["zoom"], 14],
            ["!=", ["get", "role"], "none"],
          ],
          layout: {
            "text-field": ["get", "name"],
            "text-size": [
              "match",
              ["get", "tier"],
              "intercity",
              12,
              "regional",
              11,
              10,
            ],
            "text-offset": [0, 1.3],
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
    };
    if (map.isStyleLoaded()) apply();
    else map.once("load", apply);
    map.on("style.load", apply);

    const stationsById = new Map(merged.map((s) => [s.id, s]));
    const onClick = (e: maplibregl.MapMouseEvent) => {
      const feats = map.queryRenderedFeatures(e.point, {
        layers: [STATION_LAYER],
      });
      if (feats.length === 0) return;
      e.preventDefault?.();
      const id = feats[0].properties?.id;
      if (typeof id !== "string") return;
      const station = stationsById.get(id);
      if (!station) return;
      openStationPopup(map, station);
    };
    const onEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
    };
    if (merged.length > 0) {
      map.on("click", STATION_LAYER, onClick);
      map.on("mouseenter", STATION_LAYER, onEnter);
      map.on("mouseleave", STATION_LAYER, onLeave);
    }
    return () => {
      map.off("click", STATION_LAYER, onClick);
      map.off("mouseenter", STATION_LAYER, onEnter);
      map.off("mouseleave", STATION_LAYER, onLeave);
      map.off("style.load", apply);
    };
  }, [map, stations, ambientStations, waypoints]);

  // Waypoint markers (one layer regardless of source — stations or map pins)
  useEffect(() => {
    if (!map) return;
    const apply = () => {
      if (waypoints.length === 0) {
        removeLayerIfExists(map, WAYPOINT_LABEL);
        removeLayerIfExists(map, WAYPOINT_DOT);
        removeLayerIfExists(map, WAYPOINT_RING);
        removeSourceIfExists(map, WAYPOINT_SOURCE);
        return;
      }
      const fc = waypointsFeatureCollection(waypoints);
      ensureSource(map, WAYPOINT_SOURCE, fc);
      if (!map.getLayer(WAYPOINT_RING)) {
        map.addLayer({
          id: WAYPOINT_RING,
          type: "circle",
          source: WAYPOINT_SOURCE,
          paint: {
            "circle-radius": 13,
            "circle-color": "transparent",
            "circle-stroke-color": [
              "match",
              ["get", "role"],
              "start",
              START_COLOR,
              "end",
              END_COLOR,
              VIA_COLOR,
            ],
            "circle-stroke-width": 2,
            "circle-stroke-opacity": 0.75,
          },
        });
      }
      if (!map.getLayer(WAYPOINT_DOT)) {
        map.addLayer({
          id: WAYPOINT_DOT,
          type: "circle",
          source: WAYPOINT_SOURCE,
          paint: {
            "circle-radius": 6,
            "circle-color": [
              "match",
              ["get", "role"],
              "start",
              START_COLOR,
              "end",
              END_COLOR,
              VIA_COLOR,
            ],
            "circle-stroke-color": "#0a0a0b",
            "circle-stroke-width": 1.5,
          },
        });
      }
      if (!map.getLayer(WAYPOINT_LABEL)) {
        map.addLayer({
          id: WAYPOINT_LABEL,
          type: "symbol",
          source: WAYPOINT_SOURCE,
          layout: {
            "text-field": ["get", "label"],
            "text-size": 10,
            "text-offset": [0, -1.4],
            "text-anchor": "bottom",
            "text-optional": true,
            "text-allow-overlap": false,
          },
          paint: {
            "text-color": [
              "match",
              ["get", "role"],
              "start",
              START_COLOR,
              "end",
              END_COLOR,
              VIA_COLOR,
            ],
            "text-halo-color": "#0a0a0b",
            "text-halo-width": 1.4,
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
  }, [map, waypoints]);

  // Long-press / right-click anywhere on the map → open waypoint popup.
  useEffect(() => {
    if (!map) return;
    const onContextMenu = (e: maplibregl.MapMouseEvent) => {
      // If the click hit a station marker, the station click handler runs
      // instead (it handles its own popup). The station handler uses click
      // not contextmenu so we need to explicitly skip here.
      const hits = map.queryRenderedFeatures(e.point, {
        layers: map.getLayer(STATION_LAYER) ? [STATION_LAYER] : [],
      });
      if (hits.length > 0) return;
      e.preventDefault?.();
      openMapPopup(map, { lng: e.lngLat.lng, lat: e.lngLat.lat });
    };
    map.on("contextmenu", onContextMenu);
    return () => {
      map.off("contextmenu", onContextMenu);
    };
  }, [map]);

  // Route candidates
  useEffect(() => {
    if (!map) return;
    const apply = () => {
      if (candidates.length === 0) {
        removeLayerIfExists(map, ROUTE_LAYER_ALT);
        removeLayerIfExists(map, ROUTE_LAYER_ALT_CASING);
        removeLayerIfExists(map, ROUTE_LAYER_PRIMARY);
        removeLayerIfExists(map, ROUTE_LAYER_CASING);
        removeSourceIfExists(map, ROUTE_SOURCE);
        return;
      }
      const fc = routesFeatureCollection(candidates, selectedCandidateId);
      ensureSource(map, ROUTE_SOURCE, fc);

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
    if (candidates.length > 0) {
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
  }, [map, candidates, selectedCandidateId]);
}
