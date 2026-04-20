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

export const BASEMAPS: Basemap[] = [
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
    url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png",
    maxzoom: 8,
    attribution: `${GIBS_ATTRIB} · VIIRS Black Marble (2016)`,
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

export const DEFAULT_BASEMAP_ID = "s2cloudless-2024";
