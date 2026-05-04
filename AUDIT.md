# Biosphere1 — Audit

_First written: 2026-05-04 — pre-refactor pass._
_Updated: 2026-05-04 — after the refactor; see §7 for the post-refactor delta._

## 0. Tooling caveat

The original brief asked for verification via the Chrome DevTools MCP server
(console logs, network waterfall, performance traces, responsive-mode
screenshots). That MCP server is **not registered in this session** — only the
GitHub and Notion MCP servers are available. As a result, every finding below
is derived from a static read of the codebase. Numeric runtime metrics
(LCP, TTI, cache-hit ratios, frame timings) are **not measured**; instead the
audit calls out the code paths that govern them and the expected qualitative
behaviour. When something can only be confirmed in a real browser, that is
flagged inline with `[runtime-only]`.

## 1. Functionality

### 1.1 Feature inventory (pre-refactor)

| Surface | State |
| --- | --- |
| Basemap picker (image/vector/hybrid) | Working. Sentinel-2 cloudless, Black Marble, EOX Terrain, GIBS-today, Carto vector. |
| Sidebar (mobile bottom-sheet, desktop side-drawer) | Working on mobile. Desktop has a navigation gap — see §1.2. |
| Map Controls pane | Working (basemap, overlay, timeline). |
| Biosphere pane | Working (Land Cover, Species, Forest Loss, NO₂, Protected Areas). |
| History pane | Working with caveats — see §1.2. |
| Routes (hiking) pane | Working. |
| Live location + compass | Working. Documented HTTPS / iOS-permission caveats in README. |
| Search (Photon / OSM) | Working. |
| Timeline · Year (S2 cloudless year switcher) | Working. |
| Timeline · Daily (GIBS day-offset 0..14) | Working. |
| Timeline · Snapshots (Copernicus catalog → Sentinel-2 frames) | Working with credentials. |
| Overlay · Clouds (NASA GPM IMERG precipitation) | Working but **scheduled for removal** per Phase 3. |
| Overlay · Rail (ORM tiles + Overpass lines + stations) | Working. |
| Overlay · Fires (VIIRS Thermal Anomalies) | Working but **scheduled for removal**. |
| Overlay · NDVI (MODIS 8-day) | Working but **scheduled to move into Biosphere** as a stackable layer. |

### 1.2 Bugs and gaps

#### Desktop navigation gap (Phase 2 task)

- `src/components/Map.tsx:3704-3713` — the desktop side-handle column (`.hud-side-handles`)
  exposes only `SidebarToggle` (Map Controls) and `HikingToggle` (Routes).
- `src/app/globals.css:382-391` — `.hud-sheet-tabs` is hidden by default and
  shown only on `(max-width: 767px)`. So the in-panel tab strip that exposes
  Biosphere and History is mobile-only.
- **Symptom:** on desktop a user can switch between *Map Controls* and *Routes*
  via the side handles, but **Biosphere** and **History** are unreachable
  unless the user has previously selected them on a smaller viewport
  (`activePane` state is in-memory only, not persisted).
- **Repro:** open the app at ≥768 px width with no localStorage state. There
  is no UI affordance to navigate to Biosphere or History.
- **Fix plan:** unhide `.hud-sheet-tabs` on desktop, drop the redundant
  side-handle column. (Considered: adding two more side handles. Rejected —
  the `.hud-sheet-tabs` row already exists, is keyboard-accessible, and labels
  every pane unambiguously.)

#### Historic Landmarks display (Phase 2 task)

Code review of `src/components/Map.tsx:3013-3183` and
`src/lib/history/landmarks.ts`:

- The **year-slider UI is only rendered when Timeline-Map is on**
  (`HistoryPanel.tsx:75-83`). Yet `applyHistoryLandmarksFilter` is always
  active when landmarks are toggled on, meaning the persisted `historyYear`
  silently filters dots even when the user has no UI affordance to change it.
- If a user toggles Landmarks on with a previously-stored
  `historyYear` of, e.g., 1500, no dots appear because every dated feature is
  filtered out (≤1500 is rare). There is no slider visible to recover.
- `visibleCount` and `earliestVisibleYear` are also gated behind the
  Timeline-Map slider, so users running landmarks alone have no feedback
  that any data loaded.
- **Fix plan:** show the `HistoryTimeline` whenever EITHER `mapOn` OR
  `landmarksOn` is true. Add a small caption noting that the slider filters
  dot inception years.

#### Timeline Map (Phase 2 task)

Static analysis of the basemap-swap path
(`src/components/Map.tsx:2144-2189`) and
`src/lib/history/basemap.ts`:

