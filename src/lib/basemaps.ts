export interface Basemap {
  id: string;
  label: string;
  kind: "raster" | "style";
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

export const BASEMAPS: Basemap[] = [
  {
    id: "s2cloudless-2024",
    label: "Sentinel-2 · 2024",
    kind: "raster",
    url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2024_3857/default/g/{z}/{y}/{x}.jpg",
    maxzoom: 15,
    attribution: `${EOX_ATTRIB} 2024`,
  },
  {
    id: "s2cloudless-2023",
    label: "Sentinel-2 · 2023",
    kind: "raster",
    url: "https://tiles.maps.eox.at/wmts/1.0.0/s2cloudless-2023_3857/default/g/{z}/{y}/{x}.jpg",
    maxzoom: 15,
    attribution: `${EOX_ATTRIB} 2023`,
  },
  {
    id: "night",
    label: "Night · Black Marble",
    kind: "raster",
    url: "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_Black_Marble/default/2016-01-01/GoogleMapsCompatible_Level8/{z}/{y}/{x}.png",
    maxzoom: 8,
    attribution: `${GIBS_ATTRIB} · VIIRS Black Marble (2016)`,
  },
  {
    id: "terrain",
    label: "Terrain",
    kind: "raster",
    url: "https://tiles.maps.eox.at/wmts/1.0.0/terrain-light_3857/default/g/{z}/{y}/{x}.jpg",
    maxzoom: 11,
    attribution: EOX_ATTRIB,
  },
  {
    id: "streets-dark",
    label: "Streets · dark",
    kind: "style",
    url: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
    maxzoom: 19,
    attribution: CARTO_ATTRIB,
  },
  {
    id: "streets-light",
    label: "Streets · light",
    kind: "style",
    url: "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json",
    maxzoom: 19,
    attribution: CARTO_ATTRIB,
  },
];

export const DEFAULT_BASEMAP_ID = "s2cloudless-2024";
