# CHANGELOG

## Branch `claude/biosphere-audit-refactor-PCD7s` — 2026-05-04

Audit + targeted refactor pass. See `AUDIT.md` for the full pre-/post-refactor
analysis.

### Removals

- **Clouds overlay (NASA GPM IMERG):** removed entirely. Source/layer
  helpers (`ensureWeatherLayer`, `updateWeatherTiles`,
  `updateWeatherOpacity`, `removeWeatherLayer`), the IMERG candidate
  probe (`findLatestImergFrame`, `IMERG_SOURCE_CANDIDATES`,
  `imergProbeUrl`, `imergSourceTileUrl`, `alignToHalfHour`,
  `IMERG_PROBE_TTL_MS`, related state), and all clouds UI in the panel
  are gone.
- **Fires overlay (VIIRS Thermal Anomalies):** removed entirely.
  `ensureFiresLayer`, `removeFiresLayer`, `updateFiresOpacity`,
  `findLatestFiresSource`, `firesProbeUrl`, `firesTileUrl`,
  `FIRES_LAYER_CANDIDATES`, `FIRES_PROBE_TILE`, `FiresProbe` interface,
  `firesResolved` / `firesProbeFinished` state, and all stacking-order
  references.
- **Settings:** dropped `OverlayKind`, `activeOverlay`, `weatherOpacity`,
  `firesOpacity`, `setActiveOverlay`, `setWeatherOpacity`,
  `setFiresOpacity`. Migration `v18 → v19` carries existing users
  forward (`activeOverlay === "rail"` → `railOn = true`,
  `activeOverlay === "ndvi"` → `ndviOn = true`).
- **`src/lib/weather.ts`:** RainViewer client, no longer imported. Deleted.
- **`src/components/HikingToggle.tsx`:** redundant after the desktop
  side-handle column was reduced to a single open/close chevron. Deleted.
- **DebugHud:** dropped clouds- and fires-related diagnostic fields and
  the `activeOverlay` field; kept rail/ndvi toggles plus the Biosphere
  probe diagnostics.

### Restructuring

- **NDVI moved from Overlay → Biosphere.** Now an independent stackable
  layer alongside Land Cover, Species, Forest Loss, NO₂, and Protected
  Areas. New on/off toggle (`ndviOn`) replaces the old single-slot
  `activeOverlay === "ndvi"` shape. Opacity (`ndviOpacity`) and existing
  GIBS layer code (`ensureGibsOverlay`, `removeGibsOverlay`) reused
  unchanged. New legend (vegetation gradient).
- **Overlay panel renamed and collapsed to Rails.** With Clouds, Fires,
  and NDVI gone, the Overlay panel was rail-only. Replaced
  `OverlayPanel` with a focused `RailsPanel` (label "Rails") that
  exposes the on/off toggle + Lines vs. ORM-tiles style switch +
  opacity. The single-slot `activeOverlay` setting is replaced by a
  plain `railOn: boolean`.
- **HUD aside structure simplified on desktop.** The dual-button
  side-handle column (`SidebarToggle` + `HikingToggle`) is now a
  single drawer-open chevron; pane navigation lives entirely in the
  in-sheet tabs row that appears at the top of the drawer.

### Fixes

- **Desktop navigation gap.** `.hud-sheet-tabs` was previously hidden
  on desktop, leaving Biosphere and History panes unreachable on
  ≥ 768 px viewports. The tab row is now always rendered when the
  drawer is expanded, and is hidden only while the drawer is collapsed
  (peek state). All four panes are now reachable on every viewport.
- **Historic Landmarks year filter.** The History year slider was only
  visible when Timeline-Map was on, even though it filters Landmark
  inception years. A user with only Landmarks on, but a stale
  persisted year (e.g. 1500), saw an empty map with no UI to recover.
  The slider now lives in its own panel header that is shown whenever
  any History layer (Map or Landmarks) is on. UX caption updated to
  reflect that the slider drives both layers.
- **Timeline-Map state.** Removed the redundant `historyMapActive` /
  `historyLandmarksActive` aliases (1:1 with the persisted booleans)
  and inlined references. Removed the unused `useMemo` import in
  `Map.tsx`.

### Migration safety

- `useSettings` schema bumped to `v19`. Migration handles every
  intermediate shape down to `v8` so existing local-storage state in
  the wild continues to load correctly. Removed legacy keys
  (`weatherOpacity`, `firesOpacity`, `activeOverlay`) are deleted from
  persisted state.

### Code-quality / dead-code cleanup

- `useMemo` no longer imported in `Map.tsx`.
- `weather.ts` (RainViewer module) deleted.
- `HikingToggle.tsx` deleted (no remaining importers).
- `weatherSourceKind`, `weatherManifestError` no-op constants gone.
- Reference to `findLatestFiresSource` mirrored in code comments has
  been retargeted to a generic description of the probe pattern.

### Verification

- `npx tsc --noEmit` → clean.
- `npm run build` → success (Next.js 16.2.4, 7 static pages generated).
- `npm run lint` → 20 errors / 10 warnings, all pre-existing rules
  tripped by legacy `useEffect`+`setState` patterns and ref reads
  during render outside the changed surface area. Compared to the
  pre-refactor baseline (24/13), the refactor removed 4 errors and 3
  warnings (clouds- and fires-related code) and introduced none.

### Performance

`[runtime-only]` Cannot be measured without browser tooling — see
`AUDIT.md §0` for tooling caveat. Code-level expectations:

- Eliminated the IMERG probe (Clouds-on triggered up to 96 sequential
  HTTPS GETs across 4 endpoints × 24 timestamps; only the first
  reachable pair was kept) and its 5-minute background refresh
  interval.
- Eliminated the Fires probe (Clouds- and Fires-on each triggered up
  to 28 sequential GETs).
- One fewer raster source/layer pair registered per active overlay
  cycle; less style-swap rehydration work on basemap toggles.
- Bundle: removed `~600 LOC` of helpers + state + UI from `Map.tsx`
  (now `~4670 LOC`, down from `5264 LOC`).
