# Live Location + Sidebar Drawer + HUD Aesthetic Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a working pulsing-dot-with-compass location marker, a right-hand slide-in sidebar drawer with hamburger toggle, and a retro-futuristic HUD restyle — all inside `src/components/Map.tsx` and a handful of new files.

**Architecture:** Keep MapLibre's `GeolocateControl` for its button + watchPosition plumbing; disable its built-in user dot and render our own `maplibregl.Marker` so we can draw a compass-heading cone. Compass permission + subscription lives in a new standalone module. Sidebar state is local React state (no persistence). HUD styling uses CSS custom properties so both Tailwind classes and MapLibre overrides share one palette.

**Tech Stack:** Next.js 16 (Turbopack) · React 19 · TypeScript · Tailwind CSS v4 · MapLibre GL 5 · Zustand (existing, unchanged by this plan).

**Verification approach:** No test framework is installed. Each task verifies with `npm run lint`, intermittent `npm run build`, and Claude Preview MCP (dev server already running on port 3000) for visual/behavioral checks. Commit after each task.

**Spec reference:** [`docs/superpowers/specs/2026-04-19-live-location-and-sidebar-design.md`](../specs/2026-04-19-live-location-and-sidebar-design.md)

---

## File Structure

**New files:**
- `src/lib/compass.ts` — pure utility: `requestCompassPermission()`, `subscribeCompass()`.
- `src/components/hud/HudPanel.tsx` — shared panel wrapper that adds the corner-bracket chrome.
- `src/components/hud/LedToggle.tsx` — LED-pip toggle replacing the inline `PillToggle` inside `Map.tsx`.
- `src/components/SidebarToggle.tsx` — hamburger button (top-right).
- `src/components/ProjectionControl.ts` — custom MapLibre `IControl` implementation for the projection toggle, so it stacks with the other map controls.

**Modified files:**
- `src/components/Map.tsx` — GeolocateControl config, custom marker + lifecycle, layout shuffle (controls → bottom-left, search → top-left, sidebar → right-hand drawer), wrap existing panels in `HudPanel`, swap `PillToggle` usages for `LedToggle`, add drawer state / backdrop / Escape handler, drop the inline `PillToggle` component, drop the inline `ProjectionToggle` component.
- `src/app/globals.css` — HUD palette tokens, `.hud-panel` base + corner brackets, slider restyle, MapLibre control skin, z-index layering.

**Why these boundaries:** `compass.ts` is pure logic with platform branching — it benefits from living alone. `HudPanel`, `LedToggle`, and `SidebarToggle` are tiny presentational atoms that each do one thing. `ProjectionControl` is MapLibre API glue, unrelated to React; keeping it out of `Map.tsx` avoids muddying the big component. Everything else stays in `Map.tsx` because the state lives there and splitting it would force prop-drilling or context for no benefit.

---

## Task 1: Compass utility module

**Files:**
- Create: `src/lib/compass.ts`

- [ ] **Step 1: Create the module**

Write this exact content to `src/lib/compass.ts`:

```ts
// Compass heading utilities. Handles the iOS 13+ permission quirk and
// picks the right DeviceOrientationEvent variant per platform.

type PermissionDOE = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

/**
 * Ensures we can receive compass events.
 *
 * iOS 13+ requires DeviceOrientationEvent.requestPermission() inside a
 * user-gesture handler. Android and desktop browsers return true without
 * any prompt. Returns false only if the user explicitly denied on iOS
 * or the API threw.
 */
export async function requestCompassPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const DOE = window.DeviceOrientationEvent as PermissionDOE | undefined;
  if (!DOE) return false;
  if (typeof DOE.requestPermission !== "function") return true;
  try {
    const result = await DOE.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

interface AppleOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
}

/**
 * Subscribes to compass heading in degrees (0 = North, clockwise).
 * Returns an unsubscribe function. Safe to call even if permission was
 * denied — it just never fires.
 */
export function subscribeCompass(
  onHeading: (degrees: number) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const useAbsolute = "ondeviceorientationabsolute" in window;
  const eventName = useAbsolute
    ? "deviceorientationabsolute"
    : "deviceorientation";

  const handler = (raw: Event) => {
    const event = raw as AppleOrientationEvent;
    const apple = event.webkitCompassHeading;
    if (typeof apple === "number" && !Number.isNaN(apple)) {
      onHeading(apple);
      return;
    }
    if (event.absolute && typeof event.alpha === "number") {
      const heading = (360 - event.alpha) % 360;
      onHeading(heading);
    }
  };

  window.addEventListener(eventName, handler as EventListener);
  return () => window.removeEventListener(eventName, handler as EventListener);
}
```

- [ ] **Step 2: Run lint + type check**

```bash
npm run lint
```

Expected: no errors. If lint reports `any` usage or unused vars, fix them.

```bash
npx tsc --noEmit
```

Expected: clean. Any type error blocks progress.

- [ ] **Step 3: Commit**

```bash
git add src/lib/compass.ts
git commit -m "Add compass heading utility for iOS + Android"
```

---

## Task 2: Live Location — GeolocateControl config + custom marker

**Files:**
- Modify: `src/components/Map.tsx` (the `useEffect` that builds the map, around lines 251–301; the return JSX at the bottom of `LiveMap`)
- Modify: `src/app/globals.css` (append marker keyframes + classes)

- [ ] **Step 1: Add the marker CSS to `src/app/globals.css`**

Append this to the end of `src/app/globals.css`:

