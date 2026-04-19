export const RAILWAY_MAX_ZOOM = 19;

export const RAILWAY_ATTRIBUTION =
  '<a href="https://www.openrailwaymap.org/" target="_blank" rel="noreferrer">OpenRailwayMap</a> · &copy; OpenStreetMap contributors (<a href="https://creativecommons.org/licenses/by-sa/2.0/" target="_blank" rel="noreferrer">CC-BY-SA</a>)';

export const RAILWAY_TILE_URLS: string[] = ["a", "b", "c"].map(
  (s) => `https://${s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png`,
);
