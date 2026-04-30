export type GibsLayer =
  | "MODIS_Terra_CorrectedReflectance_TrueColor"
  | "MODIS_Aqua_CorrectedReflectance_TrueColor"
  | "VIIRS_NOAA20_CorrectedReflectance_TrueColor"
  | "VIIRS_NOAA21_CorrectedReflectance_TrueColor"
  | "VIIRS_SNPP_Thermal_Anomalies_375m_All"
  | "VIIRS_NOAA20_Thermal_Anomalies_375m_All"
  | "MODIS_Terra_NDVI_8Day"
  | "MODIS_Aqua_NDVI_8Day";

export type GibsFormat = "jpg" | "png";

export interface GibsTileOptions {
  layer: GibsLayer;
  date: string;
  level?: number;
  format?: GibsFormat;
}

export function gibsTileUrl({
  layer,
  date,
  level = 9,
  format = "jpg",
}: GibsTileOptions): string {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${date}/GoogleMapsCompatible_Level${level}/{z}/{y}/{x}.${format}`;
}

export function gibsYesterday(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function gibsDateNDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

export interface GibsLiveFrame {
  time: number; // epoch seconds
  isoTime: string; // YYYY-MM-DDTHH:MM:SSZ
  url: string; // tile URL template with {z}/{y}/{x}
}

/**
 * NASA GPM IMERG Precipitation Rate: GLOBAL precipitation, 30-min
 * cadence, ~4 h delivery lag (Early Run). Free, no auth, no API key.
 * This is the only single-source product that gives true global live
 * weather coverage — geostationary satellites only cover their disc,
 * RainViewer's radar coverage stops at the edges of national radar
 * networks. IMERG fuses every weather satellite into one mosaic and
 * just works everywhere.
 *
 * Tile matrix `GoogleMapsCompatible_Level6` (z 0-6) for the EPSG:3857
 * endpoint; MapLibre overzooms past z=6.
 */
export function gibsImergUrl(opts: { time: string }): string {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/IMERG_Precipitation_Rate/default/${opts.time}/GoogleMapsCompatible_Level6/{z}/{y}/{x}.png`;
}

function alignTo30Min(d: Date): Date {
  const out = new Date(d);
  out.setUTCMinutes(out.getUTCMinutes() < 30 ? 0 : 30);
  out.setUTCSeconds(0);
  out.setUTCMilliseconds(0);
  return out;
}

function gibsIsoTime(d: Date): string {
  return d.toISOString().slice(0, 19) + "Z";
}

/**
 * Generate `count` IMERG frames ending `lagMin` minutes before now,
 * aligned to 30-min boundaries. Default returns 13 frames covering
 * the past ~6 hours, ending 4 h ago (typical IMERG Early Run lag).
 */
export function gibsImergRecentFrames(opts: {
  count?: number;
  intervalMin?: number;
  lagMin?: number;
  startFromIsoTime?: string;
} = {}): GibsLiveFrame[] {
  const count = opts.count ?? 13;
  const intervalMin = opts.intervalMin ?? 30;
  const lagMin = opts.lagMin ?? 240;
  let youngest: Date;
  if (opts.startFromIsoTime) {
    youngest = new Date(opts.startFromIsoTime);
  } else {
    youngest = alignTo30Min(new Date(Date.now() - lagMin * 60_000));
  }
  const frames: GibsLiveFrame[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(youngest.getTime() - i * intervalMin * 60_000);
    const isoTime = gibsIsoTime(t);
    frames.push({
      time: Math.floor(t.getTime() / 1000),
      isoTime,
      url: gibsImergUrl({ time: isoTime }),
    });
  }
  return frames;
}

/**
 * NASA GIBS GeoColor: live cloud imagery from geostationary satellites.
 * GOES-East covers Americas + Atlantic + western Europe at the disc's
 * eastern edge. Tile matrix `GoogleMapsCompatible_Level7` (z 0-7) for
 * the EPSG:3857 endpoint; MapLibre overzooms past z=7.
 *
 * Kept as a fallback if IMERG isn't reachable. The URL TIME segment
 * must be aligned to 10-min boundaries.
 */
export function gibsGeoColorUrl(opts: { time: string; satellite?: "east" | "west" }): string {
  const layer =
    opts.satellite === "west" ? "GOES-West_ABI_GeoColor" : "GOES-East_ABI_GeoColor";
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${opts.time}/GoogleMapsCompatible_Level7/{z}/{y}/{x}.png`;
}

/**
 * Generate `count` GeoColor frames at 10-min cadence ending `lagMin`
 * minutes before now. Default 13 frames over past ~2 hours, ending
 * 30 min ago.
 */
export function gibsGeoColorRecentFrames(opts: {
  count?: number;
  intervalMin?: number;
  lagMin?: number;
  satellite?: "east" | "west";
} = {}): GibsLiveFrame[] {
  const count = opts.count ?? 13;
  const intervalMin = opts.intervalMin ?? 10;
  const lagMin = opts.lagMin ?? 30;
  const now = new Date();
  const youngest = new Date(now.getTime() - lagMin * 60_000);
  // Floor to the 10-min boundary so the URL matches an actual GIBS frame.
  youngest.setUTCMinutes(Math.floor(youngest.getUTCMinutes() / 10) * 10);
  youngest.setUTCSeconds(0);
  youngest.setUTCMilliseconds(0);
  const frames: GibsLiveFrame[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const t = new Date(youngest.getTime() - i * intervalMin * 60_000);
    const isoTime = gibsIsoTime(t);
    frames.push({
      time: Math.floor(t.getTime() / 1000),
      isoTime,
      url: gibsGeoColorUrl({ time: isoTime, satellite: opts.satellite }),
    });
  }
  return frames;
}