```css
/* Live location marker */
.live-location-marker {
  position: relative;
  width: 28px;
  height: 28px;
  pointer-events: none;
}

.live-location-dot {
  position: absolute;
  inset: 7px;
  width: 14px;
  height: 14px;
  background: #22d3ee;
  border: 2px solid white;
  border-radius: 50%;
  box-shadow: 0 0 12px rgba(34, 211, 238, 0.6);
  z-index: 2;
}

.live-location-pulse {
  position: absolute;
  inset: 0;
  width: 28px;
  height: 28px;
  background: #22d3ee;
  border-radius: 50%;
  opacity: 0.6;
  animation: live-location-pulse 2s ease-out infinite;
  z-index: 1;
}

@keyframes live-location-pulse {
  0% { transform: scale(0.4); opacity: 0.6; }
  100% { transform: scale(2.6); opacity: 0; }
}

.live-location-cone {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 0;
  height: 0;
  transform-origin: center center;
  pointer-events: none;
  z-index: 3;
}

.live-location-cone svg {
  position: absolute;
  left: -26px;
  top: -56px;
  display: block;
}

.live-location-cone[hidden] {
  display: none;
}
```

- [ ] **Step 2: Flip GeolocateControl config in `Map.tsx`**

In `src/components/Map.tsx`, find the line (currently around line 269):

```ts
map.addControl(new maplibregl.GeolocateControl({ trackUserLocation: false }), "top-right");
```

Replace with:

```ts
const geolocate = new maplibregl.GeolocateControl({
  trackUserLocation: true,
  showUserLocation: false,
  showAccuracyCircle: true,
  showUserHeading: false,
  positionOptions: {
    enableHighAccuracy: true,
    timeout: 20_000,
    maximumAge: 0,
  },
  fitBoundsOptions: { maxZoom: 15 },
});
map.addControl(geolocate, "top-right");
geolocateRef.current = geolocate;
```

At the top of `LiveMap`, near the other refs, add:

```ts
const geolocateRef = useRef<maplibregl.GeolocateControl | null>(null);
const liveMarkerRef = useRef<maplibregl.Marker | null>(null);
const coneRef = useRef<HTMLDivElement | null>(null);
const compassUnsubRef = useRef<(() => void) | null>(null);
```

- [ ] **Step 3: Build the marker factory**

Near the other top-of-file helpers in `Map.tsx` (before `function LiveMap(...)`), add:

```ts
function buildLiveLocationEl(): { root: HTMLDivElement; cone: HTMLDivElement } {
  const root = document.createElement("div");
  root.className = "live-location-marker";

  const pulse = document.createElement("div");
  pulse.className = "live-location-pulse";
  root.appendChild(pulse);

  const dot = document.createElement("div");
  dot.className = "live-location-dot";
  root.appendChild(dot);

  const cone = document.createElement("div");
  cone.className = "live-location-cone";
  cone.hidden = true;
  cone.innerHTML = `
    <svg width="52" height="56" viewBox="0 0 52 56" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lc-grad" x1="26" y1="0" x2="26" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#22d3ee" stop-opacity="0.8"/>
          <stop offset="1" stop-color="#22d3ee" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <path d="M26 0 L52 56 L26 46 L0 56 Z" fill="url(#lc-grad)"/>
    </svg>`;
  root.appendChild(cone);

  return { root, cone };
}
```

- [ ] **Step 4: Wire geolocate + compass lifecycle**

Add a new `useEffect` inside `LiveMap` (after the existing basemap effect, before the weather ones):

```tsx
useEffect(() => {
  const map = mapRef.current;
  const geo = geolocateRef.current;
  if (!map || !geo) return;

  const ensureMarker = (lng: number, lat: number) => {
    if (!liveMarkerRef.current) {
      const { root, cone } = buildLiveLocationEl();
      coneRef.current = cone;
      liveMarkerRef.current = new maplibregl.Marker({
        element: root,
        anchor: "center",
        rotationAlignment: "map",
      })
        .setLngLat([lng, lat])
        .addTo(map);
    } else {
      liveMarkerRef.current.setLngLat([lng, lat]);
    }
  };

  let compassStarted = false;

  const onGeolocate = async (e: { coords: GeolocationCoordinates }) => {
    ensureMarker(e.coords.longitude, e.coords.latitude);
    if (compassStarted) return;
    compassStarted = true;
    const granted = await requestCompassPermission();
    if (!granted) return;
    const unsub = subscribeCompass((heading) => {
      const marker = liveMarkerRef.current;
      const cone = coneRef.current;
      if (!marker || !cone) return;
      marker.setRotation(heading);
      cone.hidden = false;
    });
    compassUnsubRef.current = unsub;
  };

  const onTrackEnd = () => {
    if (liveMarkerRef.current) {
      liveMarkerRef.current.remove();
      liveMarkerRef.current = null;
      coneRef.current = null;
    }
    if (compassUnsubRef.current) {
      compassUnsubRef.current();
      compassUnsubRef.current = null;
    }
    compassStarted = false;
  };

  geo.on("geolocate", onGeolocate);
  geo.on("trackuserlocationend", onTrackEnd);

  return () => {
    geo.off("geolocate", onGeolocate);
    geo.off("trackuserlocationend", onTrackEnd);
    onTrackEnd();
  };
}, []);
```

Add the import at the top of `Map.tsx`:

```ts
import { requestCompassPermission, subscribeCompass } from "@/lib/compass";
```

- [ ] **Step 5: Lint + build sanity**

```bash
npm run lint
```

Expected: no errors.

```bash
npm run build
```

Expected: build succeeds. If MapLibre's `GeolocateControl.on` signature rejects `"geolocate"` or `"trackuserlocationend"` at the TS level, cast via `(geo as unknown as { on: (e: string, cb: (...a: unknown[]) => void) => void })` — but try without the cast first; current types do accept those event names.

- [ ] **Step 6: Visual check in preview**

The dev server should already be running on port 3000. In the preview, the GeolocateControl button appears top-right (it'll be moved in Task 7; that's fine for now). Clicking it on localhost should trigger a permission prompt. The preview iframe often has geolocation blocked — that's expected and not a bug. What we're checking here is that the page still renders with no console errors.

