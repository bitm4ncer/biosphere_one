# Rail Network Layer — Design

Date: 2026-04-19
Status: approved via brainstorming session, ready for implementation plan

## Goal

Add a worldwide rail network overlay to the existing MapLibre-based client-side map. Tracks and stations must be visually differentiated by type (high-speed, main, branch, subway, light rail, tram, disused, etc.). No filtering UI; the overlay shows the full network, with the user controlling only visibility and opacity. The network must stay current as OpenStreetMap contributors add new lines over time.

This is the first of several planned "transportation / movement" layers. Fire and thermal anomalies (NASA GIBS) are the next candidate; a clickable global station metadata layer is a future follow-up (see "Out of scope" below).

## Non-goals

- Real-time train positions. Rejected during brainstorming: no global feed exists; per-country APIs (DB, SNCF, NS, Darwin UK, SBB HAFAS) are fragmented and mostly interpolated. Separate initiative if pursued later.
- Filter toggles that show/hide categories (e.g., "only high-speed"). Rejected because raster tiles cannot be filtered post-hoc; true filtering would require self-hosted vector tiles or viewport-scoped Overpass queries, both considered overkill for this pass.
- Clickable stations with popups / metadata. Future layer, uses a different data path (static GeoJSON bundle or Overpass), independent of this spec.

## Data source

**OpenRailwayMap**, `standard` style raster tiles, live-rendered from OSM.

- Tile URL template: `https://{s}.tiles.openrailwaymap.org/standard/{z}/{x}/{y}.png`
- Subdomain shards: `a`, `b`, `c`
- Max native zoom: 19
- License / attribution: `© OpenStreetMap contributors, Style: OpenRailwayMap (CC-BY-SA)`
- Auto-update: server-side from OSM. No rebuild work on our side.
- Transparent over dark and light basemaps. The standard style already encodes track type (color), usage (width/dash), electrification hints, and renders station names at appropriate zoom levels.

Fallback policy: if the tile server returns errors, MapLibre silently fails per-tile. No error UI; the existing `map.on("error")` filter already swallows the relevant AJAX failures.

## Architecture

Pattern mirrors the existing weather/clouds layer exactly (see [Map.tsx:73-111](src/components/Map.tsx:73)):

1. Raster source added to the MapLibre style.
2. Raster layer rendered with `raster-opacity` bound to a state slider.
3. On basemap switch, the layer is re-applied inside the existing `active`-change effect (same lifecycle bug the weather layer already handles).
4. Persisted settings (on/off, opacity) live in the Zustand store.

Works natively on both `mercator` and `globe` projections (MapLibre 5 supports raster layers on both).

## Components and file changes

### New: `src/lib/railway.ts`

Analogous to `src/lib/gibs.ts`. Exports:
- `RAILWAY_TILE_URLS: string[]` — the three subdomain-expanded URL templates for MapLibre's `tiles` array.
- `RAILWAY_ATTRIBUTION: string` — HTML-safe attribution string.
- `RAILWAY_MAX_ZOOM: number` — `19`.

No network fetches at import time; just constants + a helper to build the tile array.

### Edit: `src/components/Map.tsx`

New helpers next to the weather-layer helpers:
- `ensureRailwayLayer(map, opacity)` — adds source + layer if absent. Source id: `"railway"`. Layer id: `"railway-layer"`.
- `removeRailwayLayer(map)` — tears both down.
- `updateRailwayOpacity(map, opacity)` — setter for `raster-opacity`.

New effects:
- Mount/unmount effect gated on `railwayOn`, mirroring `weatherOn`.
- Opacity effect gated on `railwayOn` + `railwayOpacity`.
- Re-apply logic added inside the existing `[active]` effect so the layer survives basemap changes.

New UI component in the same file: `RailwayPanel`, structurally identical to `WeatherPanel` minus the frame slider, play button, and date display:
- Header row: `"Rail"` label + `PillToggle`.
- When enabled: `Opacity` row with slider (0–1, step 0.05) and percentage readout.
- Footer: `"OpenRailwayMap · OSM"` attribution note.

Rendered in the left side-panel column, placed directly after `<WeatherPanel ... />`.

### Edit: `src/lib/settings.ts`

Add two persisted fields to the `Settings` interface, the store initializer, the `partialize` projection, and the persist `version` (bump to `3`). A migration entry for `version: 2 → 3` is added that simply ensures the new fields have defaults if missing (no destructive changes):

- `railwayOn: boolean` — default `false`
- `railwayOpacity: number` — default `0.85`
- `setRailwayOn: (on: boolean) => void`
- `setRailwayOpacity: (o: number) => void`

### No other files change.

No new dependencies. No backend. No auth. No build-step changes. No new env vars.

## Error handling

Existing coverage is sufficient:
- Failed tile fetches are already filtered by the `map.on("error")` handler ([Map.tsx:237-248](src/components/Map.tsx:237)).
- If the OpenRailwayMap tile server is down entirely, tiles simply don't appear; basemap and other overlays remain functional.
- Basemap switches: the `[active]` effect re-applies overlay layers after `setStyle`. The same pattern solves the rail layer's re-apply need — extend the existing effect, don't add a new one.

No user-facing error toasts, no retry logic, no telemetry.

## Persistence

Matches the existing weather pattern. Both fields are included in the `partialize` projection so they hit localStorage under the existing `biosphere1:settings` key. URL hash is not used for this layer (consistent with weather).

## Verification

Preview-based verification after implementation (the overlay is browser-observable):

1. Start dev server bound to all interfaces so it is reachable from other machines on the LAN:
   `npx next dev -H 0.0.0.0 -p 3000`
   Do **not** modify the `dev` script in `package.json` — the flag is passed at invocation time.
2. Toggle rail layer on, confirm tiles render worldwide at low zoom (z=2), regional zoom (z=8), and high zoom (z=14).
3. Toggle on both `mercator` and `globe` projections; confirm the layer re-appears after each switch.
4. Switch basemaps (Sentinel-2, Black Marble, EOX Terrain); confirm the rail overlay re-attaches after each switch.
5. Opacity slider: confirm full range 0–100% works and the percentage readout updates.
6. Reload page: confirm `railwayOn` and `railwayOpacity` persist.
7. Confirm attribution line is visible.
8. Confirm that with rail off, no `railway-layer` exists (devtools `__map.getLayer('railway-layer')` returns undefined).

After browser verification, share a screenshot of the enabled state (ideally on globe projection over Europe, where the network is densest).

## Out of scope (roadmap pointers)

- **Station metadata layer (future)**: static GeoJSON bundle of ~50-100k global stations with coordinates, names, UIC refs, wikidata ids. Built from OSM extract or Wikidata SPARQL query, checked into `public/`. Powers search-by-station-name and "fly to station" features. Independent of this layer.
- **Style switcher (future)**: expose OpenRailwayMap's alternate styles (`maxspeed`, `electrification`, `gauge`, `signals`) via a compact style selector in the rail panel. Additive, no architectural change needed.
- **Fire / thermal anomalies layer (next planned layer)**: NASA GIBS MODIS/VIIRS active fires; same raster-overlay pattern as clouds and rail.
