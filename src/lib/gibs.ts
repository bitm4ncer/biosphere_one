export type GibsLayer =
  | "MODIS_Terra_CorrectedReflectance_TrueColor"
  | "MODIS_Aqua_CorrectedReflectance_TrueColor"
  | "VIIRS_SNPP_CorrectedReflectance_TrueColor";

export interface GibsTileOptions {
  layer: GibsLayer;
  date: string;
  level?: number;
}

export function gibsTileUrl({
  layer,
  date,
  level = 9,
}: GibsTileOptions): string {
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${layer}/default/${date}/GoogleMapsCompatible_Level${level}/{z}/{y}/{x}.jpg`;
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
