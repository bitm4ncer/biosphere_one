import { gibsYesterday } from "./gibs";

export type BasemapCategory = "photo" | "vector";

export interface BasemapVariant {
  id: string;
  label: string;
  /** Substituted into the URL where the placeholder appears. */
  urlValue: string;
}

export interface BasemapVariantSpec {
  /** String in the basemap URL that gets replaced (e.g. "${year}"). */
  placeholder: string;
  options: BasemapVariant[];
  defaultId: string;
}

export interface Basemap {
  id: string;
  label: string;
  kind: "raster" | "style";
  category: BasemapCategory;
  url: string;
  maxzoom?: number;
  attribution: string;
  tileSize?: number;
  /** Optional run-time URL parameters (e.g. year, date). */
  variants?: BasemapVariantSpec;
}

const EOX_ATTRIB =
  '<a href="https://s2maps.eu" target="_blank" rel="noreferrer">Sentinel-2 cloudless</a> by <a href="https://eox.at" target="_blank" rel="noreferrer">EOX IT Services GmbH</a> (Contains modified Copernicus Sentinel data)';

const CARTO_ATTRIB =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions" target="_blank" rel="noreferrer">CARTO</a>';

const GIBS_ATTRIB =
  '<a href="https://earthdata.nasa.gov/gibs" target="_blank" rel="noreferrer">NASA GIBS</a>';

const ESRI_ATTRIB =
  '<a href="https://www.esri.com/" target="_blank" rel="noreferrer">Esri</a>, Maxar, Earthstar Geographics, and the GIS User Community';

const OSM_ATTRIB =
  '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors';

const OPENTOPO_ATTRIB = `${OSM_ATTRIB}, SRTM | © <a href="https://opentopomap.org/" target="_blank" rel="noreferrer">OpenTopoMap</a> (CC-BY-SA)`;

/** Special placeholder replaced at render time with yesterday's UTC date. */
export const GIBS_TODAY_DATE_PLACEHOLDER = "__GIBS_TODAY__";

const S2_YEARS = [2024, 2023, 2022, 2021, 2020, 2019, 2018];

export const BASEMAPS: Basemap[] = [
  {
    id: "gibs-today",
    label: "NASA GIBS Today",
    kind: "raster",
    category: "photo",
    // NOAA-20 VIIRS — primary daily true-color since SNPP went offline in March 2026.
    url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/${GIBS_TODAY_DATE_PLACEHOLDER}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
    maxzoom: 9,
    attribution: `${GIBS_ATTRIB} · VIIRS NOAA-20 True Color · ~250 m, daily`,
  },
  {
    id: "s2cloudless",
    label: "Sentinel-2",
    kind: "raster",
    category: "photo",
    url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-${year}_3857/default/g/{z}/{y}/{x}.jpg",
    maxzoom: 15,
    attribution: EOX_ATTRIB,
    variants: {
      placeholder: "${year}",
      options: S2_YEARS.map((y) => ({
        id: String(y),
        label: String(y),
        urlValue: String(y),
      })),
      defaultId: "2024",
    },
  },
  {
    id: "esri-imagery",
    label: "Satellite · HD",
    kind: "raster",
    category: "photo",
    url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
    maxzoom: 19,
    attribution: ESRI_ATTRIB,
  },
  {
    id: "night",
    label: "Night · Black Marble",
    kind: "raster",
    category: "photo",
    url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2023-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png",
    maxzoom: 8,
    attribution: `${GIBS_ATTRIB} · VIIRS Black Marble (2023)`,
  },
  {
    id: "terrain",
    label: "Terrain",
    kind: "raster",
    category: "vector",
    url: "https://tiles.maps.eox.at/wmts/1.0.0/terrain-light_3857/default/g/{z}/{y}/{x}.jpg",
    maxzoom: 11,
    attribution: EOX_ATTRIB,
  },
  {
    id: "opentopo",
    label: "Topographic",
    kind: "raster",
    category: "vector",
    url: "https://a.tile.opentopomap.org/{z}/{x}/{y}.png",
    maxzoom: 17,
    attribution: OPENTOPO_ATTRIB,
  },
  {
    id: "voyager",
    label: "Voyager",
    kind: "style",
    category: "vector",
    url: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
    maxzoom: 19,
    attribution: CARTO_ATTRIB,
  },
  {
    id: "streets-dark",
    label: "Streets · dark",
    kind: "style",
    category: "vector",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    maxzoom: 19,
    attribution: CARTO_ATTRIB,
  },
  {
    id: "streets-light",
    label: "Streets · light",
    kind: "style",
    category: "vector",
    url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    maxzoom: 19,
    attribution: CARTO_ATTRIB,
  },
];

export const DEFAULT_IMAGE_BASEMAP_ID = "s2cloudless";
export const DEFAULT_VECTOR_BASEMAP_ID = "voyager";

export function getActiveVariant(
  basemap: Basemap,
  variantId: string | undefined,
): BasemapVariant | null {
  if (!basemap.variants) return null;
  const list = basemap.variants.options;
  return (
    list.find((v) => v.id === variantId) ??
    list.find((v) => v.id === basemap.variants!.defaultId) ??
    list[0] ??
    null
  );
}

/**
 * Build the final tile URL for a basemap, substituting any dynamic
 * placeholders (variants like ${year}, time-based __GIBS_TODAY__).
 */
export function resolveBasemapUrl(
  basemap: Basemap,
  variantId?: string,
): string {
  let url = basemap.url;
  if (basemap.variants) {
    const variant = getActiveVariant(basemap, variantId);
    if (variant) {
      url = url.replaceAll(basemap.variants.placeholder, variant.urlValue);
    }
  }
  if (url.includes(GIBS_TODAY_DATE_PLACEHOLDER)) {
    url = url.replaceAll(GIBS_TODAY_DATE_PLACEHOLDER, gibsYesterday());
  }
  return url;
}

