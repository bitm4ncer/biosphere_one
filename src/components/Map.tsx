"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import maplibregl, { Map as MLMap, ScaleControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  BASEMAPS,
  DEFAULT_IMAGE_BASEMAP_ID,
  DEFAULT_VECTOR_BASEMAP_ID,
  getActiveVariant,
  resolveBasemapSubtitle,
  resolveBasemapUrl,
  type Basemap,
} from "@/lib/basemaps";
import { useSettings, type BasemapMode, type OverlayKind } from "@/lib/settings";
import { getAccessToken } from "@/lib/sentinel/auth";
import { fetchDayOverlay } from "@/lib/sentinel/latest-overlay";
import { searchCatalog, type Snapshot } from "@/lib/sentinel/catalog";
import type { Bbox, Credentials } from "@/types/sentinel";
import { SettingsGear } from "./SettingsGear";
import type { GeocodeResult } from "@/lib/geocode";
import {
  gibsDateNDaysAgo,
  gibsTileUrl,
  gibsYesterday,
  type GibsLayer,
} from "@/lib/gibs";
import { RAILWAY_TILE_URLS, RAILWAY_ATTRIBUTION, RAILWAY_MAX_ZOOM } from "@/lib/railway";
import { fetchRailNetwork } from "@/lib/hiking/overpass";
import { useHiking } from "@/lib/hiking/store";
import { useLongPress } from "./hiking/useLongPress";
import { requestCompassPermission, subscribeCompass } from "@/lib/compass";
import { ProjectionControl } from "./ProjectionControl";
import { HudPanel } from "./hud/HudPanel";
import { SidebarToggle } from "./SidebarToggle";
import { HikingToggle } from "./HikingToggle";
import { HikingPanel } from "./hud/HikingPanel";
import { useHikingLayers } from "./hiking/useHikingLayers";

const CLOUDS_DAYS_BACK = 7;
const CLOUDS_ANIM_INTERVAL_MS = 900;
const CLOUDS_COMPOSITE_LAYERS: GibsLayer[] = [
  // VIIRS NOAA-20 — primary daily true-color since SNPP went offline March 2026.
  "VIIRS_NOAA20_CorrectedReflectance_TrueColor",
];

const OVERLAY_SOURCE_ID = "timeline-overlay";
const OVERLAY_LAYER_ID = "timeline-overlay-layer";
const SECTOR_SOURCE_ID = "timeline-sector";
const SECTOR_LAYER_ID = "timeline-sector-outline";
const TIMELINE_DAYS_BACK = 365;
const WEATHER_SOURCE_ID = "weather";
const WEATHER_LAYER_ID = "weather-layer";
const MIN_FETCH_ZOOM = 8;
const RAILWAY_SOURCE_ID = "railway";
const RAILWAY_LAYER_ID = "railway-layer";
const FIRES_SOURCE_ID = "fires";
const FIRES_LAYER_ID = "fires-layer";
const NDVI_SOURCE_ID = "ndvi";
const NDVI_LAYER_ID = "ndvi-layer";
// Hybrid overlay: Esri reference layers (transparent roads, boundaries, labels)
// — same setup Esri uses for its own "Imagery Hybrid" view.
const HYBRID_TRANSPORT_SOURCE_ID = "hybrid-transport";
const HYBRID_TRANSPORT_LAYER_ID = "hybrid-transport-layer";
const HYBRID_TRANSPORT_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}";
const HYBRID_REFERENCE_SOURCE_ID = "hybrid-reference";
const HYBRID_REFERENCE_LAYER_ID = "hybrid-reference-layer";
const HYBRID_REFERENCE_TILE_URL =
  "https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}";
const HYBRID_OVERLAY_ATTRIB =
  '<a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a> reference overlays';

interface ViewState {
  center: [number, number];
  zoom: number;
}

type TimelineState =
  | { kind: "idle" }
  | { kind: "searching" }
  | { kind: "ready" }
  | { kind: "loading" }
  | { kind: "error"; message: string };

interface Props {
  credentials: Credentials | null;
  flyTarget?: GeocodeResult | null;
  onOpenSettings?: () => void;
}

function rasterStyle(basemap: Basemap, variantId?: string) {
  return {
    version: 8 as const,
    // Glyphs are required for any symbol layer with `text-field` (station
    // names, waypoint numbers, etc.) we add on top. Raster basemaps would
    // otherwise have no glyphs source and labels render blank.
    glyphs:
      "https://protomaps.github.io/basemaps-assets/fonts/{fontstack}/{range}.pbf",
    sources: {
      base: {
        type: "raster" as const,
        tiles: [resolveBasemapUrl(basemap, variantId)],
        tileSize: basemap.tileSize ?? 256,
        attribution: basemap.attribution,
        maxzoom: basemap.maxzoom ?? 18,
      },
    },
    layers: [{ id: "base", type: "raster" as const, source: "base" }],
  };
}

function applyBasemap(map: MLMap, basemap: Basemap, variantId?: string) {
  if (basemap.kind === "raster") {
    map.setStyle(rasterStyle(basemap, variantId));
  } else {
    map.setStyle(basemap.url);
  }
}

function addHybridOverlay(map: MLMap) {
  if (!map.getSource(HYBRID_TRANSPORT_SOURCE_ID)) {
    map.addSource(HYBRID_TRANSPORT_SOURCE_ID, {
      type: "raster",
      tiles: [HYBRID_TRANSPORT_TILE_URL],
      tileSize: 256,
      maxzoom: 19,
      attribution: HYBRID_OVERLAY_ATTRIB,
    });
  }
  if (!map.getLayer(HYBRID_TRANSPORT_LAYER_ID)) {
    map.addLayer({
      id: HYBRID_TRANSPORT_LAYER_ID,
      type: "raster",
      source: HYBRID_TRANSPORT_SOURCE_ID,
    });
  }
  if (!map.getSource(HYBRID_REFERENCE_SOURCE_ID)) {
    map.addSource(HYBRID_REFERENCE_SOURCE_ID, {
      type: "raster",
      tiles: [HYBRID_REFERENCE_TILE_URL],
      tileSize: 256,
      maxzoom: 19,
      attribution: HYBRID_OVERLAY_ATTRIB,
    });
  }
  if (!map.getLayer(HYBRID_REFERENCE_LAYER_ID)) {
    map.addLayer({
      id: HYBRID_REFERENCE_LAYER_ID,
      type: "raster",
      source: HYBRID_REFERENCE_SOURCE_ID,
    });
  }
}

function removeHybridOverlay(map: MLMap) {
  if (map.getLayer(HYBRID_REFERENCE_LAYER_ID)) map.removeLayer(HYBRID_REFERENCE_LAYER_ID);
  if (map.getSource(HYBRID_REFERENCE_SOURCE_ID)) map.removeSource(HYBRID_REFERENCE_SOURCE_ID);
  if (map.getLayer(HYBRID_TRANSPORT_LAYER_ID)) map.removeLayer(HYBRID_TRANSPORT_LAYER_ID);
  if (map.getSource(HYBRID_TRANSPORT_SOURCE_ID)) map.removeSource(HYBRID_TRANSPORT_SOURCE_ID);
}

const WEATHER_MAXZOOM = 7;

function ensureWeatherLayer(map: MLMap, urls: string[], opacity: number) {
  if (map.getLayer(WEATHER_LAYER_ID)) return;
  if (map.getSource(WEATHER_SOURCE_ID)) map.removeSource(WEATHER_SOURCE_ID);
  map.addSource(WEATHER_SOURCE_ID, {
    type: "raster",
    tiles: urls,
    tileSize: 256,
    maxzoom: WEATHER_MAXZOOM,
    attribution:
      '<a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noreferrer">NASA GIBS</a>',
  });
  map.addLayer({
    id: WEATHER_LAYER_ID,
    type: "raster",
    source: WEATHER_SOURCE_ID,
    maxzoom: 8,
    paint: { "raster-opacity": opacity, "raster-fade-duration": 0 },
  });
}

function updateWeatherTiles(map: MLMap, urls: string[]) {
  const source = map.getSource(WEATHER_SOURCE_ID) as unknown as
    | { setTiles?: (tiles: string[]) => void }
    | undefined;
  if (source?.setTiles) source.setTiles(urls);
}

function updateWeatherOpacity(map: MLMap, opacity: number) {
  if (map.getLayer(WEATHER_LAYER_ID)) {
    map.setPaintProperty(WEATHER_LAYER_ID, "raster-opacity", opacity);
  }
}

function removeWeatherLayer(map: MLMap) {
  if (map.getLayer(WEATHER_LAYER_ID)) map.removeLayer(WEATHER_LAYER_ID);
  if (map.getSource(WEATHER_SOURCE_ID)) map.removeSource(WEATHER_SOURCE_ID);
}

function ensureRailwayLayer(map: MLMap, opacity: number) {
  if (map.getLayer(RAILWAY_LAYER_ID)) return;
  if (map.getSource(RAILWAY_SOURCE_ID)) map.removeSource(RAILWAY_SOURCE_ID);
  map.addSource(RAILWAY_SOURCE_ID, {
    type: "raster",
    tiles: RAILWAY_TILE_URLS,
    tileSize: 256,
    maxzoom: RAILWAY_MAX_ZOOM,
    attribution: RAILWAY_ATTRIBUTION,
  });
  map.addLayer({
    id: RAILWAY_LAYER_ID,
    type: "raster",
    source: RAILWAY_SOURCE_ID,
    paint: { "raster-opacity": opacity, "raster-fade-duration": 0 },
  });
}