```
preview_eval: window.location.reload()
preview_console_logs level=error
```

Expected: no red errors related to the new marker code.

- [ ] **Step 7: Commit**

```bash
git add src/components/Map.tsx src/app/globals.css src/lib/compass.ts
git commit -m "Add Live Location marker with compass heading"
```

(The `src/lib/compass.ts` file was already committed in Task 1 so `git add` just no-ops on it — that's fine.)

---

## Task 3: `ProjectionControl` — custom MapLibre IControl

**Files:**
- Create: `src/components/ProjectionControl.ts`

- [ ] **Step 1: Create the control class**

Write this exact content to `src/components/ProjectionControl.ts`:

```ts
import type { IControl, Map as MLMap } from "maplibre-gl";

export type ProjectionMode = "mercator" | "globe";

interface ProjectionControlOptions {
  initial: ProjectionMode;
  onChange: (mode: ProjectionMode) => void;
}

/**
 * A MapLibre control that toggles between flat (mercator) and globe
 * projections. Renders as a single button in the standard MapLibre
 * control group so it stacks with zoom, geolocate, fullscreen.
 */
export class ProjectionControl implements IControl {
  private container: HTMLDivElement | null = null;
  private button: HTMLButtonElement | null = null;
  private mode: ProjectionMode;
  private readonly onChange: (mode: ProjectionMode) => void;

  constructor(options: ProjectionControlOptions) {
    this.mode = options.initial;
    this.onChange = options.onChange;
  }

  onAdd(_map: MLMap): HTMLElement {
    this.container = document.createElement("div");
    this.container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.className = "maplibregl-ctrl-projection";
    this.button.title = this.mode === "globe" ? "Switch to flat projection" : "Switch to globe projection";
    this.button.setAttribute("aria-label", this.button.title);
    this.button.innerHTML = this.iconFor(this.mode);
    this.button.addEventListener("click", this.handleClick);

    this.container.appendChild(this.button);
    return this.container;
  }

  onRemove(): void {
    this.button?.removeEventListener("click", this.handleClick);
    this.container?.parentNode?.removeChild(this.container);
    this.container = null;
    this.button = null;
  }

  setMode(mode: ProjectionMode): void {
    if (mode === this.mode || !this.button) return;
    this.mode = mode;
    this.button.innerHTML = this.iconFor(mode);
    const title = mode === "globe" ? "Switch to flat projection" : "Switch to globe projection";
    this.button.title = title;
    this.button.setAttribute("aria-label", title);
  }

  private handleClick = () => {
    const next: ProjectionMode = this.mode === "globe" ? "mercator" : "globe";
    this.setMode(next);
    this.onChange(next);
  };

  private iconFor(mode: ProjectionMode): string {
    if (mode === "globe") {
      // Globe icon
      return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.5"/>
        <path d="M10 2.5 C 13.5 6 13.5 14 10 17.5 M10 2.5 C 6.5 6 6.5 14 10 17.5 M2.5 10 H17.5" stroke="currentColor" stroke-width="1.2" fill="none"/>
      </svg>`;
    }
    // Flat/map icon
    return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="2.5" y="4.5" width="15" height="11" rx="1" stroke="currentColor" stroke-width="1.5"/>
      <path d="M2.5 8 H17.5 M2.5 12 H17.5 M7 4.5 V15.5 M13 4.5 V15.5" stroke="currentColor" stroke-width="1" opacity="0.6"/>
    </svg>`;
  }
}
```

- [ ] **Step 2: Lint + type check**

```bash
npm run lint && npx tsc --noEmit
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/ProjectionControl.ts
git commit -m "Add ProjectionControl MapLibre IControl class"
```

---

## Task 4: Layout shuffle — controls to bottom-left, search to top-left, drop inline projection toggle

**Files:**
- Modify: `src/components/Map.tsx`

- [ ] **Step 1: Move all map controls to `bottom-left`**

In `src/components/Map.tsx`, find the block where controls are added (currently around lines 265–270). Replace the existing `addControl(...)` calls with:

```ts
map.addControl(
  new maplibregl.NavigationControl({ showCompass: true, visualizePitch: false }),
  "bottom-left",
);
map.addControl(geolocate, "bottom-left");
map.addControl(new maplibregl.FullscreenControl(), "bottom-left");

const projectionControl = new ProjectionControl({
  initial: projection,
  onChange: setProjection,
});
projectionControlRef.current = projectionControl;
map.addControl(projectionControl, "bottom-left");
```

Note: the previous code passed `new maplibregl.NavigationControl({ showCompass: true })`. Keep the same constructor semantics.

The `ScaleControl` addition stays where it is (already `bottom-left`), but ensure it's added AFTER the four controls above so the scale appears underneath them in the stack. MapLibre renders `bottom-left` controls bottom-up in reverse insertion order, so actually we want ScaleControl added FIRST. If the existing code adds ScaleControl after the others, move its `addControl` call to before them.

After verification: in the existing file `ScaleControl` is added *after* `NavigationControl` (line ~264 vs ~268). Reorder so the sequence becomes: ScaleControl → NavigationControl → GeolocateControl → FullscreenControl → ProjectionControl. This puts the scale at the bottom of the `bottom-left` stack visually.

Concrete: inside the `useEffect` where the map is constructed, ensure calls happen in this order:

```ts
map.addControl(new ScaleControl({ maxWidth: 120, unit: "metric" }), "bottom-left");
map.addControl(
  new maplibregl.NavigationControl({ showCompass: true, visualizePitch: false }),
  "bottom-left",
);
map.addControl(geolocate, "bottom-left");
map.addControl(new maplibregl.FullscreenControl(), "bottom-left");
const projectionControl = new ProjectionControl({
  initial: projection,
  onChange: setProjection,
});
projectionControlRef.current = projectionControl;
map.addControl(projectionControl, "bottom-left");
```

