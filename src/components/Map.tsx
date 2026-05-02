"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { SearchBox } from "./SearchBox";
import type { GeocodeResult } from "@/lib/geocode";
import {
  gibsDateNDaysAgo,
  gibsTileUrl,
  gibsYesterday,
} from "@/lib/gibs";
import { RAILWAY_TILE_URLS, RAILWAY_ATTRIBUTION, RAILWAY_MAX_ZOOM } from "@/lib/railway";
import { fetchRailNetwork } from "@/lib/hiking/overpass";
import {
  railTileGet,
  railTilePurgeExpired,
  railTileSet,
} from "@/lib/hiking/railTileStore";
import { useHiking } from "@/lib/hiking/store";
import { useLongPress } from "./hiking/useLongPress";
import { requestCompassPermission, subscribeCompass } from "@/lib/compass";
import { ProjectionControl } from "./ProjectionControl";
import { HudPanel } from "./hud/HudPanel";
import { SidebarToggle } from "./SidebarToggle";
import { HikingToggle } from "./HikingToggle";
import { HikingPanel } from "./hud/HikingPanel";
import { useHikingLayers } from "./hiking/useHikingLayers";

// Live precipitation (NASA GPM IMERG). Frames are 30-min apart with
// a ~4 h delivery lag; we probe to find the actual youngest available
// frame and animate 13 frames (~6 h history) ending there.
const CLOUDS_ANIM_INTERVAL_MS = 500;
const CLOUDS_REFRESH_MS = 5 * 60 * 1000;

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
  onOpenSettings?: () => void;
}

function rasterStyle(basemap: Basemap, variantId?: string, dayOffset?: number) {
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
        tiles: [resolveBasemapUrl(basemap, variantId, dayOffset)],
        tileSize: basemap.tileSize ?? 256,
        attribution: basemap.attribution,
        maxzoom: basemap.maxzoom ?? 18,
      },
    },
    layers: [{ id: "base", type: "raster" as const, source: "base" }],
  };
}