function updateRailwayOpacity(map: MLMap, opacity: number) {
  if (map.getLayer(RAILWAY_LAYER_ID)) {
    map.setPaintProperty(RAILWAY_LAYER_ID, "raster-opacity", opacity);
  }
}

function removeRailwayLayer(map: MLMap) {
  if (map.getLayer(RAILWAY_LAYER_ID)) map.removeLayer(RAILWAY_LAYER_ID);
  if (map.getSource(RAILWAY_SOURCE_ID)) map.removeSource(RAILWAY_SOURCE_ID);
}

// Clean rail view — custom OSM lines fetched from Overpass, no text labels.
const RAIL_LINES_SOURCE_ID = "rail-lines-src";
const RAIL_LINES_CASING_LAYER_ID = "rail-lines-casing";
const RAIL_LINES_MAIN_LAYER_ID = "rail-lines-main";
const RAIL_LINES_MIN_ZOOM = 9;

function ensureRailLinesLayer(map: MLMap, opacity: number) {
  if (!map.getSource(RAIL_LINES_SOURCE_ID)) {
    map.addSource(RAIL_LINES_SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
      attribution: RAILWAY_ATTRIBUTION,
    });
  }
  if (!map.getLayer(RAIL_LINES_CASING_LAYER_ID)) {
    map.addLayer({
      id: RAIL_LINES_CASING_LAYER_ID,
      type: "line",
      source: RAIL_LINES_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": "#080a06",
        "line-width": [
          "interpolate", ["linear"], ["zoom"],
          9, 1.8,
          12, 2.8,
          16, 4,
        ],
        "line-opacity": opacity,
      },
    });
  }
  if (!map.getLayer(RAIL_LINES_MAIN_LAYER_ID)) {
    map.addLayer({
      id: RAIL_LINES_MAIN_LAYER_ID,
      type: "line",
      source: RAIL_LINES_SOURCE_ID,
      layout: { "line-cap": "round", "line-join": "round" },
      paint: {
        "line-color": [
          "match",
          ["get", "kind"],
          "rail", "#d4ff38",
          "light_rail", "#b8e6ff",
          "subway", "#b8e6ff",
          "tram", "#9dd4ff",
          "narrow_gauge", "#e2b8ff",
          "#d4ff38",
        ],
        "line-width": [
          "interpolate", ["linear"], ["zoom"],
          9, 0.6,
          12, 1.2,
          16, 2,
        ],
        "line-opacity": opacity,
        "line-dasharray": [
          "case",
          ["==", ["get", "tunnel"], true], ["literal", [2, 2]],
          ["literal", [1, 0]],
        ],
      },
    });
  }
}

function updateRailLinesOpacity(map: MLMap, opacity: number) {
  if (map.getLayer(RAIL_LINES_MAIN_LAYER_ID)) {
    map.setPaintProperty(RAIL_LINES_MAIN_LAYER_ID, "line-opacity", opacity);
  }
  if (map.getLayer(RAIL_LINES_CASING_LAYER_ID)) {
    map.setPaintProperty(
      RAIL_LINES_CASING_LAYER_ID,
      "line-opacity",
      opacity,
    );
  }
}

function setRailLinesData(map: MLMap, data: GeoJSON.FeatureCollection) {
  const src = map.getSource(RAIL_LINES_SOURCE_ID) as unknown as
    | { setData?: (d: GeoJSON.FeatureCollection) => void }
    | undefined;
  if (src?.setData) src.setData(data);
}

function removeRailLinesLayer(map: MLMap) {
  if (map.getLayer(RAIL_LINES_MAIN_LAYER_ID))
    map.removeLayer(RAIL_LINES_MAIN_LAYER_ID);
  if (map.getLayer(RAIL_LINES_CASING_LAYER_ID))
    map.removeLayer(RAIL_LINES_CASING_LAYER_ID);
  if (map.getSource(RAIL_LINES_SOURCE_ID))
    map.removeSource(RAIL_LINES_SOURCE_ID);
}

// Stations rendered alongside the rail-lines overlay. Tap = add as waypoint.
const RAIL_STATIONS_SOURCE_ID = "rail-stations-src";
const RAIL_STATIONS_DOT_LAYER_ID = "rail-stations-dot";
const RAIL_STATIONS_HIT_LAYER_ID = "rail-stations-hit";
const RAIL_STATIONS_LABEL_LAYER_ID = "rail-stations-label";
const RAIL_STATIONS_MIN_ZOOM = 10;

function ensureRailStationsLayer(map: MLMap) {
  if (!map.getSource(RAIL_STATIONS_SOURCE_ID)) {
    map.addSource(RAIL_STATIONS_SOURCE_ID, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] },
    });
  }
  if (!map.getLayer(RAIL_STATIONS_HIT_LAYER_ID)) {
    // Invisible larger circle to make tap targets thumb-friendly on mobile
    map.addLayer({
      id: RAIL_STATIONS_HIT_LAYER_ID,
      type: "circle",
      source: RAIL_STATIONS_SOURCE_ID,
      paint: {
        "circle-radius": 16,
        "circle-color": "transparent",
        "circle-stroke-width": 0,
      },
    });
  }
  if (!map.getLayer(RAIL_STATIONS_DOT_LAYER_ID)) {
    map.addLayer({
      id: RAIL_STATIONS_DOT_LAYER_ID,
      type: "circle",
      source: RAIL_STATIONS_SOURCE_ID,
      paint: {
        "circle-radius": [
          "interpolate", ["linear"], ["zoom"],
          10, 3,
          14, 4.5,
          17, 6,
        ],
        "circle-color": "#d4ff38",
        "circle-stroke-color": "#0a0a0b",
        "circle-stroke-width": 1.5,
        "circle-opacity": 0.95,
      },
    });
  }
  if (!map.getLayer(RAIL_STATIONS_LABEL_LAYER_ID)) {
    map.addLayer({
      id: RAIL_STATIONS_LABEL_LAYER_ID,
      type: "symbol",
      source: RAIL_STATIONS_SOURCE_ID,
      minzoom: 10,
      layout: {
        "text-field": ["get", "name"],
        "text-font": ["Noto Sans Regular"],
        "text-size": [
          "interpolate", ["linear"], ["zoom"],
          10, 9,
          14, 11,
          17, 13,
        ],
        "text-offset": [0, 1.2],
        "text-anchor": "top",
        "text-optional": true,
        "text-allow-overlap": false,
        "text-padding": 4,
      },
      paint: {
        "text-color": "#e8f0d9",
        "text-halo-color": "#0a0a0b",
        "text-halo-width": 1.4,
      },
    });
  }
}

function setRailStationsData(map: MLMap, data: GeoJSON.FeatureCollection) {
  const src = map.getSource(RAIL_STATIONS_SOURCE_ID) as unknown as
    | { setData?: (d: GeoJSON.FeatureCollection) => void }
    | undefined;
  if (src?.setData) src.setData(data);
}

// ── Tile-based rail cache ───────────────────────────────────────────────
// Keyed by slippy-map tile coords at a fixed zoom. Each cached tile is a
// 40 km × 30 km Overpass response, so any later pan within an
// already-loaded tile renders instantly from cache.
const RAIL_TILE_ZOOM = 10;
type RailTileData = {
  lines: GeoJSON.Feature<GeoJSON.LineString>[];
  stations: { id: string; name: string; lat: number; lon: number }[];
};
const railTileCache = new Map<string, RailTileData>();
const railTileInFlight = new Set<string>();

function lon2tileX(lon: number, z: number): number {
  return Math.floor(((lon + 180) / 360) * (1 << z));
}
function lat2tileY(lat: number, z: number): number {
  const rad = (lat * Math.PI) / 180;
  return Math.floor(
    ((1 - Math.log(Math.tan(rad) + 1 / Math.cos(rad)) / Math.PI) / 2) *
      (1 << z),
  );
}
function tileX2lon(x: number, z: number): number {
  return (x / (1 << z)) * 360 - 180;
}
function tileY2lat(y: number, z: number): number {
  const n = Math.PI - (2 * Math.PI * y) / (1 << z);
  return (180 / Math.PI) * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
}
function railTileBbox(
  z: number,
  x: number,
  y: number,
): [number, number, number, number] {
  // Overpass order: [south, west, north, east]
  return [
    tileY2lat(y + 1, z),
    tileX2lon(x, z),
    tileY2lat(y, z),
    tileX2lon(x + 1, z),
  ];
}
function tilesForBounds(
  bounds: maplibregl.LngLatBounds,
  z: number,
): { x: number; y: number }[] {
  const xMin = lon2tileX(bounds.getWest(), z);
  const xMax = lon2tileX(bounds.getEast(), z);
  const yMin = lat2tileY(bounds.getNorth(), z);
  const yMax = lat2tileY(bounds.getSouth(), z);
  const out: { x: number; y: number }[] = [];
  for (let x = xMin; x <= xMax; x += 1) {
    for (let y = yMin; y <= yMax; y += 1) {
      out.push({ x, y });
    }
  }
  return out;
}

