// Ambient declaration for the OHM date plugin. The package ships no
// types; this is the minimal surface we use (filterByDate). The plugin
// also exports several helper functions, but we don't call them.
declare module "@openhistoricalmap/maplibre-gl-dates" {
  import type { Map as MLMap } from "maplibre-gl";
  /**
   * Constrain every layer's filter so only features whose lifespan
   * overlaps the given date remain visible. Mutates the style in place
   * via `map.setFilter`.
   */
  export function filterByDate(map: MLMap, date: string | Date): void;
}
