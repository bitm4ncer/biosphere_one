// src/lib/history/basemap.ts
//
// "Time-Travel" basemap: when the master History toggle is on AND the
// basemap layer is on, we swap the entire MapLibre style for OHM's
// official "historical" style. The slider year is then applied via the
// upstream `@openhistoricalmap/maplibre-gl-dates` plugin, which rewrites
// every layer filter so only features whose lifespan covers the chosen
// date remain visible.
//
// We pin a specific @openhistoricalmap/map-styles version on unpkg
// rather than installing the full package — the npm tarball is ~130 MB
// because it ships sprites/glyphs/fonts/UI assets we don't need at
// build time. The style JSON itself references its own glyph + sprite
// CDN, so MapLibre fetches them on demand.

import { filterByDate as ohmFilterByDate } from "@openhistoricalmap/maplibre-gl-dates";
import type { Map as MLMap } from "maplibre-gl";

export const OHM_STYLES_VERSION = "0.9.15";

export const OHM_HISTORICAL_STYLE_URL =
  `https://unpkg.com/@openhistoricalmap/map-styles@${OHM_STYLES_VERSION}/dist/historical/historical.json`;

export const OHM_ATTRIBUTION =
  '© <a href="https://www.openhistoricalmap.org/" target="_blank" rel="noreferrer">OpenHistoricalMap</a> contributors';

/** Sentinel basemap id — never appears in the BASEMAPS picker. */
export const OHM_HISTORICAL_BASEMAP_ID = "ohm-historical";

/**
 * Convert the slider year into a date string the OHM plugin accepts. We
 * pick the last day of the year so any feature whose `start_date` is
 * `1942` or `1942-06-01` passes the comparison — the user thinks in
 * years, not days.
 */
export function historyYearToDateString(year: number): string {
  // The plugin tokenises a `YYYY` literal correctly (validated against
  // the regex in dateRangeFromISODate); padded to four digits so the
  // ISO comparison against feature start_date strings is lexically
  // safe (e.g. `0500` < `1485`).
  const sign = year < 0 ? "-" : "";
  const abs = Math.abs(year);
  return `${sign}${String(abs).padStart(4, "0")}`;
}

/**
 * Apply the slider year to every layer in the currently loaded style.
 * Call this after style.load (and again on every year change). Cheap —
 * the plugin mutates filters in place once it has injected its `let`
 * scaffolding.
 */
export function applyOhmDate(map: MLMap, year: number): void {
  if (!map.isStyleLoaded()) return;
  ohmFilterByDate(map, historyYearToDateString(year));
}