function removeRailStationsLayer(map: MLMap) {
  if (map.getLayer(RAIL_STATIONS_LABEL_LAYER_ID))
    map.removeLayer(RAIL_STATIONS_LABEL_LAYER_ID);
  if (map.getLayer(RAIL_STATIONS_DOT_LAYER_ID))
    map.removeLayer(RAIL_STATIONS_DOT_LAYER_ID);
  if (map.getLayer(RAIL_STATIONS_HIT_LAYER_ID))
    map.removeLayer(RAIL_STATIONS_HIT_LAYER_ID);
  if (map.getSource(RAIL_STATIONS_SOURCE_ID))
    map.removeSource(RAIL_STATIONS_SOURCE_ID);
}

const GIBS_MAX_ZOOM = 9;

function ensureGibsOverlay(
  map: MLMap,
  sourceId: string,
  layerId: string,
  url: string,
  opacity: number,
  attribution: string,
) {
  if (map.getLayer(layerId)) return;
  if (map.getSource(sourceId)) map.removeSource(sourceId);
  map.addSource(sourceId, {
    type: "raster",
    tiles: [url],
    tileSize: 256,
    maxzoom: GIBS_MAX_ZOOM,
    attribution,
  });
  map.addLayer({
    id: layerId,
    type: "raster",
    source: sourceId,
    maxzoom: GIBS_MAX_ZOOM + 1,
    paint: { "raster-opacity": opacity, "raster-fade-duration": 0 },
  });
}

function updateGibsOverlayOpacity(map: MLMap, layerId: string, opacity: number) {
  if (map.getLayer(layerId)) {
    map.setPaintProperty(layerId, "raster-opacity", opacity);
  }
}

function removeGibsOverlay(map: MLMap, sourceId: string, layerId: string) {
  if (map.getLayer(layerId)) map.removeLayer(layerId);
  if (map.getSource(sourceId)) map.removeSource(sourceId);
}

const FIRES_ATTRIBUTION =
  '<a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noreferrer">NASA GIBS</a> · VIIRS NOAA-20 Thermal Anomalies (375 m, daily, global)';

const NDVI_ATTRIBUTION =
  '<a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noreferrer">NASA GIBS</a> · MODIS Terra NDVI 8-day';

// VIIRS NOAA-20 Thermal Anomalies — daily, global, no key. Replaces the
// old GOES-East/West FireTemp pair which was broken (URL missing TIME
// segment) and limited to the Americas. VIIRS gives daily coverage of
// every fire on the planet, including Europe / Africa / Asia.
const FIRES_MAX_ZOOM = 9;

