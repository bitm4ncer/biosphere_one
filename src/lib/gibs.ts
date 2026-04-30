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

/**
 * NASA GIBS GeoColor: live cloud imagery from geostationary satellites.
 * GOES-East covers Americas + Atlantic + western Europe at the disc's
 * eastern edge. Tile matrix `2km` (z 0-6); MapLibre overzooms past z=6.
 *
 * The URL TIME segment must be aligned to 10-min boundaries.
 * GIBS publishes new GeoColor frames roughly 25-40 min after the
 * sensor pass; the `lagMin` parameter accounts for that.
 */
export function gibsGeoColorUrl(opts: { time: string; satellite?: "east" | "west" }): string {
  const layer =
    opts.satellite === "west" ? "GOES-West_ABI_GeoColor" : "GOES-East_ABI_GeoColor";
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${opts.time}/2km/{z}/{y}/{x}.png`;
}

export interface GibsLiveFrame {
  time: number; // epoch seconds
  isoTime: string; // YYYY-MM-DDTHH:MM:SSZ
  url: string; // tile URL template with {z}/{y}/{x}
}

/**
 * Generate `count` frames at `intervalMin` cadence ending `lagMin`
 * minutes before now, aligned to 10-min boundaries. Default returns
 * 13 frames covering the past ~2 hours, ending 30 min ago (the
 * youngest frame GIBS reliably has published).
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
    const isoTime = t.toISOString().slice(0, 19) + "Z";
    frames.push({
      time: Math.floor(t.getTime() / 1000),
      isoTime,
      url: gibsGeoColorUrl({ time: isoTime, satellite: opts.satellite }),
    });
  }
  return frames;
}