function applyBasemap(
  map: MLMap,
  basemap: Basemap,
  variantId?: string,
  dayOffset?: number,
) {
  if (basemap.kind === "raster") {
    map.setStyle(rasterStyle(basemap, variantId, dayOffset));
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

// NASA GIBS IMERG global precipitation tile matrix
// `GoogleMapsCompatible_Level6` covers z 0-6. MapLibre overzooms past
// z=6 to keep the layer visible higher.
const WEATHER_MAXZOOM = 6;
const WEATHER_TILE_SIZE = 256;

function ensureWeatherLayer(map: MLMap, urls: string[], opacity: number) {
  if (map.getLayer(WEATHER_LAYER_ID)) return;
  if (map.getSource(WEATHER_SOURCE_ID)) map.removeSource(WEATHER_SOURCE_ID);
  map.addSource(WEATHER_SOURCE_ID, {
    type: "raster",
    tiles: urls,
    tileSize: WEATHER_TILE_SIZE,
    maxzoom: WEATHER_MAXZOOM,
    attribution:
      '<a href="https://gpm.nasa.gov/data/imerg" target="_blank" rel="noreferrer">NASA GPM IMERG</a> · global precipitation · 30-min',
  });
  map.addLayer({
    id: WEATHER_LAYER_ID,
    type: "raster",
    source: WEATHER_SOURCE_ID,
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
// ~80 km × 50 km Overpass response, so any later pan within an
// already-loaded tile renders instantly from cache. Tile zoom 9 keeps
// the total request count low (most viewports = 1 tile) at the cost of
// a bigger response per request, which Overpass handles fine.
const RAIL_TILE_ZOOM = 9;
const RAIL_MAX_PARALLEL = 2;
const RAIL_RATE_LIMIT_BACKOFF_MS = 15_000;
type RailTileData = {
  lines: GeoJSON.Feature<GeoJSON.LineString>[];
  stations: { id: string; name: string; lat: number; lon: number }[];
};
const railTileCache = new Map<string, RailTileData>();
const railTileInFlight = new Set<string>();
/**
 * Timestamp until which we suspend new Overpass queries because a
 * recent request was rate-limited (429) or had its TCP connection
 * closed mid-flight (ERR_CONNECTION_CLOSED). Without this guard the
 * map would re-issue the failing fetch on every moveend, hammering
 * Overpass and producing the 2-minute "loading" spirals the user saw.
 */
let railRateLimitedUntil = 0;
function isRateLimitError(err: unknown): boolean {
  const msg = (err as Error)?.message ?? "";
  return (
    msg.includes("429") ||
    msg.includes("CONNECTION_CLOSED") ||
    msg.includes("Failed to fetch") ||
    msg.includes("NetworkError")
  );
}

/**
 * Lightweight pub/sub so React can render a loading badge without
 * polling. Fires whenever a tile fetch starts/finishes or the cooldown
 * flips on/off.
 */
const railNetworkSubscribers = new Set<() => void>();
function notifyRailNetworkStatus() {
  railNetworkSubscribers.forEach((cb) => cb());
}
export interface RailNetworkStatus {
  inFlight: number;
  cooldownUntil: number;
}
function getRailNetworkStatus(): RailNetworkStatus {
  return {
    inFlight: railTileInFlight.size,
    cooldownUntil: railRateLimitedUntil,
  };
}
function subscribeRailNetwork(cb: () => void): () => void {
  railNetworkSubscribers.add(cb);
  return () => {
    railNetworkSubscribers.delete(cb);
  };
}

function useRailNetworkStatus(): RailNetworkStatus {
  const [status, setStatus] = useState<RailNetworkStatus>(() =>
    getRailNetworkStatus(),
  );
  useEffect(() => {
    let raf = 0;
    const update = () => {
      setStatus(getRailNetworkStatus());
      // While we're in a cooldown window, repaint roughly every second so
      // the countdown text in the panel ticks down.
      if (railRateLimitedUntil > Date.now()) {
        raf = window.setTimeout(update, 500) as unknown as number;
      }
    };
    const unsub = subscribeRailNetwork(update);
    update();
    return () => {
      unsub();
      if (raf) clearTimeout(raf);
    };
  }, []);
  return status;
}

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

// VIIRS Thermal Anomalies have variable GIBS processing latency — often
// 1 day, sometimes 3-5 if a satellite pass missed processing. The
// NOAA-20 product also has periodic outages where multiple consecutive
// days return 400. We probe a fallback chain of layers (newest first),
// each across days 1..7, picking the first {layer, date} pair that
// returns a 200. Result is cached at module level for the page lifetime.
const FIRES_LAYER_CANDIDATES = [
  "VIIRS_NOAA20_Thermal_Anomalies_375m_All",
  "VIIRS_SNPP_Thermal_Anomalies_375m_All",
  "MODIS_Terra_Thermal_Anomalies_All",
  "MODIS_Aqua_Thermal_Anomalies_All",
] as const;
const FIRES_PROBE_TILE = { z: 2, x: 2, y: 1 }; // covers Africa+Europe

interface FiresProbe {
  layer: string;
  date: string;
}
let firesProbed: FiresProbe | null = null;
let firesProbeInFlight: Promise<FiresProbe | null> | null = null;
let firesLastProbedUrl: string | null = null;

function firesProbeUrl(layer: string, date: string): string {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${date}/GoogleMapsCompatible_Level9/${FIRES_PROBE_TILE.z}/${FIRES_PROBE_TILE.y}/${FIRES_PROBE_TILE.x}.png`;
}

async function probeUrl(url: string, timeoutMs = 8000): Promise<boolean> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    const res = await fetch(url, { method: "GET", signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

async function findLatestFiresSource(): Promise<FiresProbe | null> {
  if (firesProbed) return firesProbed;
  if (firesProbeInFlight) return firesProbeInFlight;
  firesProbeInFlight = (async () => {
    for (const layer of FIRES_LAYER_CANDIDATES) {
      for (let daysBack = 1; daysBack <= 7; daysBack++) {
        const date = gibsDateNDaysAgo(daysBack);
        const url = firesProbeUrl(layer, date);
        firesLastProbedUrl = url;
        if (await probeUrl(url)) {
          firesProbed = { layer, date };
          return firesProbed;
        }
      }
    }
    return null;
  })();
  try {
    return await firesProbeInFlight;
  } finally {
    firesProbeInFlight = null;
  }
}

function getLastProbedFiresUrl(): string | null {
  return firesLastProbedUrl;
}

function firesTileUrl(layer: string, date: string): string {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${date}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.png`;
}

// IMERG probe: find the youngest 30-min boundary that GIBS has actually
// published. The advertised lag is 4h but real-world delivery varies
// between 3h and 9h depending on the satellite passes and processing
// queue. Probing avoids the "first frame is empty until you drag the
// slider" symptom — every frame in the generated array is guaranteed
// to be a 200-returning timestamp.
//
// We also probe multiple (endpoint, layer, matrix) candidates because
// GIBS publishes IMERG on different paths than the rest of its catalog
// and the exact slug isn't well documented for client-side use.
const IMERG_PROBE_TILE = { z: 2, x: 2, y: 1 }; // covers Africa+Europe

interface ImergSource {
  endpoint: "epsg3857" | "epsg4326";
  layer: string;
  matrix: string;
}
const IMERG_SOURCE_CANDIDATES: ImergSource[] = [
  { endpoint: "epsg3857", layer: "IMERG_Precipitation_Rate", matrix: "GoogleMapsCompatible_Level6" },
  { endpoint: "epsg3857", layer: "IMERG_Precipitation_Rate", matrix: "GoogleMapsCompatible_Level5" },
  { endpoint: "epsg3857", layer: "GPM_3IMERGHH_Precipitation_Rate", matrix: "GoogleMapsCompatible_Level6" },
  // IMERG may live only on epsg4326 — keep MapLibre in EPSG:3857 but
  // we'll proxy through a custom source if this is what works.
  { endpoint: "epsg4326", layer: "IMERG_Precipitation_Rate", matrix: "2km" },
];

interface ImergProbe {
  isoTime: string;
  time: number; // epoch seconds
  source: ImergSource;
}
let imergProbed: { at: number; result: ImergProbe | null } | null = null;
let imergProbeInFlight: Promise<ImergProbe | null> | null = null;
let imergLastProbedUrl: string | null = null;
const IMERG_PROBE_TTL_MS = 5 * 60 * 1000;

function imergSourceTileUrl(source: ImergSource, time: string): string {
  return `https://gibs.earthdata.nasa.gov/wmts/${source.endpoint}/best/${source.layer}/default/${time}/${source.matrix}/{z}/{y}/{x}.png`;
}

function imergProbeUrl(source: ImergSource, time: string): string {
  return imergSourceTileUrl(source, time).replace(
    "{z}/{y}/{x}",
    `${IMERG_PROBE_TILE.z}/${IMERG_PROBE_TILE.y}/${IMERG_PROBE_TILE.x}`,
  );
}

function alignToHalfHour(d: Date): Date {
  const out = new Date(d);
  out.setUTCMinutes(out.getUTCMinutes() < 30 ? 0 : 30);
  out.setUTCSeconds(0);
  out.setUTCMilliseconds(0);
  return out;
}

async function findLatestImergFrame(): Promise<ImergProbe | null> {
  // Use a 5-min TTL on the probe result so subsequent overlay toggles
  // don't re-probe, but a long-running session eventually picks up
  // newly-published frames as time moves forward.
  if (imergProbed && Date.now() - imergProbed.at < IMERG_PROBE_TTL_MS) {
    return imergProbed.result;
  }
  if (imergProbeInFlight) return imergProbeInFlight;
  imergProbeInFlight = (async () => {
    // For each source candidate, walk backwards from 2h ago to 12h ago
    // in 30-min steps. First (source, time) pair that returns 200 wins.
    for (const source of IMERG_SOURCE_CANDIDATES) {
      for (let lagMin = 120; lagMin <= 720; lagMin += 30) {
        const t = alignToHalfHour(new Date(Date.now() - lagMin * 60_000));
        const isoTime = t.toISOString().slice(0, 19) + "Z";
        const url = imergProbeUrl(source, isoTime);
        imergLastProbedUrl = url;
        if (await probeUrl(url)) {
          const result = {
            isoTime,
            time: Math.floor(t.getTime() / 1000),
            source,
          };
          imergProbed = { at: Date.now(), result };
          return result;
        }
      }
    }
    imergProbed = { at: Date.now(), result: null };
    return null;
  })();
  try {
    return await imergProbeInFlight;
  } finally {
    imergProbeInFlight = null;
  }
}

function getLastProbedImergUrl(): string | null {
  return imergLastProbedUrl;
}

function ensureFiresLayer(
  map: MLMap,
  opacity: number,
  layer: string,
  date: string,
) {
  if (map.getLayer(FIRES_LAYER_ID)) return;
  if (map.getSource(FIRES_SOURCE_ID)) map.removeSource(FIRES_SOURCE_ID);
  map.addSource(FIRES_SOURCE_ID, {
    type: "raster",
    tiles: [firesTileUrl(layer, date)],
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

export function LiveMap({ credentials, onOpenSettings }: Props) {
  const [flyTarget, setFlyTarget] = useState<GeocodeResult | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MLMap | null>(null);
  const geolocateRef = useRef<maplibregl.GeolocateControl | null>(null);
  const projectionControlRef = useRef<ProjectionControl | null>(null);
  const liveMarkerRef = useRef<maplibregl.Marker | null>(null);
  const searchMarkerRef = useRef<maplibregl.Marker | null>(null);
  const scalerRef = useRef<HTMLDivElement | null>(null);
  const coneRef = useRef<HTMLDivElement | null>(null);
  const compassUnsubRef = useRef<(() => void) | null>(null);
  const {
    imageBasemapId,
    vectorBasemapId,
    basemapMode,
    basemapVariants,
    liveBasemapDayOffset,
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
    setLiveBasemapDayOffset,
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
  const [weatherFrameIndex, setWeatherFrameIndex] = useState(0);
  const [weatherPlaying, setWeatherPlaying] = useState(false);
  // Resolved (layer, date) for Thermal Anomalies after probe. null = not
  // yet probed, { layer: "", date: "" } sentinel = probe ran but nothing
  // in the 7-day window of any candidate layer was reachable.
  const [firesResolved, setFiresResolved] = useState<FiresProbe | null>(null);
  const [firesProbeFinished, setFiresProbeFinished] = useState(false);
  // Debug HUD activation. Triggered by ANY of:
  //   - URL contains `debug=1` (or just `debug` — the test for any
  //     truthy value also handles `?debug=1>` typos and `#debug=1`).
  //   - `localStorage.debug === "1"`. Once enabled via URL, sticks.
  // To disable: append `?debug=0` or run `localStorage.removeItem("debug")`
  // and reload.
  const [debugOn] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const url = `${window.location.search}${window.location.hash}`;
      if (/[?&#]debug=0\b/.test(url)) {
        try { localStorage.removeItem("debug"); } catch {}
        return false;
      }
      if (/[?&#]debug(=[^&]*)?\b/i.test(url)) {
        try { localStorage.setItem("debug", "1"); } catch {}
        return true;
      }
      return localStorage.getItem("debug") === "1";
    } catch {
      return false;
    }
  });
  const [debugLog, setDebugLog] = useState<string[]>([]);
  const [debugTick, setDebugTick] = useState(0);
  useEffect(() => {
    if (!debugOn) return;
    const id = window.setInterval(() => setDebugTick((t) => t + 1), 1000);
    return () => window.clearInterval(id);
  }, [debugOn]);
  const [weatherLoading, setWeatherLoading] = useState(false);
  type SidebarPane = "control" | "hiking";
  type SheetState = "peek" | "half" | "full";
  // Active pane is always defined: in peek state the tabs still highlight one.
  const [activePane, setActivePane] = useState<SidebarPane>("control");
  const [sheetState, setSheetState] = useState<SheetState>(() => {
    if (typeof window === "undefined") return "half";
    return window.matchMedia("(min-width: 768px)").matches ? "half" : "peek";
  });
  const sidebarOpen = sheetState !== "peek";
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [geoHeading, setGeoHeading] = useState<string | null>(null);
  const [mapInstance, setMapInstance] = useState<MLMap | null>(null);

  useHikingLayers(mapInstance);
  const railNetworkStatus = useRailNetworkStatus();

  // One-shot purge of expired rail tiles on mount. Best-effort, no
  // blocking on the result.
  useEffect(() => {
    railTilePurgeExpired().catch(() => {});
  }, []);

  // Long-press anywhere on the map → drop a waypoint at that location.
  useLongPress(mapInstance, true, useCallback((lng: number, lat: number) => {
    useHiking.getState().addWaypoint({
      lat,
      lon: lng,
      label: `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`,
      source: "longpress",
    });
  }, []));

  // Remember whether the user prefers the sheet at half or full when it
  // opens from peek. Persisted to localStorage so reopening the app at
  // a later session also restores the chosen size.
  const [preferredOpen, setPreferredOpen] = useState<"half" | "full">(() => {
    if (typeof window === "undefined") return "half";
    const stored = window.localStorage.getItem("biosphere.preferredOpen");
    return stored === "full" ? "full" : "half";
  });
  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("biosphere.preferredOpen", preferredOpen);
  }, [preferredOpen]);

  // Tab tap handling — like Apple/Google Maps. Tapping the active tab
  // collapses the sheet to peek; tapping the other switches pane and
  // ensures the sheet is open at the user's preferred size.
  const selectPane = (pane: SidebarPane) => {
    if (pane === activePane) {
      setSheetState((s) => (s === "peek" ? preferredOpen : "peek"));
      return;
    }
    setActivePane(pane);
    setSheetState((s) => (s === "peek" ? preferredOpen : s));
  };

  const toggleExpand = () => {
    if (sheetState === "full") {
      setSheetState("half");
      setPreferredOpen("half");
    } else {
      setSheetState("full");
      setPreferredOpen("full");
    }
  };

  const collapseToPeek = () => setSheetState("peek");

  const cyclePeekHalf = () => {
    setSheetState((s) => (s === "peek" ? preferredOpen : "peek"));
  };

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initial = BASEMAPS.find((b) => b.id === active) ?? BASEMAPS[0];
    const initialVariantId = basemapVariants[initial.id];
    const initialOffset = initial.id === "gibs-today" ? liveBasemapDayOffset : 0;
    // Seed the ref so the post-mount basemap-apply effect skips the
    // redundant setStyle that would otherwise wipe pending overlay
    // registrations.
    lastAppliedBasemapKeyRef.current = `${initial.id}|${initialVariantId ?? ""}|${initialOffset}`;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style:
        initial.kind === "raster"
          ? rasterStyle(initial, initialVariantId, initialOffset)
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

    // Debug HUD: capture MapLibre errors (tile load failures, source
    // creation issues, etc.) so the user can read them on-screen via
    // ?debug=1 instead of needing devtools.
    const onMapError = (e: maplibregl.ErrorEvent) => {
      const sourceId =
        (e as unknown as { sourceId?: string }).sourceId ?? "?";
      const url =
        (e as unknown as { error?: { url?: string } }).error?.url ?? "";
      const msg = e.error?.message ?? String(e.error ?? "unknown");
      setDebugLog((prev) =>
        [
          `[map.error src=${sourceId}] ${msg}${url ? ` → ${url.slice(-90)}` : ""}`,
          ...prev,
        ].slice(0, 12),
      );
    };
    map.on("error", onMapError);

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      window.removeEventListener("unhandledrejection", onUnhandled);
      map.off("error", onMapError);
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
  }, []);

  // Tracks the last basemap+variant+offset combo we actually applied via
  // setStyle. The map-init effect already builds the initial style with
  // these values, so the post-mount apply effect would otherwise issue a
  // redundant setStyle that races with overlay registration (Fires /
  // Clouds add via map.once("style.load") would fire against a style
  // that's about to be replaced, then never see the replacement load).
  const lastAppliedBasemapKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const basemap = BASEMAPS.find((b) => b.id === active);
    if (!basemap) return;
    // dayOffset only matters for the gibs-today basemap; treat it as 0
    // for everything else so an unrelated slider drag doesn't restyle
    // the rendered basemap and wipe overlays.
    const effectiveOffset = active === "gibs-today" ? liveBasemapDayOffset : 0;
    const key = `${active}|${activeVariantId ?? ""}|${effectiveOffset}`;
    if (lastAppliedBasemapKeyRef.current === key) return;
    lastAppliedBasemapKeyRef.current = key;
    applyBasemap(map, basemap, activeVariantId, effectiveOffset);

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
  }, [active, activeVariantId, liveBasemapDayOffset]);

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

  // NASA GPM IMERG global precipitation (30-min cadence, ~4 h delivery
  // lag, free, no auth). Probes once per Clouds-on session to find the
  // youngest frame GIBS has actually published, then generates 13
  // frames at 30-min cadence ending there. Re-probes every 5 min so a
  // long-running session picks up new frames as time advances.
  const [weatherFramesGen, setWeatherFramesGen] = useState(0);
  const [imergProbeResult, setImergProbeResult] = useState<ImergProbe | null>(null);
  const [imergProbeFinished, setImergProbeFinished] = useState(false);

  useEffect(() => {
    if (!weatherOn) {
      setImergProbeFinished(false);
      return;
    }
    let cancelled = false;
    const probe = async () => {
      const result = await findLatestImergFrame();
      if (cancelled) return;
      setImergProbeResult(result);
      setImergProbeFinished(true);
    };
    probe();
    const id = window.setInterval(() => {
      probe();
      setWeatherFramesGen((g) => g + 1);
    }, CLOUDS_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [weatherOn]);

  interface WeatherFrame {
    time: number;
    date: string;
    urls: string[];
  }

  const weatherFrames: WeatherFrame[] = useMemo(() => {
    if (!weatherOn) return [];
    if (!imergProbeResult) return [];
    const { source, isoTime: anchor } = imergProbeResult;
    const youngest = new Date(anchor);
    const frames: WeatherFrame[] = [];
    const intervalMin = 30;
    const count = 13;
    for (let i = count - 1; i >= 0; i--) {
      const t = new Date(youngest.getTime() - i * intervalMin * 60_000);
      const isoTime = t.toISOString().slice(0, 19) + "Z";
      frames.push({
        time: Math.floor(t.getTime() / 1000),
        date: isoTime,
        urls: [imergSourceTileUrl(source, isoTime)],
      });
    }
    return frames;
    // weatherFramesGen ticks each refresh interval to regenerate URLs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weatherOn, imergProbeResult, weatherFramesGen]);

  // Whether the cloud overlay is active. RainViewer-era state stayed as
  // a "satellite" / "radar" switch; we now always show satellite-derived
  // cloud cover, so the kind is constant. Kept for the OverlayPanel /
  // DebugHud props to avoid wider refactors.
  const weatherSourceKind: "satellite" | "radar" = "satellite";
  const weatherManifestError: string | null = null;

  // When fresh frames arrive (first load or 5-min refresh), snap the
  // playhead to the most-recent frame so the user always sees "now".
  useEffect(() => {
    if (weatherFrames.length === 0) return;
    setWeatherFrameIndex(weatherFrames.length - 1);
  }, [weatherFrames.length, weatherFramesGen]);

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
    if (map.isStyleLoaded()) apply();
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
      // Honour the rate-limit cooldown — Overpass needs breathing room
      // after a 429 or a closed connection.
      const now = Date.now();
      if (now < railRateLimitedUntil) {
        const wait = railRateLimitedUntil - now + 50;
        window.setTimeout(() => {
          if (!cancelled) fetchMissingTiles();
        }, wait);
        return;
      }
      const tiles = tilesForBounds(map.getBounds(), RAIL_TILE_ZOOM);
      const toFetch = tiles.filter((t) => {
        const key = `${t.x}/${t.y}`;
        return !railTileCache.has(key) && !railTileInFlight.has(key);
      });
      const slots = Math.max(0, RAIL_MAX_PARALLEL - railTileInFlight.size);
      for (const t of toFetch.slice(0, slots)) {
        const key = `${t.x}/${t.y}`;
        railTileInFlight.add(key);
        notifyRailNetworkStatus();
        const ctrl = new AbortController();
        const bbox = railTileBbox(RAIL_TILE_ZOOM, t.x, t.y);

        // Two-tier cache: try IndexedDB first (instant after the user has
        // visited an area before, even across page reloads). On miss,
        // fall through to Overpass and persist the result for next time.
        const handleTile = async () => {
          let success = false;
          try {
            const stored = await railTileGet(key);
            if (cancelled || ctrl.signal.aborted) return;
            if (stored) {
              railTileCache.set(key, {
                lines: stored.lines,
                stations: stored.stations,
              });
              success = true;
            } else {
              const { lines, stations } = await fetchRailNetwork(
                bbox,
                ctrl.signal,
              );
              if (cancelled || ctrl.signal.aborted) return;
              railTileCache.set(key, { lines: lines.features, stations });
              success = true;
              // Fire-and-forget IDB write; never blocks rendering.
              railTileSet(key, { lines: lines.features, stations }).catch(
                () => {},
              );
            }
          } catch (err) {
            if ((err as Error).name === "AbortError") {
              // silent
            } else if (isRateLimitError(err)) {
              railRateLimitedUntil =
                Date.now() + RAIL_RATE_LIMIT_BACKOFF_MS;
            } else {
              console.warn("[rail-network]", err);
            }
          } finally {
            railTileInFlight.delete(key);
            notifyRailNetworkStatus();
            if (success) {
              renderFromCache();
              fetchMissingTiles();
            }
          }
        };
        handleTile();
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

  // Probe for the latest available Thermal Anomalies (layer, date) on
  // first Fires toggle. Cached at module level so subsequent toggles
  // skip the probe.
  useEffect(() => {
    if (!firesOn) return;
    if (firesProbeFinished) return;
    let cancelled = false;
    findLatestFiresSource().then((found) => {
      if (cancelled) return;
      setFiresResolved(found);
      setFiresProbeFinished(true);
    });
    return () => {
      cancelled = true;
    };
  }, [firesOn, firesProbeFinished]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !firesOn) return;
    if (!firesResolved) return; // wait for probe
    const { layer, date } = firesResolved;
    const apply = () => ensureFiresLayer(map, firesOpacity, layer, date);
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
  }, [firesOn, active, firesResolved]);

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
      if (e.key === "Escape") collapseToPeek();
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
    const map = mapRef.current;
    if (!map) return;

    // Drop / replace a teardrop marker at the search target so the user
    // can see *where* on the map their pick is. Tapping the pin removes
    // it; the next search replaces it.
    if (!flyTarget) {
      if (searchMarkerRef.current) {
        searchMarkerRef.current.remove();
        searchMarkerRef.current = null;
      }
      return;
    }

    const el = document.createElement("div");
    el.className = "search-result-marker";
    el.title = flyTarget.label;
    el.innerHTML = `
      <svg width="28" height="36" viewBox="0 0 28 36" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <path d="M14 0 C 5 0 0 5 0 13 C 0 24 14 36 14 36 C 14 36 28 24 28 13 C 28 5 23 0 14 0 Z" fill="#d4ff38" stroke="rgba(8,10,6,0.85)" stroke-width="1.5" />
        <circle cx="14" cy="13" r="5" fill="#080a06" />
      </svg>
    `;
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      setFlyTarget(null);
    });

    searchMarkerRef.current?.remove();
    searchMarkerRef.current = new maplibregl.Marker({
      element: el,
      anchor: "bottom",
    })
      .setLngLat(flyTarget.coordinates)
      .addTo(map);

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

      {/* Floating top bar — icon, search field, basemap-mode switch */}
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex items-center gap-2 px-3 pt-[max(env(safe-area-inset-top,0px),12px)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`${ICON_BASE_PATH}/icon.svg`}
          alt="BiosphereOne"
          width={36}
          height={36}
          className="pointer-events-auto block h-9 w-9 shrink-0"
        />
        <div className="pointer-events-auto min-w-0 flex-1">
          <SearchBox onSelect={setFlyTarget} nearby={view.center} />
        </div>
        <div className="pointer-events-auto shrink-0">
          <BasemapSwitch mode={basemapMode} onModeChange={setBasemapMode} />
        </div>
      </div>

      {/* Rail-network loading pill — sits below the floating top bar. */}
      {railwayOn
        && railStyle === "lines"
        && (railNetworkStatus.inFlight > 0
          || railNetworkStatus.cooldownUntil > Date.now()) && (
        <div className="pointer-events-none absolute right-3 top-[calc(env(safe-area-inset-top,0px)+62px)] z-20">
          <div className="hud-panel hud-mono flex items-center gap-2 px-3 py-1.5 text-[10px] text-[color:var(--hud-text)]">
            <span className="hud-corner-tr" aria-hidden />
            <span className="hud-corner-br" aria-hidden />
            <span
              aria-hidden
              className="hud-loading-dot"
              data-state={
                railNetworkStatus.cooldownUntil > Date.now()
                  ? "throttled"
                  : "loading"
              }
            />
            <span>
              {railNetworkStatus.cooldownUntil > Date.now()
                ? `Overpass throttled · ${Math.max(
                    0,
                    Math.ceil(
                      (railNetworkStatus.cooldownUntil - Date.now()) / 1000,
                    ),
                  )}s`
                : `Loading rails · ${railNetworkStatus.inFlight} tile${
                    railNetworkStatus.inFlight === 1 ? "" : "s"
                  }`}
            </span>
          </div>
        </div>
      )}

      {/* geolocate status banner — top-centre on mobile (clear of the
          attribution / scale / zoom controls at the bottom), bottom-
          centre on desktop where the side-drawer leaves the bottom
          edge free. */}
      {(geoStatus || geoHeading) && (
        <div className="pointer-events-auto absolute left-1/2 z-20 -translate-x-1/2 top-[calc(env(safe-area-inset-top,0px)+62px)] md:top-auto md:bottom-3">
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

      {/* Sidebar — bottom-sheet on mobile, side-drawer on desktop */}
      <aside
        data-sheet-state={sheetState}
        className={[
          // Mobile positioning + state-driven height live on .hud-bottom-sheet
          // (globals.css) so the map stays the dominant element. The sheet is
          // always anchored to the viewport bottom; only its height changes.
          "hud-bottom-sheet",
          "flex w-full flex-col",
          // Desktop overrides
          "md:absolute md:right-0 md:top-0 md:bottom-0",
          "md:left-auto md:max-w-[340px]",
          "md:rounded-none md:border-t-0",
          "md:transition-transform md:duration-200 md:ease-out",
          "md:will-change-transform",
          sidebarOpen
            ? "md:translate-x-0"
            : "md:translate-x-[calc(100%-34px)]",
        ].join(" ")}
      >
        {/* Side handles — desktop only */}
        <div className="hud-side-handles absolute -left-[34px] top-4 flex shrink-0 flex-col items-start gap-2">
          <SidebarToggle
            open={activePane === "control" && sidebarOpen}
            onToggle={() => selectPane("control")}
          />
          <HikingToggle
            open={activePane === "hiking" && sidebarOpen}
            onToggle={() => selectPane("hiking")}
          />
        </div>

        {/* Drag handle — mobile, taps cycle peek ↔ half */}
        <button
          type="button"
          onClick={cyclePeekHalf}
          aria-label={sheetState === "peek" ? "Open panel" : "Collapse panel"}
          className="hud-bottom-sheet-grabber"
        />

        {/* In-sheet tabs — always visible on mobile, hidden on desktop */}
        <nav className="hud-sheet-tabs" aria-label="Panel switcher">
          <button
            type="button"
            onClick={() => selectPane("control")}
            data-active={activePane === "control" && sidebarOpen}
            aria-pressed={activePane === "control" && sidebarOpen}
            aria-label="Map Controls"
            className="hud-sheet-tab"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              aria-hidden
            >
              <circle cx="8" cy="8" r="6.2" />
              <ellipse cx="8" cy="8" rx="6.2" ry="2.6" />
              <ellipse cx="8" cy="8" rx="2.6" ry="6.2" />
              <line x1="1.8" y1="8" x2="14.2" y2="8" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => selectPane("hiking")}
            data-active={activePane === "hiking" && sidebarOpen}
            aria-pressed={activePane === "hiking" && sidebarOpen}
            aria-label="Routes"
            className="hud-sheet-tab"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 2 L5 14" />
              <path
                d="M5 3 L13 5 L5 7 Z"
                fill="currentColor"
                fillOpacity="0.45"
              />
            </svg>
          </button>
        </nav>

        {/* panel body — visible only when expanded */}
        <div
          className="hud-sidebar hud-scanlines flex min-w-0 flex-1 flex-col overflow-hidden"
          aria-hidden={!sidebarOpen}
        >
          <div className="grid grid-cols-[1fr_auto_1fr] items-center border-y border-[color:var(--hud-border)] px-3 h-9 md:h-10">
            <div className="justify-self-start">
              {/* Expand / shrink — mobile only, on the left */}
              <button
                type="button"
                onClick={toggleExpand}
                aria-label={sheetState === "full" ? "Shrink panel" : "Expand panel"}
                className="hud-icon-btn md:hidden"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  {sheetState === "full" ? (
                    /* Inward corner brackets — collapse / shrink */
                    <>
                      <path d="M6 2 L6 6 L2 6" />
                      <path d="M10 2 L10 6 L14 6" />
                      <path d="M6 14 L6 10 L2 10" />
                      <path d="M10 14 L10 10 L14 10" />
                    </>
                  ) : (
                    /* Outward corner brackets — expand to full screen */
                    <>
                      <path d="M2 6 L2 2 L6 2" />
                      <path d="M14 6 L14 2 L10 2" />
                      <path d="M2 10 L2 14 L6 14" />
                      <path d="M14 10 L14 14 L10 14" />
                    </>
                  )}
                </svg>
              </button>
              {/* Brand badge — desktop only */}
              <span className="hud-mono hidden text-[10px] text-[color:var(--hud-text-muted)] md:inline">
                BIOSPHERE · v1
              </span>
            </div>
            <span className="hud-label justify-self-center truncate text-center">
              {activePane === "hiking" ? "Routes" : "Map Controls"}
            </span>
            <div className="justify-self-end">
              {/* Collapse to peek — mobile only, on the right; arrow-down
                  mirrors the drag-handle action since it minimises rather
                  than dismisses. */}
              <button
                type="button"
                onClick={collapseToPeek}
                aria-label="Collapse panel"
                className="hud-icon-btn md:hidden"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 16 16"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden
                >
                  <path d="M8 3 L8 12 M4 8 L8 12 L12 8" />
                </svg>
              </button>
            </div>
          </div>

          <div className="flex flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 pt-3 pb-3">
            {activePane === "hiking" ? (
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
                  liveBasemapDayOffset={liveBasemapDayOffset}
                  onSelectImage={(id) => {
                    setImageBasemapId(id);
                    if (basemapMode === "vector") setBasemapMode("photo");
                  }}
                  onSelectVector={(id) => {
                    setVectorBasemapId(id);
                    if (basemapMode !== "vector") setBasemapMode("vector");
                  }}
                />

                <OverlayPanel
                  active={activeOverlay}
                  onChange={setActiveOverlay}
                  opacity={overlayOpacityForActive}
                  onOpacityChange={setOverlayOpacityForActive}
                  railStyle={railStyle}
                  onRailStyleChange={setRailStyle}
                  railNetworkStatus={railNetworkStatus}
                  weatherProps={{
                    frames: weatherFrames,
                    frameIndex: weatherFrameIndex,
                    onFrameIndex: setWeatherFrameIndex,
                    isPlaying: weatherPlaying,
                    onPlayingChange: setWeatherPlaying,
                    loading: weatherLoading,
                    error: weatherManifestError,
                    sourceKind: weatherSourceKind,
                  }}
                />

                <TimelinePanel
                  s2ActiveVariant={
                    basemapVariants["s2cloudless"] ?? "2024"
                  }
                  isS2Active={
                    imageBasemapId === "s2cloudless"
                    && basemapMode !== "vector"
                  }
                  onSelectYear={(variantId) => {
                    setImageBasemapId("s2cloudless");
                    if (basemapMode === "vector") setBasemapMode("photo");
                    setBasemapVariant("s2cloudless", variantId);
                  }}
                  liveDayOffset={liveBasemapDayOffset}
                  onLiveDayOffsetChange={(offset) => {
                    setImageBasemapId("gibs-today");
                    if (basemapMode === "vector") setBasemapMode("photo");
                    setLiveBasemapDayOffset(offset);
                  }}
                  isLiveActive={
                    imageBasemapId === "gibs-today"
                    && basemapMode !== "vector"
                  }
                  onActivateLive={() => {
                    setImageBasemapId("gibs-today");
                    if (basemapMode === "vector") setBasemapMode("photo");
                  }}
                  credentials={credentials !== null}
                  onOpenSettings={onOpenSettings}
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
        </div>
      </aside>

      {debugOn && (
        <DebugHud
          tick={debugTick}
          mapRef={mapRef}
          activeOverlay={activeOverlay}
          weatherOn={weatherOn}
          firesOn={firesOn}
          ndviOn={ndviOn}
          railwayOn={railwayOn}
          weatherFramesCount={weatherFrames.length}
          weatherManifestError={weatherManifestError}
          weatherManifestLoaded={weatherFrames.length > 0}
          weatherSourceKind={weatherSourceKind}
          imergProbeFinished={imergProbeFinished}
          imergProbedIsoTime={imergProbeResult?.isoTime ?? null}
          imergProbedSource={
            imergProbeResult
              ? `${imergProbeResult.source.endpoint}/${imergProbeResult.source.layer}/${imergProbeResult.source.matrix}`
              : null
          }
          imergLastProbedUrl={getLastProbedImergUrl()}
          firesResolvedLayer={firesResolved?.layer ?? null}
          firesResolvedDate={firesResolved?.date ?? null}
          firesProbeFinished={firesProbeFinished}
          lastBasemapKey={lastAppliedBasemapKeyRef.current}
          basemapMode={basemapMode}
          imageBasemapId={imageBasemapId}
          activeOverlayId={active}
          log={debugLog}
        />
      )}
    </div>
  );
}

interface BasemapPanelProps {
  imageId: string;
  vectorId: string;
  mode: BasemapMode;
  variants: Record<string, string>;
  liveBasemapDayOffset: number;
  onSelectImage: (id: string) => void;
  onSelectVector: (id: string) => void;
}

function BasemapPanel({
  imageId,
  vectorId,
  mode,
  variants,
  liveBasemapDayOffset,
  onSelectImage,
  onSelectVector,
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
            const subtitle = resolveBasemapSubtitle(
              b,
              variants[b.id],
              b.id === "gibs-today" ? liveBasemapDayOffset : undefined,
            );
            return (
              <button
                key={b.id}
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
                  <span className="hud-basemap-btn-subtitle">{subtitle}</span>
                )}
              </button>
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

const ICON_BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function BasemapSwitch({ mode, onModeChange }: BasemapSwitchProps) {
  return (
    <div
      className="hud-basemap-switch pointer-events-auto"
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
  );
}

interface OverlayPanelProps {
  active: OverlayKind | null;
  onChange: (k: OverlayKind | null) => void;
  opacity: number;
  onOpacityChange: (o: number) => void;
  railStyle: "tiles" | "lines";
  onRailStyleChange: (s: "tiles" | "lines") => void;
  railNetworkStatus: RailNetworkStatus;
  weatherProps: {
    frames: { time: number; date: string; urls: string[] }[];
    frameIndex: number;
    onFrameIndex: (i: number) => void;
    isPlaying: boolean;
    onPlayingChange: (p: boolean) => void;
    loading: boolean;
    error: string | null;
    sourceKind: "satellite" | "radar";
  };
}

function OverlayPanel({
  active,
  onChange,
  opacity,
  onOpacityChange,
  railStyle,
  onRailStyleChange,
  railNetworkStatus,
  weatherProps,
}: OverlayPanelProps) {
  const tabs: { key: OverlayKind | null; label: string }[] = [
    { key: null, label: "Off" },
    { key: "clouds", label: "Clouds" },
    { key: "rail", label: "Rail" },
    { key: "fires", label: "Fires" },
    { key: "ndvi", label: "NDVI" },
  ];

  const railLineCaption = (() => {
    const cooldownLeft = Math.max(
      0,
      Math.ceil((railNetworkStatus.cooldownUntil - Date.now()) / 1000),
    );
    if (cooldownLeft > 0) {
      return `Overpass throttled · retrying in ${cooldownLeft}s`;
    }
    if (railNetworkStatus.inFlight > 0) {
      return `Loading rails… (${railNetworkStatus.inFlight} tile${railNetworkStatus.inFlight === 1 ? "" : "s"})`;
    }
    return "OSM rail lines · Overpass · cached per tile";
  })();

  const caption =
    active === "clouds"
      ? "Live precipitation · GPM IMERG · global · past 6 h"
      : active === "rail"
        ? railStyle === "lines"
          ? railLineCaption
          : "OpenRailwayMap raster · OSM"
        : active === "fires"
          ? "VIIRS NOAA-20 Thermal Anomalies · daily · global"
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

        {active === "clouds" && f.error && (
          <p className="max-w-[260px] break-words text-[11px] text-[color:var(--hud-danger)]">
            Cloud radar unavailable: {f.error}
          </p>
        )}
        {active === "clouds" && !f.error && f.frames.length === 0 && (
          <p className="max-w-[260px] text-[11px] text-[color:var(--hud-text-muted)]">
            Loading live cloud frames…
          </p>
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
                {(() => {
                  const ms = currentFrame.time * 1000;
                  const t = new Date(ms).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  });
                  return ms > Date.now() ? `${t} +nowcast` : t;
                })()}
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
              <div className="flex items-center gap-1.5 text-[10px] text-[color:var(--hud-text-muted)]">
                {active === "rail"
                  && railStyle === "lines"
                  && (railNetworkStatus.inFlight > 0
                    || railNetworkStatus.cooldownUntil > Date.now()) && (
                    <span
                      aria-hidden
                      className="hud-loading-dot"
                      data-state={
                        railNetworkStatus.cooldownUntil > Date.now()
                          ? "throttled"
                          : "loading"
                      }
                    />
                  )}
                <span>{caption}</span>
              </div>
            )}
          </>
        )}
      </div>
    </HudPanel>
  );
}

type TimelineTab = "year" | "live" | "snapshots";

interface TimelinePanelProps {
  // Year tab
  s2ActiveVariant: string;
  isS2Active: boolean;
  onSelectYear: (variantId: string) => void;
  // Live tab
  liveDayOffset: number;
  onLiveDayOffsetChange: (offset: number) => void;
  isLiveActive: boolean;
  onActivateLive: () => void;
  // Snapshots tab
  credentials: boolean;
  onOpenSettings?: () => void;
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

function TimelinePanel(props: TimelinePanelProps) {
  // Smart default: Snapshots when credentials present, else Year so the
  // user has something useful immediately without auth.
  const [tab, setTab] = useState<TimelineTab>(() =>
    props.credentials ? "snapshots" : "year",
  );

  return (
    <HudPanel label="Timeline">
      <div className="flex flex-col items-stretch gap-2">
        <div className="hud-tab-row" style={{ gridTemplateColumns: "repeat(3, minmax(0, 1fr))" }}>
          <button
            type="button"
            className="hud-tab"
            data-active={tab === "year"}
            onClick={() => setTab("year")}
          >
            Year
          </button>
          <button
            type="button"
            className="hud-tab"
            data-active={tab === "live"}
            onClick={() => setTab("live")}
          >
            Daily
          </button>
          <button
            type="button"
            className="hud-tab"
            data-active={tab === "snapshots"}
            onClick={() => setTab("snapshots")}
          >
            Snapshots
          </button>
        </div>

        {tab === "year" && (
          <TimelineYearTab
            s2ActiveVariant={props.s2ActiveVariant}
            isS2Active={props.isS2Active}
            onSelectYear={props.onSelectYear}
          />
        )}
        {tab === "live" && (
          <TimelineLiveTab
            offset={props.liveDayOffset}
            onChange={props.onLiveDayOffsetChange}
            isActive={props.isLiveActive}
            onActivate={props.onActivateLive}
          />
        )}
        {tab === "snapshots" && (
          <TimelineSnapshotsTab
            credentials={props.credentials}
            onOpenSettings={props.onOpenSettings}
            zoomOk={props.zoomOk}
            minZoom={props.minZoom}
            state={props.state}
            sector={props.sector}
            snapshots={props.snapshots}
            snapshotIndex={props.snapshotIndex}
            onStart={props.onStart}
            onSelect={props.onSelect}
            onClear={props.onClear}
            opacity={props.opacity}
            onOpacityChange={props.onOpacityChange}
          />
        )}
      </div>
    </HudPanel>
  );
}

function TimelineYearTab({
  s2ActiveVariant,
  isS2Active,
  onSelectYear,
}: {
  s2ActiveVariant: string;
  isS2Active: boolean;
  onSelectYear: (variantId: string) => void;
}) {
  const s2 = BASEMAPS.find((b) => b.id === "s2cloudless");
  if (!s2 || !s2.variants) return null;
  const options = s2.variants.options;
  const selectedId = isS2Active ? s2ActiveVariant : "";
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] text-[color:var(--hud-text-muted)]">
        Sentinel-2 cloudless · 10 m · annual mosaic
      </p>
      <div
        className="hud-tab-row"
        style={{
          gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))`,
        }}
        role="radiogroup"
        aria-label="Sentinel-2 year"
      >
        {options.map((o) => {
          const active = o.id === selectedId;
          return (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={active}
              data-active={active}
              onClick={() => onSelectYear(o.id)}
              className="hud-tab hud-mono"
            >
              {o.label}
            </button>
          );
        })}
      </div>
      {!isS2Active && (
        <p className="text-[10px] text-[color:var(--hud-text-muted)]">
          Tap a year to switch the photo basemap to Sentinel-2.
        </p>
      )}
    </div>
  );
}

function TimelineLiveTab({
  offset,
  onChange,
  isActive,
  onActivate,
}: {
  offset: number;
  onChange: (offset: number) => void;
  isActive: boolean;
  onActivate: () => void;
}) {
  const [playing, setPlaying] = useState(false);
  const max = 14;
  useEffect(() => {
    if (!playing) return;
    const id = window.setInterval(() => {
      onChange((offset + 1) % (max + 1));
    }, 600);
    return () => window.clearInterval(id);
  }, [playing, offset, onChange]);
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - (offset + 1));
  const niceDate = date.toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  const relative = offset === 0 ? "yesterday" : `${offset + 1} days ago`;
  const setOffset = (next: number) => {
    if (!isActive) onActivate();
    setPlaying(false);
    onChange(Math.max(0, Math.min(max, next)));
  };
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[10px] text-[color:var(--hud-text-muted)]">
        NOAA-20 VIIRS daily true-color · step through the past 14 days
      </p>
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setOffset(offset + 1)}
          disabled={offset >= max}
          className="hud-btn-ghost"
          aria-label="Older day"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M6.5 2 L3 5 L6.5 8" />
          </svg>
        </button>
        <div className="flex flex-1 flex-col items-center leading-tight">
          <span className="hud-mono text-[13px] text-[color:var(--hud-text)]">
            {niceDate}
          </span>
          <span className="text-[10px] text-[color:var(--hud-text-muted)]">
            {relative}
          </span>
        </div>
        <button
          type="button"
          onClick={() => setOffset(offset - 1)}
          disabled={offset <= 0}
          className="hud-btn-ghost"
          aria-label="Newer day"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3.5 2 L7 5 L3.5 8" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => {
            if (!isActive) onActivate();
            setPlaying((p) => !p);
          }}
          className="hud-btn-ghost"
          aria-label={playing ? "Pause" : "Play"}
        >
          {playing ? (
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
      </div>
      {!isActive && (
        <button
          type="button"
          onClick={onActivate}
          className="hud-btn-primary"
        >
          Switch basemap to Live · Today
        </button>
      )}
    </div>
  );
}

function TimelineSnapshotsTab({
  credentials,
  onOpenSettings,
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
}: {
  credentials: boolean;
  onOpenSettings?: () => void;
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
}) {
  const active = sector !== null && snapshots.length > 0;
  const current = snapshotIndex >= 0 ? snapshots[snapshotIndex] : null;
  function handlePrev() {
    if (snapshotIndex > 0) onSelect(snapshotIndex - 1);
  }
  function handleNext() {
    if (snapshotIndex < snapshots.length - 1) onSelect(snapshotIndex + 1);
  }
  return (
    <div className="flex flex-col items-stretch gap-2">
      <div className="flex items-center justify-between gap-2">
        {state.kind === "searching" || state.kind === "loading" ? (
          <span
            className="inline-block h-2 w-2 animate-pulse rounded-full bg-[color:var(--hud-accent)] shadow-[0_0_6px_var(--hud-accent-glow)]"
            aria-label="Loading"
          />
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          {active && (
            <button
              type="button"
              onClick={onClear}
              className="text-[10px] uppercase tracking-wider text-[color:var(--hud-text-muted)] hover:text-[color:var(--hud-accent)]"
            >
              clear
            </button>
          )}
          {onOpenSettings && <SettingsGear onOpen={onOpenSettings} />}
        </div>
      </div>

      {!active && (
        <button
          type="button"
          onClick={onStart}
          disabled={!credentials || !zoomOk || state.kind === "searching"}
          className="hud-btn-primary"
        >
          {state.kind === "searching" ? "Searching…" : "Scan for Snapshots"}
        </button>
      )}

      {!credentials && (
        <p className="max-w-[260px] text-[11px] text-[color:var(--hud-text-muted)]">
          Tap the gear icon to add Copernicus credentials.
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

interface DebugHudProps {
  tick: number;
  mapRef: { current: MLMap | null };
  activeOverlay: OverlayKind | null;
  weatherOn: boolean;
  firesOn: boolean;
  ndviOn: boolean;
  railwayOn: boolean;
  weatherFramesCount: number;
  weatherManifestError: string | null;
  weatherManifestLoaded: boolean;
  weatherSourceKind: "satellite" | "radar";
  imergProbeFinished: boolean;
  imergProbedIsoTime: string | null;
  imergProbedSource: string | null;
  imergLastProbedUrl: string | null;
  firesResolvedLayer: string | null;
  firesResolvedDate: string | null;
  firesProbeFinished: boolean;
  lastBasemapKey: string | null;
  basemapMode: BasemapMode;
  imageBasemapId: string;
  activeOverlayId: string;
  log: string[];
}

function DebugHud({
  tick,
  mapRef,
  activeOverlay,
  weatherOn,
  firesOn,
  ndviOn,
  railwayOn,
  weatherFramesCount,
  weatherManifestError,
  weatherManifestLoaded,
  weatherSourceKind,
  imergProbeFinished,
  imergProbedIsoTime,
  imergProbedSource,
  imergLastProbedUrl,
  firesResolvedLayer,
  firesResolvedDate,
  firesProbeFinished,
  lastBasemapKey,
  basemapMode,
  imageBasemapId,
  activeOverlayId,
  log,
}: DebugHudProps) {
  // tick is read so the effect re-runs every second; eslint silenced via use.
  void tick;
  const map = mapRef.current;
  let layerIds: string[] = [];
  let sourceIds: string[] = [];
  let styleLoaded = false;
  let zoom = 0;
  if (map) {
    try {
      const style = map.getStyle();
      layerIds = style?.layers?.map((l) => l.id) ?? [];
      sourceIds = Object.keys(style?.sources ?? {});
      styleLoaded = map.isStyleLoaded() ?? false;
      zoom = Math.round(map.getZoom() * 10) / 10;
    } catch {
      // Style not yet ready.
    }
  }
  const firesLayerOnMap = layerIds.includes("fires-layer");
  const weatherLayerOnMap = layerIds.includes("weather-layer");
  return (
    <div
      className="pointer-events-auto fixed left-1 right-1 top-[max(64px,env(safe-area-inset-top,0px))] z-[9999] max-h-[55vh] overflow-auto rounded border-2 border-red-500 bg-black/95 p-2 font-mono text-[10px] leading-tight text-amber-100 shadow-2xl"
    >
      <div className="mb-1 font-semibold text-amber-300">DEBUG HUD · ?debug=0 to hide</div>
      <div>active basemap: {activeOverlayId} (mode={basemapMode}, image={imageBasemapId})</div>
      <div>activeOverlay: {String(activeOverlay)} · style.loaded: {String(styleLoaded)} · z={zoom}</div>
      <div>
        toggles: clouds={String(weatherOn)} fires={String(firesOn)} rail={String(railwayOn)} ndvi={String(ndviOn)}
      </div>
      <div>
        layer present: fires-layer={String(firesLayerOnMap)} · weather-layer={String(weatherLayerOnMap)}
      </div>
      <div>
        clouds: frames={weatherFramesCount} ·{" "}
        {!imergProbeFinished
          ? "(probing IMERG…)"
          : imergProbedIsoTime && imergProbedSource
          ? `${imergProbedSource} · ${imergProbedIsoTime}`
          : "(no candidate returned 200)"}
        {weatherManifestError ? ` · err=${weatherManifestError}` : ""}
      </div>
      {imergLastProbedUrl && (
        <div className="break-all text-amber-300">
          last probe: <a href={imergLastProbedUrl} target="_blank" rel="noreferrer" className="underline">{imergLastProbedUrl.slice(-80)}</a>
        </div>
      )}
      <div>
        fires:{" "}
        {!firesProbeFinished
          ? "(probing…)"
          : firesResolvedLayer && firesResolvedDate
          ? `${firesResolvedLayer.replace("_Thermal_Anomalies_375m_All", "").replace("_Thermal_Anomalies_All", "")} · ${firesResolvedDate}`
          : "(no candidate layer/date returned 200)"}
      </div>
      <div>last basemap key: {lastBasemapKey ?? "(none)"}</div>
      <div className="mt-1">layers ({layerIds.length}): {layerIds.join(", ") || "(none)"}</div>
      <div>sources ({sourceIds.length}): {sourceIds.join(", ") || "(none)"}</div>
      {log.length > 0 && (
        <>
          <div className="mt-1 text-amber-300">recent map.error events:</div>
          <ul className="list-disc pl-4">
            {log.map((line, i) => (
              <li key={i} className="break-all">
                {line}
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