function firesTileUrl(): string {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_Thermal_Anomalies_375m_All/default/${gibsYesterday()}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`;
}

function ensureFiresLayer(map: MLMap, opacity: number) {
  if (map.getLayer(FIRES_LAYER_ID)) return;
  if (map.getSource(FIRES_SOURCE_ID)) map.removeSource(FIRES_SOURCE_ID);
  map.addSource(FIRES_SOURCE_ID, {
    type: "raster",
    tiles: [firesTileUrl()],
    tileSize: 256,
    maxzoom: FIRES_MAX_ZOOM,
    attribution: FIRES_ATTRIBUTION,
  });
  map.addLayer({
    id: FIRES_LAYER_ID,
    type: "raster",
    source: FIRES_SOURCE_ID,
    paint: { "raster-opacity": opacity, "raster-fade-duration": 0 },
  });
}

function updateFiresOpacity(map: MLMap, opacity: number) {
  if (map.getLayer(FIRES_LAYER_ID)) {
    map.setPaintProperty(FIRES_LAYER_ID, "raster-opacity", opacity);
  }
}

function removeFiresLayer(map: MLMap) {
  if (map.getLayer(FIRES_LAYER_ID)) map.removeLayer(FIRES_LAYER_ID);
  if (map.getSource(FIRES_SOURCE_ID)) map.removeSource(FIRES_SOURCE_ID);
}

function bboxCoordinates(
  bbox: Bbox,
): [[number, number], [number, number], [number, number], [number, number]] {
  const [west, south, east, north] = bbox;
  return [
    [west, north],
    [east, north],
    [east, south],
    [west, south],
  ];
}

function setOverlay(map: MLMap, url: string, bbox: Bbox, opacity: number) {
  const coords = bboxCoordinates(bbox);
  if (map.getLayer(OVERLAY_LAYER_ID)) map.removeLayer(OVERLAY_LAYER_ID);
  if (map.getSource(OVERLAY_SOURCE_ID)) map.removeSource(OVERLAY_SOURCE_ID);

  map.addSource(OVERLAY_SOURCE_ID, { type: "image", url, coordinates: coords });
  map.addLayer({
    id: OVERLAY_LAYER_ID,
    type: "raster",
    source: OVERLAY_SOURCE_ID,
    paint: { "raster-opacity": opacity, "raster-fade-duration": 0 },
  });
}

function removeOverlay(map: MLMap) {
  if (map.getLayer(OVERLAY_LAYER_ID)) map.removeLayer(OVERLAY_LAYER_ID);
  if (map.getSource(OVERLAY_SOURCE_ID)) map.removeSource(OVERLAY_SOURCE_ID);
}

function setSectorOutline(map: MLMap, bbox: Bbox) {
  const [west, south, east, north] = bbox;
  const ring: [number, number][] = [
    [west, south],
    [east, south],
    [east, north],
    [west, north],
    [west, south],
  ];
  const geojson = {
    type: "Feature" as const,
    geometry: { type: "LineString" as const, coordinates: ring },
    properties: {},
  };
  const existing = map.getSource(SECTOR_SOURCE_ID) as unknown as
    | { setData?: (data: unknown) => void }
    | undefined;
  if (existing?.setData) {
    existing.setData(geojson);
    return;
  }
  map.addSource(SECTOR_SOURCE_ID, { type: "geojson", data: geojson });
  map.addLayer({
    id: SECTOR_LAYER_ID,
    type: "line",
    source: SECTOR_SOURCE_ID,
    paint: {
      "line-color": "#ffffff",
      "line-width": 2,
      "line-opacity": 0.9,
    },
  });
}

function removeSectorOutline(map: MLMap) {
  if (map.getLayer(SECTOR_LAYER_ID)) map.removeLayer(SECTOR_LAYER_ID);
  if (map.getSource(SECTOR_SOURCE_ID)) map.removeSource(SECTOR_SOURCE_ID);
}

function buildLiveLocationEl(): {
  root: HTMLDivElement;
  scaler: HTMLDivElement;
  cone: HTMLDivElement;
} {
  const root = document.createElement("div");
  root.className = "live-location-marker";

  const scaler = document.createElement("div");
  scaler.className = "live-location-scaler";

  const pulse = document.createElement("div");
  pulse.className = "live-location-pulse";
  scaler.appendChild(pulse);

  const dot = document.createElement("div");
  dot.className = "live-location-dot";
  scaler.appendChild(dot);

  const cone = document.createElement("div");
  cone.className = "live-location-cone";
  cone.hidden = true;
  const gradId = `lc-grad-${Math.random().toString(36).slice(2, 10)}`;
  cone.innerHTML = `
    <svg width="52" height="56" viewBox="0 0 52 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="${gradId}" x1="26" y1="0" x2="26" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#d4ff38" stop-opacity="0.85"/>
          <stop offset="1" stop-color="#d4ff38" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="M26 0 L52 56 L26 46 L0 56 Z" fill="url(#${gradId})"/>
    </svg>`;
  scaler.appendChild(cone);

  root.appendChild(scaler);

  return { root, scaler, cone };
}

export function LiveMap({ credentials, flyTarget, onOpenSettings }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const geolocateRef = useRef<maplibregl.GeolocateControl | null>(null);
  const projectionControlRef = useRef<ProjectionControl | null>(null);
  const liveMarkerRef = useRef<maplibregl.Marker | null>(null);
  const scalerRef = useRef<HTMLDivElement | null>(null);
  const coneRef = useRef<HTMLDivElement | null>(null);
  const compassUnsubRef = useRef<(() => void) | null>(null);
  const {
    imageBasemapId,
    vectorBasemapId,
    basemapMode,
    basemapVariants,
    projection,
    activeOverlay,
    weatherOpacity,
    railwayOpacity,
    railStyle,
    firesOpacity,
    ndviOpacity,
    setImageBasemapId,
    setVectorBasemapId,
    setBasemapMode,
    setBasemapVariant,
    setProjection,
    setActiveOverlay,
    setWeatherOpacity,
    setRailwayOpacity,
    setRailStyle,
    setFiresOpacity,
    setNdviOpacity,
  } = useSettings();
  const active =
    basemapMode === "vector" ? vectorBasemapId : imageBasemapId;
  const activeVariantId = basemapVariants[active];
  const weatherOn = activeOverlay === "clouds";
  const railwayOn = activeOverlay === "rail";
  const firesOn = activeOverlay === "fires";
  const ndviOn = activeOverlay === "ndvi";
  const [view, setView] = useState<ViewState>({
    center: [6.775, 51.2277],
    zoom: 12,
  });
  const [sector, setSector] = useState<Bbox | null>(null);
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);
  const [snapshotIndex, setSnapshotIndex] = useState<number>(-1);
  const [overlayUrl, setOverlayUrl] = useState<string | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(1);
  const [timelineState, setTimelineState] = useState<TimelineState>({ kind: "idle" });
  const [weatherFrameIndex, setWeatherFrameIndex] = useState(CLOUDS_DAYS_BACK - 1);
  const [weatherPlaying, setWeatherPlaying] = useState(false);
  const [weatherLoading, setWeatherLoading] = useState(false);
  type SidebarPane = "control" | "hiking";
  const [activeSidebar, setActiveSidebar] = useState<SidebarPane | null>(() => {
    if (typeof window === "undefined") return "control";
    return window.matchMedia("(min-width: 768px)").matches ? "control" : null;
  });
  const sidebarOpen = activeSidebar !== null;
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [geoHeading, setGeoHeading] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<MLMap | null>(null);

  useHikingLayers(mapInstance);

  // Long-press anywhere on the map → drop a waypoint at that location.
  useLongPress(mapInstance, true, useCallback((lng: number, lat: number) => {
    useHiking.getState().addWaypoint({
      lat,
      lon: lng,
      label: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
      source: "longpress",
    });
  }, []));

  const toggleSidebar = (pane: SidebarPane) => {
    setActiveSidebar((current) => (current === pane ? null : pane));
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initial = BASEMAPS.find((b) => b.id === active) ?? BASEMAPS[0];
    const initialVariantId = basemapVariants[initial.id];
    const map = new maplibregl.Map({
      container: containerRef.current,
      style:
        initial.kind === "raster"
          ? rasterStyle(initial, initialVariantId)
          : initial.url,
      center: view.center,
      zoom: view.zoom,
      minZoom: 2,
      // 22 lets Esri imagery overzoom past its native z=17 cap; lower-res
      // basemaps (S2 at z=15, GIBS at z=9) also stretch when the user
      // pinches in, instead of clamping at z=18.
      maxZoom: 22,
      attributionControl: { compact: true },
      hash: true,
    });
    mapRef.current = map;
    setMapInstance(map);
    map.once("load", () => map.setProjection({ type: projection }));

    map.addControl(new ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");
    map.addControl(
      new maplibregl.NavigationControl({ showCompass: true, visualizePitch: false }),
      "bottom-left",
    );
    const geolocate = new maplibregl.GeolocateControl({
      trackUserLocation: true,
      showUserLocation: true,
      showAccuracyCircle: true,
      positionOptions: {
        enableHighAccuracy: true,
        timeout: 20_000,
        maximumAge: 0,
      },
      fitBoundsOptions: { maxZoom: 15 },
    });
    map.addControl(geolocate, "bottom-left");
    geolocateRef.current = geolocate;
    map.addControl(new maplibregl.FullscreenControl(), "bottom-left");
    const projectionControl = new ProjectionControl({
      initial: projection,
      onChange: setProjection,
    });
    projectionControlRef.current = projectionControl;
    map.addControl(projectionControl, "bottom-left");

    map.on("moveend", () => {
      const c = map.getCenter();
      setView({ center: [c.lng, c.lat], zoom: map.getZoom() });
    });

    map.on("error", (e) => {
      const msg = e?.error?.message ?? "";
      if (
        msg.includes("Failed to fetch") ||
        msg.includes("AJAXError") ||
        msg.includes("reading 'signal'") ||
        msg.includes("aborted")
      ) {
        return;
      }
      console.warn("[map]", e.error);
    });

    if (process.env.NODE_ENV !== "production") {
      (window as unknown as { __map: MLMap }).__map = map;
    }

    // MapLibre sometimes leaves stale tile-load promises behind after a
    // setStyle swap; the rejected promise tries to read `.signal` off a
    // freed source and surfaces here as an unhandledrejection. They are
    // harmless (the new style has already replaced everything), so we
    // suppress them at the window level just like the in-map error
    // listener above does for the `error` event.
    const onUnhandled = (e: PromiseRejectionEvent) => {
      const reason = e.reason as { message?: string; name?: string } | null;
      const msg = reason?.message ?? "";
      const name = reason?.name ?? "";
      if (
        name === "AbortError" ||
        msg.includes("reading 'signal'") ||
        msg.includes("Failed to fetch") ||
        msg.includes("AJAXError") ||
        msg.includes("aborted")
      ) {
        e.preventDefault();
      }
    };
    window.addEventListener("unhandledrejection", onUnhandled);

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandled);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const basemap = BASEMAPS.find((b) => b.id === active);
    if (!basemap) return;
    applyBasemap(map, basemap, activeVariantId);

    const reapply = () => {
      map.setProjection({ type: projection });
      if (sector) setSectorOutline(map, sector);
      if (overlayUrl && sector) setOverlay(map, overlayUrl, sector, overlayOpacity);
      if (basemapMode === "hybrid") addHybridOverlay(map);
    };
    if (map.isStyleLoaded()) {
      setTimeout(reapply, 0);
    } else {
      map.once("load", reapply);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, activeVariantId]);

  // Toggle the hybrid labels overlay when only the mode changes (no style swap).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      if (basemapMode === "hybrid") addHybridOverlay(map);
      else removeHybridOverlay(map);
    };
    if (map.isStyleLoaded()) apply();
    else map.once("idle", apply);
  }, [basemapMode]);

  useEffect(() => {
    const map = mapRef.current;
    const geo = geolocateRef.current;
    if (!map || !geo) return;

    const applyScale = () => {
      const scaler = scalerRef.current;
      if (!scaler) return;
      const z = map.getZoom();
      // Linear: 0.4x at z6 → 1.0x at z18 (clamped).
      const scale = Math.max(0.4, Math.min(1, 0.4 + (z - 6) * 0.05));
      scaler.style.transform = `scale(${scale})`;
    };

    const ensureMarker = (lng: number, lat: number) => {
      if (!liveMarkerRef.current) {
        const { root, scaler, cone } = buildLiveLocationEl();
        coneRef.current = cone;
        scalerRef.current = scaler;
        liveMarkerRef.current = new maplibregl.Marker({
          element: root,
          anchor: "center",
          rotationAlignment: "map",
        })
          .setLngLat([lng, lat])
          .addTo(map);
        applyScale();
      } else {
        liveMarkerRef.current.setLngLat([lng, lat]);
      }
    };

    map.on("zoom", applyScale);

    let compassStarted = false;

    const startCompassSubscription = async () => {
      if (compassStarted) return;
      compassStarted = true;
      const granted = await requestCompassPermission();
      if (!granted) return;
      let lastRounded = -1;
      const unsub = subscribeCompass((heading, accuracy) => {
        const marker = liveMarkerRef.current;
        const cone = coneRef.current;
        if (!marker || !cone) return;
        marker.setRotation(heading);
        cone.hidden = false;
        const rounded = Math.round(heading);
        if (rounded === lastRounded) return;
        lastRounded = rounded;
        const accStr =
          accuracy === -1
            ? " (uncal)"
            : typeof accuracy === "number" && accuracy >= 0
              ? ` ±${Math.round(accuracy)}°`
              : "";
        setGeoHeading(`${rounded}°${accStr}`);
      });
      compassUnsubRef.current = unsub;
    };

    const onGeolocate = (e: { coords: GeolocationCoordinates }) => {
      ensureMarker(e.coords.longitude, e.coords.latitude);
      setGeoStatus(`Located · ±${Math.round(e.coords.accuracy)}m`);
      if (!compassStarted) void startCompassSubscription();
    };

    const onTrackStart = () => {
      setGeoStatus("Requesting location…");
    };

    const onGeoError = (e: { error?: { message?: string; code?: number }; message?: string }) => {
      const code = e.error?.code;
      if (code === 1) {
        setGeoStatus("Location denied. Allow in browser/iOS settings, then reload.");
      } else if (code === 2) {
        setGeoStatus("Location unavailable. Check signal or try again.");
      } else if (code === 3) {
        setGeoStatus("Location timed out. Tap the button again.");
      } else {
        const msg = e.error?.message ?? e.message ?? "unknown";
        setGeoStatus(`Location error: ${msg}`);
      }
    };

    const onTrackEnd = () => {
      if (liveMarkerRef.current) {
        liveMarkerRef.current.remove();
        liveMarkerRef.current = null;
        coneRef.current = null;
        scalerRef.current = null;
      }
      if (compassUnsubRef.current) {
        compassUnsubRef.current();
        compassUnsubRef.current = null;
      }
      compassStarted = false;
      setGeoStatus(null);
      setGeoHeading(null);
    };

    geo.on("geolocate", onGeolocate);
    geo.on("trackuserlocationstart", onTrackStart);
    geo.on("trackuserlocationend", onTrackEnd);
    geo.on("error", onGeoError);

    const btn = document.querySelector<HTMLButtonElement>(".maplibregl-ctrl-geolocate");
    const onBtnClick = () => {
      setGeoStatus("Requesting location…");
      void startCompassSubscription();
    };
    btn?.addEventListener("click", onBtnClick);

    return () => {
      geo.off("geolocate", onGeolocate);
      geo.off("trackuserlocationstart", onTrackStart);
      geo.off("trackuserlocationend", onTrackEnd);
      geo.off("error", onGeoError);
      map.off("zoom", applyScale);
      btn?.removeEventListener("click", onBtnClick);
      onTrackEnd();
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const apply = () => {
      try {
        map.setProjection({ type: projection });
      } catch {
        // style not yet loaded
      }
      projectionControlRef.current?.setMode(projection);
    };
    apply();
    map.on("style.load", apply);
    return () => {
      map.off("style.load", apply);
    };
  }, [projection]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (map.getLayer(OVERLAY_LAYER_ID)) {
      map.setPaintProperty(OVERLAY_LAYER_ID, "raster-opacity", overlayOpacity);
    }
  }, [overlayOpacity]);

  useEffect(() => {
    if (!weatherOn) {
      const map = mapRef.current;
      if (map) removeWeatherLayer(map);
      setWeatherLoading(false);
    }
  }, [weatherOn]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !weatherOn) return;
    const onSourceData = (e: maplibregl.MapSourceDataEvent) => {
      if (e.sourceId !== WEATHER_SOURCE_ID) return;
      const src = map.getSource(WEATHER_SOURCE_ID);
      if (!src) return;
      setWeatherLoading(!map.isSourceLoaded(WEATHER_SOURCE_ID));
    };
    map.on("sourcedata", onSourceData);
    map.on("sourcedataloading", onSourceData);
    return () => {
      map.off("sourcedata", onSourceData);
      map.off("sourcedataloading", onSourceData);
    };
  }, [weatherOn]);

  interface WeatherFrame {
    time: number;
    date: string;
    urls: string[];
  }

  const weatherFrames: WeatherFrame[] = (() => {
    const all: WeatherFrame[] = [];
    for (let i = CLOUDS_DAYS_BACK; i >= 1; i -= 1) {
      const date = gibsDateNDaysAgo(i);
      all.push({
        time: Date.parse(date) / 1000,
        date,
        urls: CLOUDS_COMPOSITE_LAYERS.map((layer) => gibsTileUrl({ layer, date })),
      });
    }
    return all;
  })();

  useEffect(() => {
    if (!weatherOn || !weatherPlaying || weatherFrames.length === 0) return;
    const id = setInterval(() => {
      setWeatherFrameIndex((i) => (i + 1) % weatherFrames.length);
    }, CLOUDS_ANIM_INTERVAL_MS);
    return () => clearInterval(id);
  }, [weatherOn, weatherPlaying, weatherFrames.length]);

  const currentWeatherUrls = weatherFrames[weatherFrameIndex]?.urls;
  const weatherUrlsKey = currentWeatherUrls?.join("|") ?? "";

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !weatherOn || !currentWeatherUrls) return;
    const apply = () => {
      ensureWeatherLayer(map, currentWeatherUrls, weatherOpacity);
      updateWeatherTiles(map, currentWeatherUrls);
    };
    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("style.load", apply);
    }
    map.on("style.load", apply);
    return () => {
      map.off("style.load", apply);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weatherOn, active, weatherUrlsKey]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !weatherOn) return;
    updateWeatherOpacity(map, weatherOpacity);
  }, [weatherOn, weatherOpacity]);

  // Raster OpenRailwayMap overlay (rail + railStyle === "tiles")
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const tilesActive = railwayOn && railStyle === "tiles";
    if (!tilesActive) {
      removeRailwayLayer(map);
      return;
    }
    const apply = () => ensureRailwayLayer(map, railwayOpacity);
    if (map.isStyleLoaded()) apply();
    else map.once("style.load", apply);
    map.on("style.load", apply);
    return () => {
      map.off("style.load", apply);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [railwayOn, railStyle, active]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !railwayOn || railStyle !== "tiles") return;
    updateRailwayOpacity(map, railwayOpacity);
  }, [railwayOn, railStyle, railwayOpacity]);

  // Combined Overpass effect: fetches rail lines + stations in ONE query and
  // updates both layers. Halves the request rate and avoids the previous
  // race where two parallel fetches both hit Overpass and tripped 429s.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const linesActive = railwayOn && railStyle === "lines";
    if (!linesActive) {
      removeRailLinesLayer(map);
      removeRailStationsLayer(map);
      return;
    }

    let cancelled = false;
    let renderRaf = 0;

    const renderFromCache = () => {
      if (cancelled) return;
      if (renderRaf) cancelAnimationFrame(renderRaf);
      renderRaf = requestAnimationFrame(() => {
        if (cancelled) return;
        const z = map.getZoom();
        if (z < RAIL_LINES_MIN_ZOOM) {
          setRailLinesData(map, { type: "FeatureCollection", features: [] });
          setRailStationsData(map, { type: "FeatureCollection", features: [] });
          return;
        }
        const tiles = tilesForBounds(map.getBounds(), RAIL_TILE_ZOOM);
        const lineFeatures: GeoJSON.Feature<GeoJSON.LineString>[] = [];
        const lineSeen = new Set<string | number>();
        const stationFeatures: GeoJSON.Feature[] = [];
        const stationSeen = new Set<string>();
        for (const t of tiles) {
          const data = railTileCache.get(`${t.x}/${t.y}`);
          if (!data) continue;
          for (const f of data.lines) {
            const id = f.properties?.id as string | number | undefined;
            if (id != null) {
              if (lineSeen.has(id)) continue;
              lineSeen.add(id);
            }
            lineFeatures.push(f);
          }
          for (const s of data.stations) {
            if (stationSeen.has(s.id)) continue;
            stationSeen.add(s.id);
            stationFeatures.push({
              type: "Feature",
              geometry: { type: "Point", coordinates: [s.lon, s.lat] },
              properties: { id: s.id, name: s.name },
            });
          }
        }
        setRailLinesData(map, {
          type: "FeatureCollection",
          features: lineFeatures,
        });
        setRailStationsData(map, {
          type: "FeatureCollection",
          features: z >= RAIL_STATIONS_MIN_ZOOM ? stationFeatures : [],
        });
      });
    };

    const fetchMissingTiles = () => {
      if (cancelled) return;
      if (map.getZoom() < RAIL_LINES_MIN_ZOOM) return;
      const tiles = tilesForBounds(map.getBounds(), RAIL_TILE_ZOOM);
      // Cap parallel fetches to avoid hitting Overpass rate limits.
      const toFetch = tiles.filter((t) => {
        const key = `${t.x}/${t.y}`;
        return !railTileCache.has(key) && !railTileInFlight.has(key);
      });
      const MAX_PARALLEL = 4;
      for (const t of toFetch.slice(0, MAX_PARALLEL)) {
        const key = `${t.x}/${t.y}`;
        railTileInFlight.add(key);
        const ctrl = new AbortController();
        const bbox = railTileBbox(RAIL_TILE_ZOOM, t.x, t.y);
        fetchRailNetwork(bbox, ctrl.signal)
          .then(({ lines, stations }) => {
            railTileCache.set(key, { lines: lines.features, stations });
            railTileInFlight.delete(key);
            renderFromCache();
            // After this tile finishes, kick off any remaining missing tiles
            // (we capped parallelism above).
            fetchMissingTiles();
          })
          .catch((err) => {
            railTileInFlight.delete(key);
            if ((err as Error).name === "AbortError") return;
            const msg = (err as Error).message ?? "";
            if (!msg.includes("429")) console.warn("[rail-network]", err);
            // Retry-on-pan; do not poison cache.
          });
      }
    };

    const onMoveEnd = () => {
      // Render immediately from whatever's cached; missing tiles fetch
      // asynchronously in the background and re-render on completion.
      renderFromCache();
      fetchMissingTiles();
    };

    const apply = () => {
      ensureRailLinesLayer(map, railwayOpacity);
      ensureRailStationsLayer(map);
      renderFromCache();
      fetchMissingTiles();
    };

    const onClick = (e: maplibregl.MapMouseEvent) => {
      const feats = map.queryRenderedFeatures(e.point, {
        layers: [RAIL_STATIONS_HIT_LAYER_ID, RAIL_STATIONS_DOT_LAYER_ID],
      });
      if (feats.length === 0) return;
      const f = feats[0];
      const coords = (f.geometry as GeoJSON.Point).coordinates as [number, number];
      const name = (f.properties?.name as string | undefined) ?? "Station";
      e.preventDefault();
      e.originalEvent?.stopPropagation();
      useHiking.getState().addWaypoint({
        lat: coords[1],
        lon: coords[0],
        label: name,
        source: "station",
      });
    };
    const onEnter = () => {
      map.getCanvas().style.cursor = "pointer";
    };
    const onLeave = () => {
      map.getCanvas().style.cursor = "";
    };

    if (map.isStyleLoaded()) apply();
    else map.once("style.load", apply);
    map.on("style.load", apply);
    map.on("moveend", onMoveEnd);
    map.on("click", RAIL_STATIONS_HIT_LAYER_ID, onClick);
    map.on("mouseenter", RAIL_STATIONS_HIT_LAYER_ID, onEnter);
    map.on("mouseleave", RAIL_STATIONS_HIT_LAYER_ID, onLeave);

    return () => {
      cancelled = true;
      if (renderRaf) cancelAnimationFrame(renderRaf);
      map.off("style.load", apply);
      map.off("moveend", onMoveEnd);
      map.off("click", RAIL_STATIONS_HIT_LAYER_ID, onClick);
      map.off("mouseenter", RAIL_STATIONS_HIT_LAYER_ID, onEnter);
      map.off("mouseleave", RAIL_STATIONS_HIT_LAYER_ID, onLeave);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [railwayOn, railStyle, active]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !railwayOn || railStyle !== "lines") return;
    updateRailLinesOpacity(map, railwayOpacity);
  }, [railwayOn, railStyle, railwayOpacity]);

  useEffect(() => {
    if (!firesOn) {
      const map = mapRef.current;
      if (map) removeFiresLayer(map);
    }
  }, [firesOn]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !firesOn) return;
    const apply = () => ensureFiresLayer(map, firesOpacity);
    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("style.load", apply);
    }
    map.on("style.load", apply);
    return () => {
      map.off("style.load", apply);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firesOn, active]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !firesOn) return;
    updateFiresOpacity(map, firesOpacity);
  }, [firesOn, firesOpacity]);

  useEffect(() => {
    if (!ndviOn) {
      const map = mapRef.current;
      if (map) removeGibsOverlay(map, NDVI_SOURCE_ID, NDVI_LAYER_ID);
    }
  }, [ndviOn]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ndviOn) return;
    const url = gibsTileUrl({
      layer: "MODIS_Terra_NDVI_8Day",
      date: gibsDateNDaysAgo(10),
      format: "png",
    });
    const apply = () =>
      ensureGibsOverlay(map, NDVI_SOURCE_ID, NDVI_LAYER_ID, url, ndviOpacity, NDVI_ATTRIBUTION);
    if (map.isStyleLoaded()) {
      apply();
    } else {
      map.once("style.load", apply);
    }
    map.on("style.load", apply);
    return () => {
      map.off("style.load", apply);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ndviOn, active]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !ndviOn) return;
    updateGibsOverlayOpacity(map, NDVI_LAYER_ID, ndviOpacity);
  }, [ndviOn, ndviOpacity]);

  useEffect(() => {
    if (!sidebarOpen) return;
    const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
    if (!isMobile) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveSidebar(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sidebarOpen]);

  const loadSnapshot = useCallback(
    async (lockedBbox: Bbox, snapshot: Snapshot) => {
      const map = mapRef.current;
      if (!map || !credentials) return;
      setTimelineState({ kind: "loading" });
      try {
        const token = await getAccessToken(credentials);
        const result = await fetchDayOverlay({
          bbox: lockedBbox,
          accessToken: token,
          date: snapshot.datetime,
          maxPixelsPerSide: 2048,
        });
        const url = URL.createObjectURL(result.blob);
        setOverlayUrl((prev) => {
          if (prev) URL.revokeObjectURL(prev);
          return url;
        });
        setOverlay(map, url, lockedBbox, overlayOpacity);
        setTimelineState({ kind: "ready" });
      } catch (err) {
        setTimelineState({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    },
    [credentials, overlayOpacity],
  );

  const handleStartTimeline = useCallback(async () => {
    const map = mapRef.current;
    if (!map || !credentials) return;
    if (map.getZoom() < MIN_FETCH_ZOOM) {
      setTimelineState({
        kind: "error",
        message: `Zoom in to at least z${MIN_FETCH_ZOOM} first`,
      });
      return;
    }
    setTimelineState({ kind: "searching" });
    try {
      const bounds = map.getBounds();
      const bbox: Bbox = [
        bounds.getWest(),
        bounds.getSouth(),
        bounds.getEast(),
        bounds.getNorth(),
      ];
      const token = await getAccessToken(credentials);
      const now = new Date();
      const from = new Date(
        now.getTime() - TIMELINE_DAYS_BACK * 24 * 60 * 60 * 1000,
      );
      const found = await searchCatalog({
        bbox,
        from: from.toISOString(),
        to: now.toISOString(),
        accessToken: token,
        maxCloudCover: 60,
        limit: 100,
      });
      if (found.length === 0) {
        setTimelineState({
          kind: "error",
          message: "No snapshots found in the last 12 months for this sector",
        });
        return;
      }
      setSector(bbox);
      setSnapshots(found);
      setSnapshotIndex(found.length - 1);
      setSectorOutline(map, bbox);
      await loadSnapshot(bbox, found[found.length - 1]);
    } catch (err) {
      setTimelineState({
        kind: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }, [credentials, loadSnapshot]);

  function handleSelectSnapshot(index: number) {
    if (!sector || !snapshots[index]) return;
    setSnapshotIndex(index);
    loadSnapshot(sector, snapshots[index]);
  }

  function handleClearTimeline() {
    const map = mapRef.current;
    if (map) {
      removeOverlay(map);
      removeSectorOutline(map);
    }
    setOverlayUrl((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setSector(null);
    setSnapshots([]);
    setSnapshotIndex(-1);
    setTimelineState({ kind: "idle" });
  }

  useEffect(() => {
    if (!flyTarget) return;
    const map = mapRef.current;
    if (!map) return;
    if (flyTarget.extent) {
      const [west, north, east, south] = flyTarget.extent;
      map.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        { padding: 60, duration: 900, maxZoom: 15 },
      );
    } else {
      const cat = flyTarget.category;
      let zoom = 14;
      if (cat === "city" || cat === "town") zoom = 12;
      else if (cat === "village" || cat === "suburb") zoom = 13;
      else if (cat === "country") zoom = 5;
      else if (cat === "state" || cat === "region") zoom = 7;
      else if (cat === "house" || cat === "building") zoom = 17;
      map.flyTo({ center: flyTarget.coordinates, zoom, duration: 900 });
    }
  }, [flyTarget]);


  const overlayOpacityForActive =
    activeOverlay === "clouds"
      ? weatherOpacity
      : activeOverlay === "rail"
        ? railwayOpacity
        : activeOverlay === "fires"
          ? firesOpacity
          : activeOverlay === "ndvi"
            ? ndviOpacity
            : 1;

  const setOverlayOpacityForActive = (o: number) => {
    if (activeOverlay === "clouds") setWeatherOpacity(o);
    else if (activeOverlay === "rail") setRailwayOpacity(o);
    else if (activeOverlay === "fires") setFiresOpacity(o);
    else if (activeOverlay === "ndvi") setNdviOpacity(o);
  };

  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {/* image / hybrid / vector basemap switch (top-left of map) */}
      <BasemapSwitch mode={basemapMode} onModeChange={setBasemapMode} />

      {/* geolocate status banner (diagnostic — bottom center, above scale) */}
      {(geoStatus || geoHeading) && (
        <div className="pointer-events-auto absolute bottom-3 left-1/2 z-10 -translate-x-1/2">
          <div className="hud-panel flex items-center gap-2 px-3 py-1.5 text-[11px] text-[color:var(--hud-text)]">
            <span className="hud-corner-tr" aria-hidden />
            <span className="hud-corner-br" aria-hidden />
            {geoStatus && <span className="hud-mono">{geoStatus}</span>}
            {geoHeading && (
              <span className="hud-mono text-[color:var(--hud-accent)]">
                · {geoHeading}
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                setGeoStatus(null);
                setGeoHeading(null);
              }}
              aria-label="Dismiss"
              className="text-[color:var(--hud-text-muted)] hover:text-[color:var(--hud-accent)]"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {/* mobile tap-to-close layer (fully transparent; no blur/darken) */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[5] md:hidden"
          onClick={() => setActiveSidebar(null)}
          aria-hidden
        />
      )}

      {/* Full-height sidebar with attached handles */}
      <aside
        className={`absolute right-0 top-0 bottom-0 z-10 flex w-full max-w-[340px] transition-transform duration-200 ease-out ${
          sidebarOpen
            ? "translate-x-0"
            : "translate-x-[calc(100%-34px)]"
        }`}
      >
        {/* stacked handle column (hangs on the sidebar's left edge) */}
        <div className="flex shrink-0 flex-col items-start gap-2 pt-4">
          <SidebarToggle
            open={activeSidebar === "control"}
            onToggle={() => toggleSidebar("control")}
          />
          <HikingToggle
            open={activeSidebar === "hiking"}
            onToggle={() => toggleSidebar("hiking")}
          />
        </div>

        {/* panel body */}
        <div
          className="hud-sidebar hud-scanlines flex min-w-0 flex-1 flex-col"
          aria-hidden={!sidebarOpen}
        >
          <div className="flex items-center justify-between border-b border-[color:var(--hud-border)] px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="inline-block h-2 w-2 rounded-full bg-[color:var(--hud-accent)] shadow-[0_0_6px_var(--hud-accent-glow)]" />
              <span className="hud-label">
                {activeSidebar === "hiking" ? "Hiking" : "Control Deck"}
              </span>
            </div>
            <span className="hud-mono text-[10px] text-[color:var(--hud-text-muted)]">
              BIOSPHERE · v1
            </span>
          </div>

          <div className="flex-1 overflow-y-auto overscroll-contain px-3 py-3 pb-[max(env(safe-area-inset-bottom,0px),12px)] flex flex-col gap-3">
            {activeSidebar === "hiking" ? (
              <HikingPanel mapRef={mapRef} />
            ) : (
              <>
                <HudPanel className="hud-mono">
                  <span className="text-[11px] text-[color:var(--hud-text)]">
                    {view.center[1].toFixed(4)}°, {view.center[0].toFixed(4)}° · z
                    {view.zoom.toFixed(1)}
                  </span>
                </HudPanel>

                <BasemapPanel
                  imageId={imageBasemapId}
                  vectorId={vectorBasemapId}
                  mode={basemapMode}
                  variants={basemapVariants}
                  onSelectImage={(id) => {
                    setImageBasemapId(id);
                    if (basemapMode === "vector") setBasemapMode("photo");
                  }}
                  onSelectVector={(id) => {
                    setVectorBasemapId(id);
                    if (basemapMode !== "vector") setBasemapMode("vector");
                  }}
                  onSelectVariant={setBasemapVariant}
                />

                <OverlayPanel
                  active={activeOverlay}
                  onChange={setActiveOverlay}
                  opacity={overlayOpacityForActive}
                  onOpacityChange={setOverlayOpacityForActive}
                  railStyle={railStyle}
                  onRailStyleChange={setRailStyle}
                  weatherProps={{
                    frames: weatherFrames,
                    frameIndex: weatherFrameIndex,
                    onFrameIndex: setWeatherFrameIndex,
                    isPlaying: weatherPlaying,
                    onPlayingChange: setWeatherPlaying,
                    loading: weatherLoading,
                  }}
                />

                <TimelinePanel
                  credentials={credentials !== null}
                  zoomOk={view.zoom >= MIN_FETCH_ZOOM}
                  minZoom={MIN_FETCH_ZOOM}
                  state={timelineState}
                  sector={sector}
                  snapshots={snapshots}
                  snapshotIndex={snapshotIndex}
                  onStart={handleStartTimeline}
                  onSelect={handleSelectSnapshot}
                  onClear={handleClearTimeline}
                  opacity={overlayOpacity}
                  onOpacityChange={setOverlayOpacity}
                />
              </>
            )}
          </div>

          {onOpenSettings && (
            <div className="flex items-center justify-between border-t border-[color:var(--hud-border)] px-3 py-2">
              <span className="hud-label">Credentials</span>
              <SettingsGear onOpen={onOpenSettings} />
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}

interface BasemapPanelProps {
  imageId: string;
  vectorId: string;
  mode: BasemapMode;
  variants: Record<string, string>;
  onSelectImage: (id: string) => void;
  onSelectVector: (id: string) => void;
  onSelectVariant: (basemapId: string, variantId: string) => void;
}

function BasemapPanel({
  imageId,
  vectorId,
  mode,
  variants,
  onSelectImage,
  onSelectVector,
  onSelectVariant,
}: BasemapPanelProps) {
  const imageMaps = BASEMAPS.filter((b) => b.category === "photo");
  const vectorMaps = BASEMAPS.filter((b) => b.category === "vector");

  const renderGroup = (
    label: string,
    items: Basemap[],
    selectedId: string,
    isLive: boolean,
    onSelect: (id: string) => void,
    fallbackId: string,
  ) => {
    const effectiveId = items.some((b) => b.id === selectedId)
      ? selectedId
      : fallbackId;
    return (
      <div className="flex flex-col gap-1">
        <div className="hud-section-heading">
          <span className="hud-label text-[9px]">{label}</span>
          {isLive && (
            <span
              className="hud-label text-[9px] text-[color:var(--hud-accent)]"
              aria-label="currently displayed"
            >
              · LIVE
            </span>
          )}
          <span className="line" aria-hidden />
        </div>
        <div className="flex flex-col gap-0.5">
          {items.map((b) => {
            const selected = effectiveId === b.id;
            const variant = getActiveVariant(b, variants[b.id]);
            const subtitle = resolveBasemapSubtitle(b, variants[b.id]);
            return (
              <div key={b.id} className="flex flex-col">
                <button
                  type="button"
                  onClick={() => onSelect(b.id)}
                  data-active={selected}
                  data-live={selected && isLive}
                  className="hud-basemap-btn flex flex-col items-stretch"
                  aria-pressed={selected}
                >
                  <span className="leading-tight">
                    {variant ? `${b.label} · ${variant.label}` : b.label}
                  </span>
                  {subtitle && (
                    <span className="hud-basemap-btn-subtitle">
                      {subtitle}
                    </span>
                  )}
                </button>
                {selected && b.variants && (
                  <VariantChips
                    basemap={b}
                    selectedId={variant?.id ?? b.variants.defaultId}
                    onSelect={(vid) => onSelectVariant(b.id, vid)}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <HudPanel label="Basemap">
      <div className="flex flex-col gap-2.5">
        {renderGroup(
          "Image Maps",
          imageMaps,
          imageId,
          mode === "photo" || mode === "hybrid",
          onSelectImage,
          DEFAULT_IMAGE_BASEMAP_ID,
        )}
        {renderGroup(
          "Vector Maps",
          vectorMaps,
          vectorId,
          mode === "vector",
          onSelectVector,
          DEFAULT_VECTOR_BASEMAP_ID,
        )}
      </div>
    </HudPanel>
  );
}

function VariantChips({
  basemap,
  selectedId,
  onSelect,
}: {
  basemap: Basemap;
  selectedId: string;
  onSelect: (variantId: string) => void;
}) {
  if (!basemap.variants) return null;
  return (
    <div
      className="hud-variant-chips no-scrollbar"
      role="radiogroup"
      aria-label={`${basemap.label} variants`}
    >
      {basemap.variants.options.map((v) => {
        const active = v.id === selectedId;
        return (
          <button
            key={v.id}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onSelect(v.id)}
            data-active={active}
            className="hud-variant-chip"
          >
            {v.label}
          </button>
        );
      })}
    </div>
  );
}

interface BasemapSwitchProps {
  mode: BasemapMode;
  onModeChange: (mode: BasemapMode) => void;
}

const SEGMENTS: { key: BasemapMode; label: string; icon: ReactNode }[] = [
  {
    key: "photo",
    label: "Image",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <rect x="3" y="5" width="18" height="14" rx="1.5" />
        <circle cx="8.5" cy="10" r="1.4" />
        <path d="M3 17 L9 12 L13 16 L17 12 L21 17" />
      </svg>
    ),
  },
  {
    key: "hybrid",
    label: "Hybrid",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M12 3 L21 8 L12 13 L3 8 Z" />
        <path d="M3 14 L12 19 L21 14" />
      </svg>
    ),
  },
  {
    key: "vector",
    label: "Vector",
    icon: (
      <svg
        width="16"
        height="16"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M9 4 L3 6 V20 L9 18 L15 20 L21 18 V4 L15 6 Z" />
        <line x1="9" y1="4" x2="9" y2="18" />
        <line x1="15" y1="6" x2="15" y2="20" />
      </svg>
    ),
  },
];

function BasemapSwitch({ mode, onModeChange }: BasemapSwitchProps) {
  return (
    <div className="pointer-events-auto absolute left-3 top-3 z-10">
      <div
        className="hud-basemap-switch"
        role="group"
        aria-label="Basemap mode"
      >
        {SEGMENTS.map((s) => (
          <button
            key={s.key}
            type="button"
            onClick={() => onModeChange(s.key)}
            data-active={mode === s.key}
            className="hud-basemap-switch-btn"
            aria-pressed={mode === s.key}
            aria-label={s.label}
            title={s.label}
          >
            {s.icon}
          </button>
        ))}
      </div>
    </div>
  );
}

interface OverlayPanelProps {
  active: OverlayKind | null;
  onChange: (k: OverlayKind | null) => void;
  opacity: number;
  onOpacityChange: (o: number) => void;
  railStyle: "tiles" | "lines";
  onRailStyleChange: (s: "tiles" | "lines") => void;
  weatherProps: {
    frames: { time: number; date: string; urls: string[] }[];
    frameIndex: number;
    onFrameIndex: (i: number) => void;
    isPlaying: boolean;
    onPlayingChange: (p: boolean) => void;
    loading: boolean;
  };
}

function OverlayPanel({
  active,
  onChange,
  opacity,
  onOpacityChange,
  railStyle,
  onRailStyleChange,
  weatherProps,
}: OverlayPanelProps) {
  const tabs: { key: OverlayKind | null; label: string }[] = [
    { key: null, label: "Off" },
    { key: "clouds", label: "Clouds" },
    { key: "rail", label: "Rail" },
    { key: "fires", label: "Fires" },
    { key: "ndvi", label: "NDVI" },
  ];

  const caption =
    active === "clouds"
      ? "NASA GIBS · VIIRS SNPP true-color · daily"
      : active === "rail"
        ? railStyle === "lines"
          ? "OSM rail lines · Overpass · no labels"
          : "OpenRailwayMap raster · OSM"
        : active === "fires"
          ? "GOES-East/West · 10 min · Americas + Pacific"
          : active === "ndvi"
            ? "MODIS Terra · 8-day · 1km"
            : null;

  const f = weatherProps;
  const currentFrame = f.frames[f.frameIndex];

  return (
    <HudPanel label="Overlay">
      <div className="flex flex-col gap-2">
        <div className="hud-tab-row">
          {tabs.map((t) => (
            <button
              key={String(t.key)}
              type="button"
              data-active={active === t.key}
              className="hud-tab"
              onClick={() => onChange(t.key)}
            >
              {t.label}
            </button>
          ))}
        </div>

        {active === "rail" && (
          <div className="flex items-center gap-2">
            <span className="hud-label text-[9px]">Style</span>
            <div
              className="hud-tab-row flex-1"
              style={{ gridTemplateColumns: "repeat(2, minmax(0, 1fr))" }}
            >
              <button
                type="button"
                className="hud-tab"
                data-active={railStyle === "lines"}
                onClick={() => onRailStyleChange("lines")}
              >
                Lines
              </button>
              <button
                type="button"
                className="hud-tab"
                data-active={railStyle === "tiles"}
                onClick={() => onRailStyleChange("tiles")}
              >
                ORM · tiles
              </button>
            </div>
          </div>
        )}

        {active === "clouds" && f.frames.length > 0 && currentFrame && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => f.onPlayingChange(!f.isPlaying)}
                className="hud-btn-ghost"
                aria-label={f.isPlaying ? "Pause" : "Play"}
              >
                {f.isPlaying ? (
                  <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="currentColor">
                    <rect x="1.5" y="1" width="2" height="8" />
                    <rect x="6.5" y="1" width="2" height="8" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 10 10" className="h-2.5 w-2.5" fill="currentColor">
                    <path d="M2 1 L9 5 L2 9 Z" />
                  </svg>
                )}
              </button>
              <input
                type="range"
                min={0}
                max={f.frames.length - 1}
                step={1}
                value={f.frameIndex}
                onChange={(e) => {
                  f.onPlayingChange(false);
                  f.onFrameIndex(Number(e.target.value));
                }}
                className="hud-slider flex-1"
                style={{
                  ["--hud-fill" as string]: `${Math.round((f.frameIndex / Math.max(1, f.frames.length - 1)) * 100)}%`,
                }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-[color:var(--hud-text-muted)]">
                {new Date(currentFrame.time * 1000).toLocaleDateString([], {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
              <span className="text-[color:var(--hud-text-muted)]">
                {f.frameIndex + 1}/{f.frames.length}
                {f.loading && " · loading…"}
              </span>
            </div>
          </div>
        )}

        {active !== null && (
          <>
            <div className="flex items-center gap-2">
              <span className="hud-label text-[9px]">Opacity</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(e) => onOpacityChange(Number(e.target.value))}
                className="hud-slider flex-1"
                style={{ ["--hud-fill" as string]: `${Math.round(opacity * 100)}%` }}
              />
              <span className="hud-mono w-8 text-right text-[10px] text-[color:var(--hud-text-muted)]">
                {Math.round(opacity * 100)}%
              </span>
            </div>
            {caption && (
              <div className="text-[10px] text-[color:var(--hud-text-muted)]">{caption}</div>
            )}
          </>
        )}
      </div>
    </HudPanel>
  );
}

interface TimelinePanelProps {
  credentials: boolean;
  zoomOk: boolean;
  minZoom: number;
  state: TimelineState;
  sector: Bbox | null;
  snapshots: Snapshot[];
  snapshotIndex: number;
  onStart: () => void;
  onSelect: (index: number) => void;
  onClear: () => void;
  opacity: number;
  onOpacityChange: (o: number) => void;
}

function TimelinePanel({
  credentials,
  zoomOk,
  minZoom,
  state,
  sector,
  snapshots,
  snapshotIndex,
  onStart,
  onSelect,
  onClear,
  opacity,
  onOpacityChange,
}: TimelinePanelProps) {
  const active = sector !== null && snapshots.length > 0;
  const current = snapshotIndex >= 0 ? snapshots[snapshotIndex] : null;

  function handlePrev() {
    if (snapshotIndex > 0) onSelect(snapshotIndex - 1);
  }

  function handleNext() {
    if (snapshotIndex < snapshots.length - 1) onSelect(snapshotIndex + 1);
  }

  return (
    <HudPanel label="Timeline">
      <div className="flex flex-col items-stretch gap-2">
      <div className="flex items-center justify-between">
        {state.kind === "searching" || state.kind === "loading" ? (
          <span
            className="inline-block h-2 w-2 animate-pulse rounded-full bg-[color:var(--hud-accent)] shadow-[0_0_6px_var(--hud-accent-glow)]"
            aria-label="Loading"
          />
        ) : (
          <span />
        )}
        {active && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] uppercase tracking-wider text-[color:var(--hud-text-muted)] hover:text-[color:var(--hud-accent)]"
          >
            clear
          </button>
        )}
      </div>

      {!active && (
        <button
          type="button"
          onClick={onStart}
          disabled={!credentials || !zoomOk || state.kind === "searching"}
          className="hud-btn-primary"
        >
          {state.kind === "searching" ? "Searching…" : "Start for this view"}
        </button>
      )}

      {!credentials && (
        <p className="max-w-[260px] text-[11px] text-[color:var(--hud-text-muted)]">
          Add credentials below to load snapshots.
        </p>
      )}
      {credentials && !zoomOk && !active && (
        <p className="max-w-[260px] text-[11px] text-[color:var(--hud-warn)]">
          Zoom in to z{minZoom} or closer first
        </p>
      )}
      {state.kind === "error" && (
        <p className="max-w-[260px] break-words text-[11px] text-[color:var(--hud-danger)]">
          {state.message}
        </p>
      )}

      {active && current && (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrev}
              disabled={snapshotIndex <= 0}
              className="hud-btn-ghost"
              aria-label="Previous snapshot"
            >
              ‹
            </button>
            <div className="flex-1 text-center">
              <div className="hud-mono text-[11px] text-[color:var(--hud-text)]">
                {new Date(current.datetime).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="text-[10px] text-[color:var(--hud-text-muted)]">
                {current.cloudCover != null
                  ? `${current.cloudCover.toFixed(0)}% cloud`
                  : "cloud: —"}
                {" · "}
                {snapshotIndex + 1}/{snapshots.length}
              </div>
            </div>
            <button
              type="button"
              onClick={handleNext}
              disabled={snapshotIndex >= snapshots.length - 1}
              className="hud-btn-ghost"
              aria-label="Next snapshot"
            >
              ›
            </button>
          </div>

          <SnapshotCalendar
            snapshots={snapshots}
            activeIndex={snapshotIndex}
            onSelect={onSelect}
          />

          <div className="flex items-center gap-2">
            <span className="hud-label text-[9px]">Opacity</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => onOpacityChange(Number(e.target.value))}
              className="hud-slider flex-1"
              style={{ ["--hud-fill" as string]: `${Math.round(opacity * 100)}%` }}
            />
            <span className="hud-mono w-8 text-right text-[10px] text-[color:var(--hud-text-muted)]">
              {Math.round(opacity * 100)}%
            </span>
          </div>
        </>
      )}
      </div>
    </HudPanel>
  );
}

interface SnapshotCalendarProps {
  snapshots: Snapshot[];
  activeIndex: number;
  onSelect: (index: number) => void;
}

function SnapshotCalendar({ snapshots, activeIndex, onSelect }: SnapshotCalendarProps) {
  const now = new Date();
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
  );
  const start = new Date(end.getTime() - 364 * 24 * 60 * 60 * 1000);

  if (snapshots.length > 0) {
    const earliest = new Date(snapshots[0].datetime);
    earliest.setUTCHours(0, 0, 0, 0);
    if (earliest.getTime() < start.getTime()) start.setTime(earliest.getTime());
  }

  const spanMs = Math.max(1, end.getTime() - start.getTime());

  const monthTicks: { pct: number; label: string }[] = [];
  const monthNames = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  const cursor = new Date(
    Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1),
  );
  while (cursor.getTime() <= end.getTime()) {
    if (cursor.getTime() >= start.getTime()) {
      monthTicks.push({
        pct: ((cursor.getTime() - start.getTime()) / spanMs) * 100,
        label: monthNames[cursor.getUTCMonth()],
      });
    }
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
  }

  function dotColor(cc: number | null, isActive: boolean) {
    if (isActive)
      return "bg-[color:var(--hud-accent)] ring-1 ring-[color:var(--hud-accent)] shadow-[0_0_6px_var(--hud-accent-glow)]";
    if (cc == null) return "bg-[color:var(--hud-accent)]/70";
    if (cc < 10) return "bg-emerald-400";
    if (cc < 30) return "bg-emerald-500/90";
    if (cc < 60) return "bg-amber-400";
    return "bg-neutral-500";
  }

  return (
    <div className="flex flex-col gap-1 pt-1">
      <div className="relative h-3 text-[9px] text-neutral-500">
        {monthTicks.map((m, i) => (
          <span
            key={i}
            className="absolute top-0 -translate-x-1/2"
            style={{ left: `${m.pct}%` }}
          >
            {m.label}
          </span>
        ))}
      </div>

      <div className="relative h-4 rounded-full bg-neutral-800/60">
        {monthTicks.map((m, i) => (
          <span
            key={`t-${i}`}
            className="absolute top-0 bottom-0 w-px bg-neutral-700"
            style={{ left: `${m.pct}%` }}
            aria-hidden
          />
        ))}
        {snapshots.map((s, i) => {
          const t = Date.parse(s.datetime);
          const pct = ((t - start.getTime()) / spanMs) * 100;
          const isActive = i === activeIndex;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelect(i)}
              title={`${s.datetime.slice(0, 10)}${
                s.cloudCover != null ? ` · ${s.cloudCover.toFixed(0)}% cloud` : ""
              }`}
              aria-label={`Snapshot ${s.datetime.slice(0, 10)}`}
              className={`absolute top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform hover:scale-125 ${dotColor(
                s.cloudCover,
                isActive,
              )} ${isActive ? "z-10 scale-125" : ""}`}
              style={{ left: `${pct}%` }}
            />
          );
        })}
      </div>

      <div className="flex items-center gap-2 text-[9px] text-neutral-500">
        <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" /> clear
        <span className="inline-block h-2 w-2 rounded-full bg-amber-400" /> partly
        <span className="inline-block h-2 w-2 rounded-full bg-neutral-500" /> cloudy
      </div>
    </div>
  );
}