- `historyMapOn` toggles flip `active` to `OHM_HISTORICAL_BASEMAP_ID`, which
  triggers `map.setStyle(OHM_HISTORICAL_STYLE_URL)`. Every layer registered
  on the previous style is wiped; effects rehydrate via `style.load`
  listeners. Most overlay effects re-attach correctly via `map.on("style.load", apply)`.
- The historic-landmarks layer relies on the same `style.load` rehydration.
  However the layer is added **without a `beforeId`**, which means OHM's own
  symbol layers (place names) sit above it and the dots can be visually
  obscured by the basemap labels in dense areas. `[runtime-only]` to
  confirm.
- `historyMapActive` (`Map.tsx:1761`) is a one-line alias for
  `historyMapOn`; `historyLandmarksActive` likewise. The aliases are leftovers
  from the v18 migration that collapsed the master `historyTimeTravelOn`
  toggle. Safe to inline.
- **Symptom (suspected, code-level):** when toggling the map back off after
  a Time-Travel session, the Year slider's "data extent" hint may stale
  because `setHistoryEarliestYear(null)` is only invoked when **landmarks**
  are toggled off, not the timeline-map.
- **Fix plan:** consolidate the year UI so the slider is always available
  whenever it is meaningful, decouple Timeline-Map's slider from the
  Landmarks visibility state, and document that `historyYear` is the single
  source of truth.

### 1.3 API calls

| Endpoint | Method | Cache | Notes |
| --- | --- | --- | --- |
| `gibs.earthdata.nasa.gov/wmts/...` | tile GET | MapLibre tile cache + module-level probe cache | Used for IMERG, NDVI, NO₂, Fires, GIBS-today basemap. |
| `api.gbif.org/v2/map/occurrence/density/...` | tile GET | MapLibre tile cache | Re-baked on `taxonKey` change. |
| `tiles.globalforestwatch.org/...` | tile GET | MapLibre tile cache | Single-source probe. |
| `overpass-api.de`, `overpass.kumi.systems`, `overpass.private.coffee` | POST | In-memory + IndexedDB tile cache | Rate-limit cooldown 15 s on 429. |
| `query.wikidata.org/sparql` | POST | In-memory tile cache | 400-result cap per tile. |
| `services.sentinel-hub.com/api/v1/process` | POST | None | Per-snapshot fetch. |
| `eunis.eea.europa.eu/.../wms` (Natura 2000) | tile GET | MapLibre tile cache | Probe for sublayer name. |
| `services.terrascope.be/.../wms` (WorldCover) | tile GET | MapLibre tile cache | Single layer. |
| `unpkg.com/@openhistoricalmap/map-styles@0.9.15/...` | GET | Browser HTTP cache | One style.json + child sprites/glyphs. |

`[runtime-only]` Status codes and timing depend on a live session.

## 2. Performance

`[runtime-only]` numbers — the items below are code-level observations.

### 2.1 Tile / overlay caching

- **MapLibre native tile cache** is used for every raster overlay; no service
  worker, no extra layer.
- **Rail tiles** have a custom two-tier cache: `railTileCache` (in-memory) +
  `railTileStore` (IndexedDB), keyed by z=9 slippy-map tile, TTL via
  `railTilePurgeExpired`. This is the most sophisticated cache in the app
  and is well-targeted (Overpass is heavy and rate-limited).
- **Wikidata + Overpass landmarks** share a similar in-memory
  tile cache at z=9 (`src/lib/history/landmarks.ts`) but **no IndexedDB tier** —
  every page reload re-issues SPARQL and Overpass queries.

### 2.2 Layer rendering

- All overlay effects guard on style swaps via `map.on("style.load", apply)`.
  `apply` is a closure over current opacity/probe state, so each style swap
  re-creates the layer via `ensure*Layer`, which is idempotent.
- `removeXLayer` is called consistently in the off-branch of each effect; no
  obvious source/layer leaks.
- The `OverlayPanel` re-renders every `setView` because `view` is a local
  state on `LiveMap`; that's fine because `OverlayPanel` is cheap.
  `[runtime-only]` to confirm React renders are not a hot path.

### 2.3 Bundle size

- Single client component `LiveMap` (5,264 LOC) imported via `next/dynamic`,
  ssr: false. Lazy-loaded only at first map render — good.
- Dependencies (from `package.json`): `maplibre-gl`, `@turf/*` (4 modules),
  `@openhistoricalmap/maplibre-gl-dates`, `zustand`. No analytics, no fonts.
- **Dead code identified:** `src/lib/weather.ts` (RainViewer client) — not
  imported anywhere. Migration leftovers.
