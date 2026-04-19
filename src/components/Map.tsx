"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import maplibregl, { Map as MLMap, ScaleControl } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { BASEMAPS, type Basemap } from "@/lib/basemaps";
import { useSettings } from "@/lib/settings";
import { getAccessToken } from "@/lib/sentinel/auth";
import { fetchDayOverlay } from "@/lib/sentinel/latest-overlay";
import { searchCatalog, type Snapshot } from "@/lib/sentinel/catalog";
import type { Bbox, Credentials } from "@/types/sentinel";
import { SettingsGear } from "./SettingsGear";
import type { GeocodeResult } from "@/lib/geocode";
import { gibsDateNDaysAgo, gibsTileUrl, type GibsLayer } from "@/lib/gibs";
import { RAILWAY_TILE_URLS, RAILWAY_ATTRIBUTION, RAILWAY_MAX_ZOOM } from "@/lib/railway";
import { requestCompassPermission, subscribeCompass } from "@/lib/compass";
import { ProjectionControl } from "./ProjectionControl";
import { LedToggle } from "./hud/LedToggle";
import { HudPanel } from "./hud/HudPanel";
import { SidebarToggle } from "./SidebarToggle";

const CLOUDS_DAYS_BACK = 7;
const CLOUDS_ANIM_INTERVAL_MS = 900;
const CLOUDS_COMPOSITE_LAYERS: GibsLayer[] = [
  "VIIRS_SNPP_CorrectedReflectance_TrueColor",
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

function rasterStyle(basemap: Basemap) {
  return {
    version: 8 as const,
    sources: {
      base: {
        type: "raster" as const,
        tiles: [basemap.url],
        tileSize: basemap.tileSize ?? 256,
        attribution: basemap.attribution,
        maxzoom: basemap.maxzoom ?? 18,
      },
    },
    layers: [{ id: "base", type: "raster" as const, source: "base" }],
  };
}

function applyBasemap(map: MLMap, basemap: Basemap) {
  if (basemap.kind === "raster") {
    map.setStyle(rasterStyle(basemap));
  } else {
    map.setStyle(basemap.url);
  }
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
  '<a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noreferrer">NASA GIBS</a> · GOES-East/West ABI Fire Temperature';

const NDVI_ATTRIBUTION =
  '<a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noreferrer">NASA GIBS</a> · MODIS Terra NDVI 8-day';

// GOES-East + GOES-West ABI FireTemp — raster PNG, EPSG:3857, 10-minute
// interval, keyless. Together they cover the Americas and the Pacific;
// Europe / Africa / Asia are outside geostationary fire sensor range
// (those regions need FIRMS which requires a MAP_KEY — deferred).
const FIRES_MAX_ZOOM = 7;
const FIRES_EAST_SOURCE_ID = `${FIRES_SOURCE_ID}-east`;
const FIRES_WEST_SOURCE_ID = `${FIRES_SOURCE_ID}-west`;
const FIRES_EAST_LAYER_ID = `${FIRES_LAYER_ID}-east`;
const FIRES_WEST_LAYER_ID = `${FIRES_LAYER_ID}-west`;
const FIRES_EAST_URL =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GOES-East_ABI_FireTemp/default/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png";
const FIRES_WEST_URL =
  "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/GOES-West_ABI_FireTemp/default/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png";

function ensureFiresLayer(map: MLMap, opacity: number) {
  if (map.getLayer(FIRES_EAST_LAYER_ID)) return;
  [
    [FIRES_EAST_SOURCE_ID, FIRES_EAST_LAYER_ID, FIRES_EAST_URL],
    [FIRES_WEST_SOURCE_ID, FIRES_WEST_LAYER_ID, FIRES_WEST_URL],
  ].forEach(([sourceId, layerId, url]) => {
    if (map.getSource(sourceId)) map.removeSource(sourceId);
    map.addSource(sourceId, {
      type: "raster",
      tiles: [url],
      tileSize: 256,
      maxzoom: FIRES_MAX_ZOOM,
      attribution: FIRES_ATTRIBUTION,
    });
    map.addLayer({
      id: layerId,
      type: "raster",
      source: sourceId,
      maxzoom: FIRES_MAX_ZOOM + 1,
      paint: { "raster-opacity": opacity, "raster-fade-duration": 0 },
    });
  });
}

function updateFiresOpacity(map: MLMap, opacity: number) {
  [FIRES_EAST_LAYER_ID, FIRES_WEST_LAYER_ID].forEach((layerId) => {
    if (map.getLayer(layerId)) {
      map.setPaintProperty(layerId, "raster-opacity", opacity);
    }
  });
}

function removeFiresLayer(map: MLMap) {
  [FIRES_EAST_LAYER_ID, FIRES_WEST_LAYER_ID].forEach((layerId) => {
    if (map.getLayer(layerId)) map.removeLayer(layerId);
  });
  [FIRES_EAST_SOURCE_ID, FIRES_WEST_SOURCE_ID].forEach((sourceId) => {
    if (map.getSource(sourceId)) map.removeSource(sourceId);
  });
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
          <stop offset="0" stop-color="#22d3ee" stop-opacity="0.8"/>
          <stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
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
    basemapId: active,
    projection,
    weatherOn,
    weatherOpacity,
    railwayOn,
    railwayOpacity,
    firesOn,
    firesOpacity,
    ndviOn,
    ndviOpacity,
    setBasemapId: setActive,
    setProjection,
    setWeatherOn,
    setWeatherOpacity,
    setRailwayOn,
    setRailwayOpacity,
    setFiresOn,
    setFiresOpacity,
    setNdviOn,
    setNdviOpacity,
  } = useSettings();
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
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.matchMedia("(min-width: 768px)").matches;
  });
  const [geoStatus, setGeoStatus] = useState<string | null>(null);
  const [geoHeading, setGeoHeading] = useState<string | null>(null);

  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const initial = BASEMAPS.find((b) => b.id === active) ?? BASEMAPS[0];
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: initial.kind === "raster" ? rasterStyle(initial) : initial.url,
      center: view.center,
      zoom: view.zoom,
      minZoom: 2,
      maxZoom: 18,
      attributionControl: { compact: true },
      hash: true,
    });
    mapRef.current = map;
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

    const resizeObserver = new ResizeObserver(() => map.resize());
    resizeObserver.observe(containerRef.current);

    return () => {
      resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const basemap = BASEMAPS.find((b) => b.id === active);
    if (!basemap) return;
    applyBasemap(map, basemap);

    const reapply = () => {
      map.setProjection({ type: projection });
      if (sector) setSectorOutline(map, sector);
      if (overlayUrl && sector) setOverlay(map, overlayUrl, sector, overlayOpacity);
    };
    if (map.isStyleLoaded()) {
      setTimeout(reapply, 0);
    } else {
      map.once("load", reapply);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active]);

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

  useEffect(() => {
    if (!railwayOn) {
      const map = mapRef.current;
      if (map) removeRailwayLayer(map);
    }
  }, [railwayOn]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !railwayOn) return;
    const apply = () => ensureRailwayLayer(map, railwayOpacity);
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
  }, [railwayOn, active]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !railwayOn) return;
    updateRailwayOpacity(map, railwayOpacity);
  }, [railwayOn, railwayOpacity]);

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
      if (e.key === "Escape") setSidebarOpen(false);
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


  return (
    <div className="relative h-full w-full">
      <div ref={containerRef} className="h-full w-full" />

      {/* top-right: hamburger (always rendered) */}
      <div className="pointer-events-none absolute right-3 top-3 z-20">
        <SidebarToggle open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
      </div>

      {/* bottom-right: settings gear (opens credentials/api modal) */}
      {onOpenSettings && (
        <div className="pointer-events-none absolute bottom-3 right-3 z-20">
          <SettingsGear onOpen={onOpenSettings} />
        </div>
      )}

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
          onClick={() => setSidebarOpen(false)}
          aria-hidden
        />
      )}

      {/* right drawer: settings stack */}
      <div
        className={`absolute right-3 top-[3.75rem] z-10 flex max-h-[calc(100svh-4.5rem-env(safe-area-inset-bottom,0px))] flex-col gap-2 overflow-y-auto overscroll-contain pr-1 pb-[env(safe-area-inset-bottom,0px)] transition-transform duration-200 ease-out ${
          sidebarOpen
            ? "pointer-events-auto translate-x-0"
            : "pointer-events-none translate-x-[calc(100%+1rem)]"
        }`}
        aria-hidden={!sidebarOpen}
      >
        <HudPanel label="Basemap">
          <div className="flex flex-col gap-1">
            {BASEMAPS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => setActive(b.id)}
                className={`rounded-sm px-2.5 py-1.5 text-left transition-colors ${
                  active === b.id
                    ? "bg-[color:var(--hud-accent-glow)] text-[color:var(--hud-accent)] ring-1 ring-inset ring-[color:var(--hud-accent)]"
                    : "text-neutral-300 hover:bg-neutral-800"
                }`}
              >
                {b.label}
              </button>
            ))}
          </div>
        </HudPanel>

        <HudPanel className="hud-mono">
          <span className="text-[11px] text-neutral-400">
            {view.center[1].toFixed(4)}°, {view.center[0].toFixed(4)}° · z
            {view.zoom.toFixed(1)}
          </span>
        </HudPanel>

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

        <WeatherPanel
          enabled={weatherOn}
          onToggle={setWeatherOn}
          frames={weatherFrames}
          frameIndex={weatherFrameIndex}
          onFrameIndex={setWeatherFrameIndex}
          isPlaying={weatherPlaying}
          onPlayingChange={setWeatherPlaying}
          opacity={weatherOpacity}
          onOpacityChange={setWeatherOpacity}
          loading={weatherLoading}
        />
        <RailwayPanel
          enabled={railwayOn}
          onToggle={setRailwayOn}
          opacity={railwayOpacity}
          onOpacityChange={setRailwayOpacity}
        />
        <GibsOverlayPanel
          label="Fires"
          caption="GOES-East/West · 10 min · Americas + Pacific"
          enabled={firesOn}
          onToggle={setFiresOn}
          opacity={firesOpacity}
          onOpacityChange={setFiresOpacity}
        />
        <GibsOverlayPanel
          label="NDVI"
          caption="MODIS Terra · 8-day · 1km"
          enabled={ndviOn}
          onToggle={setNdviOn}
          opacity={ndviOpacity}
          onOpacityChange={setNdviOpacity}
        />
        <div aria-hidden className="h-20 shrink-0" />
      </div>
    </div>
  );
}