Add the new ref near the others:

```ts
const projectionControlRef = useRef<ProjectionControl | null>(null);
```

Add the import:

```ts
import { ProjectionControl } from "./ProjectionControl";
```

- [ ] **Step 2: Keep ProjectionControl in sync when `projection` changes elsewhere**

Inside the existing `useEffect([projection])` (the one that calls `map.setProjection(...)`), also update the control's icon:

Find:

```ts
useEffect(() => {
  const map = mapRef.current;
  if (!map) return;
  const apply = () => {
    try { map.setProjection({ type: projection }); } catch {}
  };
  apply();
  map.on("style.load", apply);
  return () => { map.off("style.load", apply); };
}, [projection]);
```

Add one line inside `apply`:

```ts
const apply = () => {
  try { map.setProjection({ type: projection }); } catch {}
  projectionControlRef.current?.setMode(projection);
};
```

- [ ] **Step 3: Remove the inline `ProjectionToggle` from the coordinate-readout panel**

Find the coordinate readout block in the JSX (near the bottom of `LiveMap`'s return, starts with `<span>{view.center[1].toFixed(4)}°...`).

Currently it contains a `<ProjectionToggle active={projection} onChange={setProjection} />` invocation plus a separator `<span className="mx-1 h-3 w-px bg-neutral-700" aria-hidden />`. Remove both. The panel should end after the zoom readout. Result:

```tsx
<div className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900/85 px-2 py-1.5 font-mono text-[11px] text-neutral-400 shadow backdrop-blur">
  <span>
    {view.center[1].toFixed(4)}°, {view.center[0].toFixed(4)}° · z
    {view.zoom.toFixed(1)}
  </span>
</div>
```

Also delete the entire `function ProjectionToggle(...)` component definition further down in the file — it's now dead code.

- [ ] **Step 4: Lint + build**

```bash
npm run lint && npm run build
```

Expected: clean. If TS complains about the unused `projection` param in the old effect, move the `setMode` call inside the effect's body only (already in the step above).

- [ ] **Step 5: Preview check**

Reload the dev server preview. The bottom-left corner should now have a vertical stack of control groups: zoom+/−/compass, geolocate, fullscreen, projection toggle, then the scale bar at the bottom. Top-right should be empty of controls.

```
preview_eval: window.location.reload()
preview_snapshot
```

Expected: snapshot shows controls in bottom-left region, scale bar underneath them. Projection toggle no longer appears inside the panel stack.

- [ ] **Step 6: Commit**

```bash
git add src/components/Map.tsx
git commit -m "Move all map controls to bottom-left with projection stack"
```

---

## Task 5: HUD palette tokens + `.hud-panel` base class

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Append HUD tokens and panel base**

Append to `src/app/globals.css`:

```css
/* HUD palette tokens */
:root {
  --hud-surface:        rgba(10, 10, 11, 0.85);
  --hud-surface-opaque: #0a0a0b;
  --hud-border:         rgba(34, 211, 238, 0.18);
  --hud-border-strong:  rgba(34, 211, 238, 0.5);
  --hud-accent:         #22d3ee;
  --hud-accent-glow:    rgba(34, 211, 238, 0.35);
  --hud-warn:           #f59e0b;
  --hud-text:           #e5e7eb;
  --hud-text-muted:     #6b7280;
  --hud-text-label:     #9ca3af;
}

/* HUD panel with corner brackets */
.hud-panel {
  position: relative;
  background: var(--hud-surface);
  border: 1px solid var(--hud-border);
  border-radius: 2px;
  color: var(--hud-text);
  backdrop-filter: blur(8px);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
}

.hud-panel::before,
.hud-panel::after,
.hud-panel > .hud-corner-tr,
.hud-panel > .hud-corner-br {
  content: "";
  position: absolute;
  width: 8px;
  height: 8px;
  border-color: var(--hud-accent);
  border-style: solid;
  border-width: 0;
  opacity: 0.55;
  pointer-events: none;
}

.hud-panel::before {
  top: 3px; left: 3px;
  border-top-width: 1px;
  border-left-width: 1px;
}

.hud-panel::after {
  bottom: 3px; left: 3px;
  border-bottom-width: 1px;
  border-left-width: 1px;
}

.hud-panel > .hud-corner-tr {
  top: 3px; right: 3px;
  border-top-width: 1px;
  border-right-width: 1px;
}

.hud-panel > .hud-corner-br {
  bottom: 3px; right: 3px;
  border-bottom-width: 1px;
  border-right-width: 1px;
}

.hud-label {
  font-size: 10px;
  font-weight: 600;
  letter-spacing: 0.15em;
  text-transform: uppercase;
  color: var(--hud-text-label);
}

.hud-label-bar {
  border-top: 1px solid var(--hud-border);
  margin-top: 4px;
}

.hud-mono {
  font-family: var(--font-geist-mono), ui-monospace, monospace;
}

/* Raise MapLibre control stacks above the mobile drawer backdrop */
.maplibregl-ctrl-top-left,
.maplibregl-ctrl-top-right,
.maplibregl-ctrl-bottom-left,
.maplibregl-ctrl-bottom-right {
  z-index: 10;
}
```

- [ ] **Step 2: Verify the CSS compiles**

```bash
npm run build
```

Expected: build succeeds (Tailwind v4's PostCSS pipeline will process these alongside Tailwind utilities).

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "Add HUD palette tokens and hud-panel base class"
```

---

## Task 6: `<HudPanel>` wrapper component

**Files:**
- Create: `src/components/hud/HudPanel.tsx`

- [ ] **Step 1: Create the component**

Write this exact content to `src/components/hud/HudPanel.tsx`:

```tsx
import type { ReactNode } from "react";

interface HudPanelProps {
  children: ReactNode;
  className?: string;
  label?: string;
  pointerEvents?: boolean;
}

/**
 * HUD panel wrapper. Adds the four corner brackets and the standard
 * cyan-tinted frame around arbitrary children. Use `label` to render
 * a standard small-caps header with a divider line.
 */
export function HudPanel({
  children,
  className = "",
  label,
  pointerEvents = true,
}: HudPanelProps) {
  return (
    <div
      className={`hud-panel ${pointerEvents ? "pointer-events-auto" : "pointer-events-none"} p-2 text-xs ${className}`}
    >
      <span className="hud-corner-tr" aria-hidden />
      <span className="hud-corner-br" aria-hidden />
      {label && (
        <div className="mb-1.5 flex items-center gap-2 px-1">
          <span className="hud-label">{label}</span>
          <span className="hud-label-bar flex-1" aria-hidden />
        </div>
      )}
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/hud/HudPanel.tsx
git commit -m "Add HudPanel wrapper with corner-bracket chrome"
```

---

## Task 7: `<LedToggle>` component

**Files:**
- Create: `src/components/hud/LedToggle.tsx`
- Modify: `src/app/globals.css` (append LED styles)

- [ ] **Step 1: Append LED styles to `globals.css`**

Append:

```css
/* LED-pip toggle */
.led-toggle {
  width: 22px;
  height: 14px;
  padding: 2px;
  background: transparent;
  border: 1px solid var(--hud-border);
  border-radius: 1px;
  display: inline-flex;
  align-items: center;
  transition: border-color 150ms ease;
  cursor: pointer;
}

.led-toggle:hover {
  border-color: var(--hud-border-strong);
}

.led-toggle[data-on="true"] {
  border-color: var(--hud-border-strong);
}

.led-pip {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1f2937;
  transition: background 150ms ease, box-shadow 150ms ease, transform 150ms ease;
  transform: translateX(0);
}

.led-toggle[data-on="true"] .led-pip {
  background: var(--hud-accent);
  box-shadow: 0 0 6px var(--hud-accent-glow);
  transform: translateX(8px);
}
```

- [ ] **Step 2: Create the component**

Write this exact content to `src/components/hud/LedToggle.tsx`:

```tsx
interface LedToggleProps {
  enabled: boolean;
  onToggle: () => void;
  label?: string;
}

/**
 * LED-pip toggle. Renders as a small rectangular frame with a pip that
 * slides and glows cyan when enabled. Replaces PillToggle.
 */
export function LedToggle({ enabled, onToggle, label }: LedToggleProps) {
  return (
    <button
      type="button"
      className="led-toggle"
      data-on={enabled}
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={label ?? (enabled ? "Toggle off" : "Toggle on")}
    >
      <span className="led-pip" aria-hidden />
    </button>
  );
}
```

- [ ] **Step 3: Lint**

```bash
npm run lint
```

Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add src/components/hud/LedToggle.tsx src/app/globals.css
git commit -m "Add LedToggle component"
```

---

## Task 8: Apply `HudPanel` + `LedToggle` + HUD classes to existing panels

**Files:**
- Modify: `src/components/Map.tsx`

- [ ] **Step 1: Replace `PillToggle` usages with `LedToggle`**

Find the inline `PillToggle` component definition near the bottom of `Map.tsx` (it has `enabled: boolean; onToggle: () => void;`). Delete the entire component function.

Find its two usages inside `WeatherPanel` and `RailwayPanel`:

```tsx
<PillToggle enabled={enabled} onToggle={() => onToggle(!enabled)} />
```

Replace each with:

```tsx
<LedToggle enabled={enabled} onToggle={() => onToggle(!enabled)} label={enabled ? "Turn off" : "Turn on"} />
```

Add the import at the top:

```ts
import { LedToggle } from "./hud/LedToggle";
import { HudPanel } from "./hud/HudPanel";
```

- [ ] **Step 2: Wrap the Basemap panel**

Currently in `LiveMap`'s JSX return, the basemap panel is:

```tsx
<div className="pointer-events-auto rounded-xl border border-neutral-700 bg-neutral-900/85 p-2 text-xs text-neutral-200 shadow-xl backdrop-blur">
  <div className="mb-1.5 px-1 text-[10px] font-semibold uppercase tracking-wider text-neutral-500">
    Basemap
  </div>
  <div className="flex flex-col gap-1">
    {BASEMAPS.map((b) => (
      ...
    ))}
  </div>
</div>
```

Replace with:

```tsx
<HudPanel label="Basemap">
  <div className="flex flex-col gap-1">
    {BASEMAPS.map((b) => (
      <button
        key={b.id}
        type="button"
        onClick={() => setActive(b.id)}
        className={`rounded-sm px-2.5 py-1.5 text-left transition-colors ${
          active === b.id
            ? "bg-[color:var(--hud-accent-glow)] text-[color:var(--hud-accent)] ring-1 ring-inset ring-[color:var(--hud-accent)]"
            : "text-neutral-300 hover:bg-neutral-800"
        }`}
      >
        {b.label}
      </button>
    ))}
  </div>
</HudPanel>
```

- [ ] **Step 3: Wrap the coord readout**

Replace:

```tsx
<div className="pointer-events-auto flex items-center gap-1.5 rounded-lg border border-neutral-700 bg-neutral-900/85 px-2 py-1.5 font-mono text-[11px] text-neutral-400 shadow backdrop-blur">
  <span>
    {view.center[1].toFixed(4)}°, {view.center[0].toFixed(4)}° · z
    {view.zoom.toFixed(1)}
  </span>
</div>
```

With:

```tsx
<HudPanel className="hud-mono">
  <span className="text-[11px] text-neutral-400">
    {view.center[1].toFixed(4)}°, {view.center[0].toFixed(4)}° · z
    {view.zoom.toFixed(1)}
  </span>
</HudPanel>
```

- [ ] **Step 4: Wrap `TimelinePanel`**

Find the `TimelinePanel` component. Its root `<div>` has classes like `pointer-events-auto ... rounded-xl border border-neutral-700 bg-neutral-900/85 ...`. Replace its root with a `<HudPanel label="Timeline">...</HudPanel>` wrapper around the existing children (keep all internal logic and inner JSX). Remove the existing uppercase label (`<div className="... uppercase ...">Timeline</div>`) since `HudPanel`'s `label` prop renders it. Adjust any inner classes that referenced the old rounded-xl pattern.

- [ ] **Step 5: Wrap `WeatherPanel` (labeled "Clouds")**

Same pattern: replace the `<div className="pointer-events-auto ... rounded-xl border border-neutral-700 ...">` root with `<HudPanel label="Clouds">`. Remove the old inner uppercase "Clouds" label, keep the loading pip inline in whatever structure you need:

```tsx
<HudPanel label={loading && enabled ? "Clouds  •" : "Clouds"}>
  ... existing children ...
</HudPanel>
```

(The "•" after Clouds replaces the separately-rendered loading pulse dot. If you prefer to keep the explicit pulsing indicator, render it inside the panel's first child row.)

- [ ] **Step 6: Wrap `RailwayPanel`**

Same pattern: `<HudPanel label="Rail">` wrapping its children.

- [ ] **Step 7: Lint + build**

```bash
npm run lint && npm run build
```

Expected: clean.

- [ ] **Step 8: Preview check**

Reload dev preview. Each panel should now show corner-bracket chrome, cyan-tinted borders, and LED-pip toggles on Clouds and Rail. Basemap panel's active button should show cyan text + subtle cyan ring.

```
preview_eval: window.location.reload()
preview_screenshot
```

Expected: visual match with spec. If any panel still shows the old grey rounded-xl look, inspect with `preview_inspect` on that element to find the missed class.

- [ ] **Step 9: Commit**

```bash
git add src/components/Map.tsx
git commit -m "Apply HudPanel + LedToggle to all sidebar panels"
```

---

## Task 9: Slider restyle

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Append slider styles**

Append to `globals.css`:

```css
/* HUD sliders — square thumb, thin track, tick marks */
input[type="range"].hud-slider {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 14px;
  background: transparent;
  cursor: pointer;
}

input[type="range"].hud-slider::-webkit-slider-runnable-track {
  height: 2px;
  background: linear-gradient(to right,
    var(--hud-accent) 0%,
    var(--hud-accent) var(--hud-fill, 50%),
    #374151 var(--hud-fill, 50%),
    #374151 100%);
  background-size: 100% 2px, 8px 10px;
  background-image:
    linear-gradient(to right,
      var(--hud-accent) 0%,
      var(--hud-accent) var(--hud-fill, 50%),
      #374151 var(--hud-fill, 50%),
      #374151 100%),
    repeating-linear-gradient(to right,
      transparent 0,
      transparent 9px,
      rgba(156, 163, 175, 0.35) 9px,
      rgba(156, 163, 175, 0.35) 10px);
  background-repeat: no-repeat;
  background-position: 0 center, 0 center;
}

input[type="range"].hud-slider::-moz-range-track {
  height: 2px;
  background: #374151;
}

input[type="range"].hud-slider::-moz-range-progress {
  height: 2px;
  background: var(--hud-accent);
}

input[type="range"].hud-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 10px;
  height: 12px;
  background: var(--hud-accent);
  border: 1px solid #0a0a0b;
  border-radius: 1px;
  margin-top: -5px;
  box-shadow: 0 0 6px var(--hud-accent-glow);
}

input[type="range"].hud-slider::-moz-range-thumb {
  width: 10px;
  height: 12px;
  background: var(--hud-accent);
  border: 1px solid #0a0a0b;
  border-radius: 1px;
  box-shadow: 0 0 6px var(--hud-accent-glow);
}
```

- [ ] **Step 2: Apply `hud-slider` class to existing sliders in `Map.tsx`**

Find every `<input type="range"` in `Map.tsx` (4 expected: timeline opacity, clouds timeline, clouds opacity, rail opacity). Replace the existing className with `hud-slider` (drop the previous `accent-sky-400` etc).

For each slider, also set an inline style with a `--hud-fill` custom property so the filled portion of the track matches the value. Example for opacity slider `value` between 0 and 1:

```tsx
<input
  type="range"
  min={0} max={1} step={0.05}
  value={opacity}
  onChange={(e) => onOpacityChange(Number(e.target.value))}
  className="hud-slider flex-1"
  style={{ ["--hud-fill" as string]: `${Math.round(opacity * 100)}%` }}
/>
```

For the timeline frame-index slider (value 0..frames.length-1):

```tsx
style={{ ["--hud-fill" as string]: `${Math.round((frameIndex / (frames.length - 1 || 1)) * 100)}%` }}
```

Apply the same pattern consistently to all sliders.

- [ ] **Step 3: Lint + build**

```bash
npm run lint && npm run build
```

Expected: clean. The `["--hud-fill" as string]` cast avoids TS complaining about CSS custom properties on `style` props.

- [ ] **Step 4: Preview check**

```
preview_eval: window.location.reload()
preview_screenshot
```

Expected: sliders show cyan filled portion + grey empty portion, tick marks along the track, small cyan rectangular thumb.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/components/Map.tsx
git commit -m "Restyle sliders with HUD palette"
```

---

## Task 10: MapLibre control skin

**Files:**
- Modify: `src/app/globals.css`

- [ ] **Step 1: Append MapLibre skin**

Append to `globals.css`:

```css
/* MapLibre control skin to match HUD aesthetic */
.maplibregl-ctrl-group {
  background: var(--hud-surface) !important;
  border: 1px solid var(--hud-border) !important;
  border-radius: 2px !important;
  box-shadow: none !important;
  backdrop-filter: blur(8px);
}

.maplibregl-ctrl-group:not(:empty) {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.02);
}

.maplibregl-ctrl-group button {
  background: transparent !important;
  border-radius: 0 !important;
  width: 32px !important;
  height: 32px !important;
  color: var(--hud-text) !important;
}

.maplibregl-ctrl-group button:hover {
  background: rgba(34, 211, 238, 0.08) !important;
}

.maplibregl-ctrl-group button + button {
  border-top: 1px solid var(--hud-border) !important;
}

.maplibregl-ctrl-group button .maplibregl-ctrl-icon {
  filter: invert(1) brightness(0.9);
}

.maplibregl-ctrl-geolocate-active .maplibregl-ctrl-icon,
.maplibregl-ctrl-geolocate-background .maplibregl-ctrl-icon {
  filter: invert(60%) sepia(85%) saturate(1652%) hue-rotate(146deg) brightness(99%) contrast(91%) !important;
}

.maplibregl-ctrl-projection {
  display: flex !important;
  align-items: center;
  justify-content: center;
}

.maplibregl-ctrl-scale {
  background: var(--hud-surface) !important;
  border: 1px solid var(--hud-border) !important;
  border-top: 1px solid var(--hud-border) !important;
  color: var(--hud-text-label) !important;
  font-family: var(--font-geist-mono), ui-monospace, monospace !important;
  font-size: 10px !important;
  padding: 2px 6px !important;
  border-radius: 2px !important;
  backdrop-filter: blur(8px);
}

.maplibregl-ctrl-attrib {
  background: var(--hud-surface) !important;
  border: 1px solid var(--hud-border) !important;
  border-radius: 2px !important;
  backdrop-filter: blur(8px);
}

.maplibregl-ctrl-attrib a { color: var(--hud-text-label) !important; }
.maplibregl-ctrl-attrib-inner { color: var(--hud-text-muted) !important; font-size: 10px !important; }
.maplibregl-ctrl-attrib-button { filter: invert(1) brightness(0.8); }
```

- [ ] **Step 2: Build + preview**

```bash
npm run build
```

```
preview_eval: window.location.reload()
preview_screenshot
```

Expected: bottom-left controls now show the HUD treatment (dark, cyan-tinted borders, thin separators between buttons). Scale bar + attribution match.

- [ ] **Step 3: Commit**

```bash
git add src/app/globals.css
git commit -m "Skin MapLibre controls with HUD aesthetic"
```

---

## Task 11: `<SidebarToggle>` hamburger component

**Files:**
- Create: `src/components/SidebarToggle.tsx`

- [ ] **Step 1: Create the component**

Write this exact content to `src/components/SidebarToggle.tsx`:

```tsx
interface SidebarToggleProps {
  open: boolean;
  onToggle: () => void;
}

/**
 * Top-right hamburger button that opens/closes the sidebar drawer.
 * Uses the same hud-panel chrome as other HUD elements so it reads as
 * part of the same system.
 */
export function SidebarToggle({ open, onToggle }: SidebarToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? "Close settings" : "Open settings"}
      aria-expanded={open}
      className="hud-panel pointer-events-auto flex h-10 w-10 items-center justify-center text-[color:var(--hud-accent)] transition-colors hover:border-[color:var(--hud-border-strong)]"
    >
      <span className="hud-corner-tr" aria-hidden />
      <span className="hud-corner-br" aria-hidden />
      {open ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M3 3 L13 13 M13 3 L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
          <path d="M2 4 H14 M2 8 H14 M2 12 H14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        </svg>
      )}
    </button>
  );
}
```

- [ ] **Step 2: Lint**

```bash
npm run lint
```

Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add src/components/SidebarToggle.tsx
git commit -m "Add SidebarToggle hamburger component"
```

---

## Task 12: Drawer wrapper + state + backdrop + Escape

**Files:**
- Modify: `src/components/Map.tsx`

- [ ] **Step 1: Add sidebar state to `LiveMap`**

Near the other `useState` calls at the top of `LiveMap`, add:

```ts
const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(min-width: 768px)").matches;
});
```

- [ ] **Step 2: Add Escape-key handler (mobile only)**

Add this effect alongside the others:

```ts
useEffect(() => {
  if (!sidebarOpen) return;
  const isMobile = typeof window !== "undefined" && window.innerWidth < 768;
  if (!isMobile) return;
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "Escape") setSidebarOpen(false);
  };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [sidebarOpen]);
```

- [ ] **Step 3: Move SearchBox out of the sidebar, reposition top-left**

In the return JSX, the current structure is:

```tsx
<div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-2">
  <SearchBox onSelect={handleGeocodeSelect} />
  <HudPanel label="Basemap">...</HudPanel>
  <HudPanel className="hud-mono">...</HudPanel>
  <TimelinePanel ... />
  <WeatherPanel ... />
  <RailwayPanel ... />
</div>
```

Split this into three separate absolute blocks:

```tsx
<>
  {/* top-left: search */}
  <div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-2">
    <SearchBox onSelect={handleGeocodeSelect} />
  </div>

  {/* top-right: hamburger */}
  <div className="pointer-events-none absolute right-3 top-3 z-20">
    <SidebarToggle open={sidebarOpen} onToggle={() => setSidebarOpen((v) => !v)} />
  </div>

  {/* mobile backdrop */}
  {sidebarOpen && (
    <div
      className="fixed inset-0 z-[5] bg-black/40 backdrop-blur-sm md:hidden"
      onClick={() => setSidebarOpen(false)}
      aria-hidden
    />
  )}

  {/* right drawer: settings stack */}
  <div
    className={`pointer-events-none absolute right-3 top-[3.75rem] z-10 flex flex-col gap-2 transition-transform duration-200 ease-out ${
      sidebarOpen ? "translate-x-0" : "translate-x-[calc(100%+1rem)]"
    }`}
    aria-hidden={!sidebarOpen}
  >
    <HudPanel label="Basemap">...</HudPanel>
    <HudPanel className="hud-mono">...</HudPanel>
    <TimelinePanel ... />
    <WeatherPanel ... />
    <RailwayPanel ... />
  </div>
</>
```

(Keep the exact panel contents as they were — only the outer container changes.)

- [ ] **Step 4: Import SidebarToggle**

Add at top of `Map.tsx`:

```ts
import { SidebarToggle } from "./SidebarToggle";
```

- [ ] **Step 5: Lint + build**

```bash
npm run lint && npm run build
```

Expected: clean.

- [ ] **Step 6: Preview check — desktop**

```
preview_eval: window.location.reload()
preview_screenshot
```

Expected: hamburger top-right, drawer open on right side with all panels, bottom-left controls unchanged. Top-left shows SearchBox alone.

Click hamburger:

```
preview_click selector=button[aria-label="Close settings"]
preview_screenshot
```

Expected: drawer slides off to the right, map fills the space.

- [ ] **Step 7: Preview check — mobile viewport**

```
preview_resize preset=mobile
preview_eval: window.location.reload()
preview_screenshot
```

Expected: drawer starts closed on mobile. Hamburger visible top-right. Bottom-left controls and top-left search visible.

Click hamburger:

```
preview_click selector=button[aria-label="Open settings"]
preview_screenshot
```

Expected: drawer slides in from right + translucent backdrop dims the map. Bottom-left map controls remain sharp and tappable (not dimmed — they're above the backdrop z-index).

Click backdrop:

```
preview_click selector="div[aria-hidden].fixed.inset-0"
preview_screenshot
```

Expected: drawer closes.

Restore desktop viewport:

```
preview_resize preset=desktop
```

- [ ] **Step 8: Commit**

```bash
git add src/components/Map.tsx
git commit -m "Add sidebar drawer, hamburger, and mobile backdrop"
```

---

## Task 13: Final QA pass

**Files:** (none modified unless QA reveals issues)

- [ ] **Step 1: Full production build**

```bash
npm run build
```

Expected: build succeeds with no errors. Output line "Export successful" or equivalent.

- [ ] **Step 2: Verify each feature end-to-end**

Reload preview, then in order:

1. `preview_screenshot` — capture baseline desktop layout. Confirm: SearchBox top-left, hamburger top-right, drawer open with Basemap / coords / Timeline / Clouds / Rail, bottom-left controls (zoom+/−/compass, geolocate, fullscreen, projection, scale), attribution bottom-right.
2. `preview_console_logs level=error` — confirm no errors.
3. Toggle sidebar: click hamburger, screenshot, click again, screenshot. Confirm drawer slides out and back.
4. Toggle Clouds LED: click LedToggle inside Clouds panel, screenshot. Confirm panel expands and pip glows cyan.
5. Toggle Rail LED: same confirmation.
6. Drag Rail opacity slider via `preview_eval`:
   ```js
   const input = document.querySelectorAll('input[type="range"].hud-slider')[/* rail opacity index */ 0];
   const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value').set;
   setter.call(input, '0.5');
   input.dispatchEvent(new Event('input', { bubbles: true }));
   ```
   Confirm rail layer dims visibly in subsequent screenshot.
7. Projection toggle: click via `preview_click selector=".maplibregl-ctrl-projection"`. Screenshot should show the map re-projected (or, on Mercator target, show no visual change but the button icon swaps).
8. Mobile: `preview_resize preset=mobile`, reload, screenshot. Confirm drawer closed by default and map fills viewport.

- [ ] **Step 3: Test Live Location (manual, user needs to visit deployed HTTPS)**

The preview iframe blocks geolocation. Note in the commit message that live compass + dot testing requires the deployed HTTPS site on a real mobile device.

- [ ] **Step 4: Document insecure-origin caveat in README**

Spec 4.6 calls this out. Append this paragraph to `README.md` (create the file if it doesn't exist, matching the commit style from recent history):

```markdown
### Live Location

The pulsing-dot live location (top-right geolocate button) requires a **secure context** — HTTPS or `localhost`. When hit over a plain-HTTP LAN IP (`192.168.x.x:3000`), browsers disable `navigator.geolocation` and the geolocate button shows a "Location not available" tooltip. This is a browser security policy, not an application bug. Use `npm run dev` on `localhost`, or deploy to HTTPS (GitHub Pages) for device testing.

On iOS, compass heading requires an additional permission prompt triggered by the same user tap that grants location access. If the compass prompt is denied, the pulsing dot still renders without the directional cone.
```

Commit:

```bash
git add README.md
git commit -m "Document Live Location secure-context requirement"
```

- [ ] **Step 5: Final lint**

```bash
npm run lint
```

Expected: clean.

- [ ] **Step 6: No additional commit needed if QA revealed no issues.** If fixes were required, commit them:

```bash
git add -p src/
git commit -m "QA fixes after full integration"
```

---

## Rollout / merge

Once all tasks are done on `claude/vibrant-agnesi-5b6fbb`:

1. `git log main..HEAD --oneline` — verify all commits present.
2. `git push origin HEAD:main` — same workflow as the prior feature branches (fast-forward push to main, since main tracks current branch).

The user will validate on the deployed GitHub Pages HTTPS site where geolocation + compass actually work.