- `OverlayKind` legacy values (`clouds`, `fires`) and the IMERG/Fires probe
  modules will become dead after Phase 3.

### 2.4 Memory

- Rail tile caches grow without an in-memory cap; only the IDB tier expires.
  `[runtime-only]` whether long sessions blow memory.
- Search results object URL is revoked correctly
  (`Map.tsx:3431, 3511`).

## 3. Code quality

### 3.1 Architecture

- `src/components/Map.tsx` is a 5,264-line god-component with inline
  helpers, layer registries, panel components, and effects all mixed. This
  is the biggest debt: every overlay (Clouds, Fires, NDVI, Rail, Species,
  Forest Loss, NO₂, Natura, Land Cover, Landmarks) follows the same
  ensure/update/remove pattern, and the duplication is mechanical.
- A future refactor could extract a generic `useRasterOverlay` hook, but
  that is out of scope here.

### 3.2 State management

- Two stores: `useSettings` (persisted, versioned) and `useHiking`
  (in-memory routing/waypoints). Sensible split.
- `Settings.activeOverlay` is a tagged union `"clouds" | "rail" | "fires" | "ndvi" | null`
  — exclusive (only one of the four can be on). Biosphere layers are
  independent booleans. After removing Clouds/Fires and moving NDVI into
  Biosphere, the union collapses to just `"rail" | null` — at which point
  a plain `railOn: boolean` would be cleaner.

### 3.3 Migrations

- `useSettings.persist` has 8 migration branches (v8 → v18). The version-18
  branch is where the next migration must land.
- The migration code is well-commented and conservative (defaults preserved,
  no destructive resets) — keep this style.

### 3.4 Type safety

- Strict TS on. No `any` outside narrow GeoJSON-source casts where
  MapLibre's type for `getSource(...)` is intentionally unhelpful.

### 3.5 Error handling

- Network failures (Overpass, Wikidata, GIBS probes) fail-soft via
  `console.warn` — no toast/UX surface for the user. Acceptable for a
  hobby project; flagged as a future polish item.
- Probe modules (`findLatestFiresSource`, `findLatestImergFrame`,
  `findLatestForestLossSource`, `findLatestNo2Source`) all share the same
  shape — module-level cache + in-flight promise. Could be one helper.
  Not in scope.

### 3.6 Dead code identified

- `src/lib/weather.ts` (RainViewer client; unused)
- `weatherSourceKind` constant + `weatherManifestError` constant — both
  hardcoded and threaded through props that no consumer uses meaningfully.
- After Phase 3: every `firesXxx`, `imergXxx`, `weatherXxx`, `CLOUDS_*`
  symbol becomes dead.

## 4. UI/UX

### 4.1 Desktop

- See §1.2 — only Map Controls and Routes are reachable via the side handles.
- Sidebar drawer width capped at 340 px (`md:max-w-[340px]`) — readable on
  large monitors, may feel cramped at 1280×… but acceptable.
- The drawer slides off-screen except for a 34 px stub when collapsed
  (`md:translate-x-[calc(100%-34px)]`). Side handles sit at `-left-[34px]`
  on the drawer, so they remain visible regardless of state. Good.

### 4.2 Mobile

- Bottom sheet at `peek` / `half` / `full` heights. Tab strip at top of the
  sheet exposes all four panes. Drag-handle plus chevron for grow/shrink.
  Solid pattern.
- `min-height: 38px` on tabs and `min-height: 44px` on primary buttons
  satisfies mobile tap-target guidance.

### 4.3 Visual consistency

- HUD theme is consistent: `--hud-*` CSS variables drive every panel/tab
  surface. Corner brackets, mono labels, accent glow are reused via
  `HudPanel` and `.hud-*` utility classes. Good.
- Slider styling reuses `--hud-fill` percentage CSS variable to drive the
  filled-track portion. Pattern is repeated across every overlay/opacity
  slider — pull a single component if it grows, but acceptable today.

### 4.4 Accessibility

- `aria-label` and `aria-pressed` consistently set on tab/toggle buttons.
- Sidebar uses `<aside>` with `aria-hidden` on closed body. Good.
- Pop-ups (`hud-popup`) for landmark Wikipedia summaries set
  `closeOnClick: true` and have HTML escaping (`escapeHtml`) — XSS-safe.
- Color contrast: `--hud-text-muted` is intentionally dim. `[runtime-only]`
  to verify against WCAG AA.

## 5. Refactor plan (executed in following commits)

1. **Remove Fires + Clouds entirely.** Settings shape, layer code, probe
   modules, panel UI, debug HUD references.
