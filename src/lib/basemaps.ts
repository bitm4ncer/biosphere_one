export type BasemapCategory = "photo" | "vector";

export interface Basemap {
  id: string;
  label: string;
  kind: "raster" | "style";
  category: BasemapCategory;
  url: string;
  maxzoom?: number;
  attribution: string;
  tileSize?: number;
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

/**
 * Special placeholder in a basemap URL that the renderer replaces with the
 * most recent date NASA GIBS reliably has imagery for (yesterday UTC).
 */
export const GIBS_TODAY_DATE_PLACEHOLDER = "__GIBS_TODAY__";

export const BASEMAPS: Basemap[] = [
  {
    id: "gibs-today",
    label: "NASA GIBS Today",
    kind: "raster",
    category: "photo",
    url: `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_SNPP_CorrectedReflectance_TrueColor/default/${GIBS_TODAY_DATE_PLACEHOLDER}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`,
    maxzoom: 9,
    attribution: `${GIBS_ATTRIB} · VIIRS SNPP True Color · ~250 m, daily`,
  },
  {
    id: "s2cloudless-2024",
    label: "Sentinel-2 · 2024",
    kind: "raster",
    category: "photo",
    url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg",
    maxzoom: 15,
    attribution: `${EOX_ATTRIB} 2024`,
  },
  {
    id: "s2cloudless-2023",
    label: "Sentinel-2 · 2023",
    kind: "raster",
    category: "photo",
    url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg",
    maxzoom: 15,
    attribution: `${EOX_ATTRIB} 2023`,
  },
  {
    id: "s2cloudless-2022",
    label: "Sentinel-2 · 2022",
    kind: "raster",
    category: "photo",
    url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2022_3857/default/g/{z}/{y}/{x}.jpg",
    maxzoom: 15,
    attribution: `${EOX_ATTRIB} 2022`,
  },
  {
    id: "s2cloudless-2021",
    label: "Sentinel-2 · 2021",
    kind: "raster",
    category: "photo",
    url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2021_3857/default/g/{z}/{y}/{x}.jpg",
    maxzoom: 15,
    attribution: `${EOX_ATTRIB} 2021`,
  },
  {
    id: "s2cloudless-2020",
    label: "Sentinel-2 · 2020",
    kind: "raster",
    category: "photo",
    url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2020_3857/default/g/{z}/{y}/{x}.jpg",
    maxzoom: 15,
    attribution: `${EOX_ATTRIB} 2020`,
  },
  {
    id: "s2cloudless-2019",
    label: "Sentinel-2 · 2019",
    kind: "raster",
    category: "photo",
    url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2019_3857/default/g/{z}/{y}/{x}.jpg",
    maxzoom: 15,
    attribution: `${EOX_ATTRIB} 2019`,
  },
  {
    id: "s2cloudless-2018",
    label: "Sentinel-2 · 2018",
    kind: "raster",
    category: "photo",
    url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2018_3857/default/g/{z}/{y}/{x}.jpg",
    maxzoom: 15,
    attribution: `${EOX_ATTRIB} 2018`,
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

export const DEFAULT_IMAGE_BASEMAP_ID = "s2cloudless-2024";
export const DEFAULT_VECTOR_BASEMAP_ID = "voyager";
