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