2. **Move NDVI into Biosphere as an independent stackable layer.**
   `ndviOn: boolean` + existing `ndviOpacity`. Migrate prior
   `activeOverlay === "ndvi"` to `ndviOn = true`.
3. **Rename Overlay → Rails.** Once Clouds/Fires/NDVI are gone, the panel
   is rail-only. Collapse `activeOverlay` to `railOn: boolean`.
4. **Fix desktop navigation gap.** Show `.hud-sheet-tabs` on desktop too.
5. **Fix Historic Landmarks UI.** Show year slider whenever the chosen
   year actually filters something visible (mapOn || landmarksOn).
6. **Drop dead code.** `src/lib/weather.ts`, `weatherSourceKind`,
   `weatherManifestError`, leftover IMERG / Fires probe modules,
   debug-HUD fields tied to removed overlays.

## 7. Post-refactor delta

Recorded after the commits on this branch. See `CHANGELOG.md` for the
full list of changes.

### 7.1 Resolved

- **Clouds + Fires removed** end-to-end: layer code, probe modules,
  state, panel UI, settings shape, debug HUD.
- **NDVI moved into Biosphere** as an independent stackable layer.
  Existing `ndviOpacity` reused; new `ndviOn` boolean replaces the
  exclusive `activeOverlay === "ndvi"` slot.
- **Overlay panel collapsed to a single Rails panel** with on/off,
  Lines/ORM-tiles style switch, and opacity. `activeOverlay` is gone;
  `railOn: boolean` lives in its place.
- **Desktop navigation gap closed.** `.hud-sheet-tabs` is now visible
  on desktop, hidden only when the drawer is in `peek` state. All
  four panes (Map Controls, Biosphere, History, Routes) reachable on
  every viewport.
- **Historic Landmarks year UI fixed.** The Year slider lives in its
  own header panel and is shown whenever any History layer (Map or
  Landmarks) is on. A user toggling on Landmarks alone now sees both
  the slider and the visible-count / earliest-year hint.
- **Timeline-Map state cleanup.** Inlined the `historyMapActive` /
  `historyLandmarksActive` aliases. Year UX is unified across both
  layers via the new shared slider panel.
- **Dead code dropped.** `src/lib/weather.ts`, `HikingToggle.tsx`,
  `useMemo` import, `weatherSourceKind`, `weatherManifestError`
  no-op constants.

### 7.2 Settings migration

- `useSettings` bumped to `v19`. Migration:
  - `activeOverlay === "rail"` → `railOn = true`.
  - `activeOverlay === "ndvi"` → `ndviOn = true`.
  - `activeOverlay === "clouds" | "fires"` → both off.
  - `weatherOpacity`, `firesOpacity`, `activeOverlay` deleted from
    persisted state.

### 7.3 Code-size delta

| File | Before | After | Δ |
| --- | --- | --- | --- |
| `src/components/Map.tsx` | 5,264 | 4,627 | −637 |
| `src/lib/settings.ts` | 370 | 362 | −8 |
| `src/components/hud/BiospherePanel.tsx` | 401 | 430 | +29 (new NDVI card) |
| `src/components/hud/HistoryPanel.tsx` | 140 | 149 | +9 |
| `src/app/globals.css` | 1,234 | 1,243 | +9 |
| `src/lib/weather.ts` | 73 | 0 | −73 (deleted) |
| `src/components/HikingToggle.tsx` | 50 | 0 | −50 (deleted) |

### 7.4 Verification

- `npx tsc --noEmit` → clean.
- `npm run build` → success.
- `npm run lint` → 20 errors / 10 warnings (down from 24/13). All
  remaining are pre-existing react-compiler-strict-mode rule trips
  in legacy `useEffect` patterns outside this refactor's scope.

### 7.5 Outstanding `[runtime-only]` items

The following findings could not be confirmed from code alone and
remain open until a Chrome DevTools session is available:

- LCP / TTI / FCP measurements.
- MapLibre tile cache hit ratio.
- Memory growth across long sessions (rail + Wikidata tile caches).
- Layer-stacking visual ordering against OHM symbol layers.
- Color-contrast against `--hud-text-muted` for WCAG AA.

## 6. Out of scope for this audit

- Splitting `Map.tsx` into per-overlay modules. Deferred — too risky
  alongside the Phase 3 removals and Phase 2 fixes; should be its own
  dedicated refactor.
- Service-worker tile caching. Deferred — needs MapLibre runtime metrics to
  motivate.
- Wikidata-tile IndexedDB persistence (mirroring rail-tile store). Deferred.