interface WeatherPanelProps {
  enabled: boolean;
  onToggle: (on: boolean) => void;
  frames: { time: number; date: string; urls: string[] }[];
  frameIndex: number;
  onFrameIndex: (i: number) => void;
  isPlaying: boolean;
  onPlayingChange: (p: boolean) => void;
  opacity: number;
  onOpacityChange: (o: number) => void;
  loading: boolean;
}

function WeatherPanel({
  enabled,
  onToggle,
  frames,
  frameIndex,
  onFrameIndex,
  isPlaying,
  onPlayingChange,
  opacity,
  onOpacityChange,
  loading,
}: WeatherPanelProps) {
  const currentFrame = frames[frameIndex];

  return (
    <HudPanel label="Clouds">
      <div className="flex flex-col items-stretch gap-2">
        <div className="flex items-center justify-between">
          {loading && enabled ? (
            <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-sky-400" aria-label="Loading tiles" />
          ) : (
            <span />
          )}
          <LedToggle enabled={enabled} onToggle={() => onToggle(!enabled)} label={enabled ? "Turn off" : "Turn on"} />
        </div>

      {enabled && frames.length > 0 && currentFrame && (
        <>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onPlayingChange(!isPlaying)}
              className="flex h-6 w-6 items-center justify-center rounded-md border border-neutral-700 text-neutral-300 hover:bg-neutral-800"
              aria-label={isPlaying ? "Pause" : "Play"}
            >
              {isPlaying ? (
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
              max={frames.length - 1}
              step={1}
              value={frameIndex}
              onChange={(e) => {
                onPlayingChange(false);
                onFrameIndex(Number(e.target.value));
              }}
              className="flex-1 hud-slider"
              style={{ ["--hud-fill" as string]: `${Math.round((frameIndex / Math.max(1, frames.length - 1)) * 100)}%` }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px]">
            <span className="text-neutral-400">
              {new Date(currentFrame.time * 1000).toLocaleDateString([], {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </span>
            <span className="text-neutral-500">
              {frameIndex + 1}/{frames.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase text-neutral-500">Opacity</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => onOpacityChange(Number(e.target.value))}
              className="w-24 hud-slider"
              style={{ ["--hud-fill" as string]: `${Math.round(opacity * 100)}%` }}
            />
            <span className="w-8 text-right text-[10px] text-neutral-400">
              {Math.round(opacity * 100)}%
            </span>
          </div>

          <div className="text-[10px] text-neutral-500">
            NASA GIBS · VIIRS SNPP true-color · daily
          </div>
        </>
      )}
      </div>
    </HudPanel>
  );
}

interface GibsOverlayPanelProps {
  label: string;
  caption: string;
  enabled: boolean;
  onToggle: (on: boolean) => void;
  opacity: number;
  onOpacityChange: (o: number) => void;
}

function GibsOverlayPanel({
  label,
  caption,
  enabled,
  onToggle,
  opacity,
  onOpacityChange,
}: GibsOverlayPanelProps) {
  return (
    <HudPanel label={label}>
      <div className="flex flex-col items-stretch gap-2">
        <div className="flex items-center justify-between">
          <span />
          <LedToggle
            enabled={enabled}
            onToggle={() => onToggle(!enabled)}
            label={enabled ? "Turn off" : "Turn on"}
          />
        </div>

        {enabled && (
          <>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase text-neutral-500">Opacity</span>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(e) => onOpacityChange(Number(e.target.value))}
                className="w-24 hud-slider"
                style={{ ["--hud-fill" as string]: `${Math.round(opacity * 100)}%` }}
              />
              <span className="w-8 text-right text-[10px] text-neutral-400">
                {Math.round(opacity * 100)}%
              </span>
            </div>
            <div className="text-[10px] text-neutral-500">{caption}</div>
          </>
        )}
      </div>
    </HudPanel>
  );
}

interface RailwayPanelProps {
  enabled: boolean;
  onToggle: (on: boolean) => void;
  opacity: number;
  onOpacityChange: (o: number) => void;
}

function RailwayPanel({
  enabled,
  onToggle,
  opacity,
  onOpacityChange,
}: RailwayPanelProps) {
  return (
    <HudPanel label="Rail">
      <div className="flex flex-col items-stretch gap-2">
      <div className="flex items-center justify-between">
        <span />
        <LedToggle enabled={enabled} onToggle={() => onToggle(!enabled)} label={enabled ? "Turn off" : "Turn on"} />
      </div>

      {enabled && (
        <>
          <div className="flex items-center gap-2">
            <span className="text-[10px] uppercase text-neutral-500">Opacity</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => onOpacityChange(Number(e.target.value))}
              className="w-24 hud-slider"
              style={{ ["--hud-fill" as string]: `${Math.round(opacity * 100)}%` }}
            />
            <span className="w-8 text-right text-[10px] text-neutral-400">
              {Math.round(opacity * 100)}%
            </span>
          </div>
          <div className="text-[10px] text-neutral-500">
            OpenRailwayMap · OSM
          </div>
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
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-sky-400" aria-label="Loading" />
        ) : null}
        {active && (
          <button
            type="button"
            onClick={onClear}
            className="text-[10px] text-neutral-500 hover:text-neutral-200"
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
          className="rounded-lg bg-sky-500 px-3 py-1.5 font-medium text-black hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
        >
          {state.kind === "searching" ? "Searching catalog…" : "Start for this view"}
        </button>
      )}

      {!credentials && (
        <p className="max-w-[220px] text-[11px] text-neutral-400">
          Add credentials in the header to load snapshots.
        </p>
      )}
      {credentials && !zoomOk && !active && (
        <p className="max-w-[220px] text-[11px] text-amber-400">
          Zoom in to z{minZoom} or closer first
        </p>
      )}
      {state.kind === "error" && (
        <p className="max-w-[240px] break-words text-[11px] text-red-400">
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
              className="flex h-6 w-6 items-center justify-center rounded-md border border-neutral-700 text-neutral-300 hover:bg-neutral-800 disabled:opacity-40"
              aria-label="Previous snapshot"
            >
              ‹
            </button>
            <div className="flex-1 text-center">
              <div className="font-mono text-[11px] text-neutral-100">
                {new Date(current.datetime).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </div>
              <div className="text-[10px] text-neutral-500">
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
              className="flex h-6 w-6 items-center justify-center rounded-md border border-neutral-700 text-neutral-300 hover:bg-neutral-800 disabled:opacity-40"
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
            <span className="text-[10px] uppercase text-neutral-500">Opacity</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => onOpacityChange(Number(e.target.value))}
              className="w-24 hud-slider"
              style={{ ["--hud-fill" as string]: `${Math.round(opacity * 100)}%` }}
            />
            <span className="w-8 text-right text-[10px] text-neutral-400">
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
    if (isActive) return "bg-white ring-1 ring-white";
    if (cc == null) return "bg-sky-400";
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
