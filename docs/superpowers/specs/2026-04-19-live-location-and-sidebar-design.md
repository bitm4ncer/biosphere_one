# Live Location + Sidebar Drawer + HUD Aesthetic

**Date:** 2026-04-19
**Branch target:** main
**Files primarily affected:** `src/components/Map.tsx`, `src/lib/compass.ts` (new), `src/app/globals.css`, MapLibre CSS overrides

## 1. Purpose

Three linked improvements to the map UI, bundled into a single spec because they all reshape the same screen at once:

1. **Live Location** — a real pulsing-dot-with-compass-heading marker that works on iOS and Android. Replaces the currently-broken single-shot behavior of the built-in MapLibre button.
2. **Sidebar drawer + hamburger** — settings stack collapses into a slide-in drawer from the right, toggled by a hamburger top-right. Makes the map usable on phones.
3. **Retro-futuristic HUD restyle** — cyan/amber accents, corner brackets, LED-pip toggles, tick-marked sliders, square thumbs, skinned MapLibre controls. Leans into "instrument panel", not "dark-mode SaaS".

## 2. Scope and non-goals

**In scope:** the three items above, plus necessary layout reshuffling (search → top-left, map controls → bottom-left above scale, drawer → right).

**Out of scope (explicit YAGNI):**
- Heading-arrow smoothing / low-pass filter for magnetic wobble.
- Compass calibration UI.
- Swipe gestures on mobile.
- Persisted sidebar state across reloads.
- Animated hamburger↔X icon morph.
- Background-location / geofencing.
- Scanlines, CRT curvature, or other costume effects.

## 3. Architecture overview

No new top-level component tree; the changes live inside `src/components/Map.tsx` plus one new utility module and a styling pass.

- **Live Location** disables MapLibre's built-in user-dot rendering but keeps the `GeolocateControl` (for its button, state machine, and `watchPosition` plumbing). A custom `maplibregl.Marker` renders our dot-plus-cone SVG. A separate module (`src/lib/compass.ts`) handles the `DeviceOrientationEvent` permission + subscription on iOS and Android.
- **Sidebar** introduces a local-state drawer wrapper around the existing panel stack; a new `SidebarToggle` component renders the hamburger. No Zustand changes (UI state, not settings).
- **Aesthetic** is mostly CSS: palette tokens (Tailwind config or inline classes), panel chrome (corner brackets via pseudo-elements), toggle component swap (pill → LED-pip), slider restyle (ticks + square thumb), and overrides for `.maplibregl-ctrl-*`.

Boundaries stay clean: each existing panel (Basemap / Timeline / Clouds / Rail) continues to own its own state and rendering. The drawer wrapper is purely presentational.

## 4. Feature A — Live Location with compass heading

### 4.1 GeolocateControl config

Replace the current instantiation in `Map.tsx` (around line 267):

```ts
const geolocate = new maplibregl.GeolocateControl({
  trackUserLocation: true,
  showUserLocation: false,     // we render our own marker
  showAccuracyCircle: true,    // MapLibre's accuracy ring is fine
  showUserHeading: false,      // we compute heading ourselves
  positionOptions: {
    enableHighAccuracy: true,
    timeout: 20_000,
    maximumAge: 0,
  },
  fitBoundsOptions: { maxZoom: 15 },
});
map.addControl(geolocate); // position set per layout section (bottom-left)
```

Button state lifecycle (handled by MapLibre): idle → waiting → active-lock → active. No custom logic needed.

### 4.2 `src/lib/compass.ts` — new module

Two functions. Estimated ~40 lines.

```ts
// Returns true if compass events will be delivered (permission granted or not required).
export async function requestCompassPermission(): Promise<boolean>;

// Subscribe to compass heading in degrees (0 = North, clockwise, 0..360).
// Returns an unsubscribe function.
export function subscribeCompass(
  onHeading: (degrees: number) => void,
): () => void;
```

Behavior:
- `requestCompassPermission` — if `DeviceOrientationEvent.requestPermission` exists (iOS 13+), call it and return `true` on `"granted"`. Otherwise return `true`.
- `subscribeCompass` — prefer `deviceorientationabsolute` (Android) with `(360 - event.alpha) % 360`. Fall back to `deviceorientation` using `event.webkitCompassHeading` (iOS). If neither yields a number, no-op.

### 4.3 Custom marker

Single SVG `<div>`-based marker, wrapped in `maplibregl.Marker`:

- Outer translucent cyan pulse (CSS keyframes `@keyframes pulse { 0% opacity 0.8, scale 1; 100% opacity 0, scale 2.4; }`, 2s loop).
- Inner solid dot (14 px, cyan `#22d3ee`, white 2 px ring).
- Directional cone above the dot: triangular wedge, cyan-to-transparent gradient, 60° spread, 44 px reach. Hidden when no compass heading is available.

Marker options: `anchor: "center"`, `rotationAlignment: "map"` so heading stays world-aligned when the user rotates the map.

### 4.4 Lifecycle wiring

On mount (new `useEffect` in `Map.tsx`, independent of basemap switches):

1. Listen for `geolocate` events on the `GeolocateControl` — each event carries a `GeolocationPosition`. Update the marker position and show it. On first fire, also attempt `requestCompassPermission` and, if granted, start `subscribeCompass` → `marker.setRotation(heading)` and show the cone. Cache the unsubscribe fn.
2. Listen for `trackuserlocationend` → hide the marker and the cone, unsubscribe compass.

Permission timing on iOS: the permission request MUST fire inside a user-gesture event. The `geolocate` event fires after `getCurrentPosition` succeeds, which is still within the tap's task chain in practice — Safari treats the chain as a user-gesture continuation. If a device rejects this, the fallback is "pulse dot, no cone", which is acceptable.

### 4.5 Cleanup

Unsubscribe compass + remove the marker in the `useEffect`'s cleanup.

### 4.6 Error paths

| Condition | Behavior |
|---|---|
| User denies geolocation | MapLibre greys the button; no marker appears. No toast. |
| User denies compass (iOS) | Marker shows as pulsing dot without cone. |
| No compass hardware (desktop) | Same as above — no cone, just dot. |
| Insecure origin (HTTP over LAN) | MapLibre disables the button at init ("Location not available" tooltip). Documented in README. |
| Low accuracy / indoor | Accuracy ring grows visibly. No warning text. |
| User navigates away | Existing `map.remove()` cleanup tears down everything; no manual work needed. |

## 5. Feature B — Sidebar drawer + hamburger

### 5.1 Layout quadrants

```
 top-left:     SearchBox                 top-right:  [ ≡ ] hamburger
 right:                                              drawer (content-height)
 bottom-left:  map controls / scale      bottom-right: attribution (MapLibre default)
```

- **SearchBox** moves out of the panel stack and into a fixed position at `top-3 left-3`, outside the drawer.
- **Hamburger** is a new `<SidebarToggle>` component, fixed at `top-3 right-3`, `z-20`.
- **Drawer** anchors at `top-3 right-3 mt-12` (below the hamburger), slides off to the right when closed. Content-height — not full-viewport — so it doesn't collide with anything below.
- **Map controls** stack vertically at `bottom-left`, immediately above the ScaleControl. Four MapLibre controls are registered in insertion order via `addControl(..., "bottom-left")`; the resulting button stack reads top → bottom: **zoom-in, zoom-out, compass** (one `NavigationControl` group with `showCompass: true`), then **geolocate**, then **fullscreen**, then **projection toggle**. Total: 4 controls / 6 buttons.
- **Projection toggle** (currently inline next to the coord readout inside the panel stack) is promoted into a standalone MapLibre `IControl` implementation — a small custom control class exposing `onAdd`/`onRemove` that renders a two-state icon button and calls `setProjection` from the settings store. Matches the other icon buttons visually and stacks with them.
- **Coordinate readout** stays inside the drawer for now (still a settings-adjacent display, not a core map control).
- **Scale + attribution** positions unchanged (`bottom-left` for scale, `bottom-right` for attribution by MapLibre default).

### 5.2 State

```ts
const [sidebarOpen, setSidebarOpen] = useState(() => {
  if (typeof window === "undefined") return true;
  return window.matchMedia("(min-width: 768px)").matches;
});
```

- Open on desktop (≥768 px), closed on mobile at first paint.
- No persistence, no resize listener. A fresh reload applies the viewport default again — users rarely reload the same device twice expecting the toggle to remember.
- `Escape` key closes the drawer on mobile only (via `useEffect` that adds a `keydown` listener when `sidebarOpen && window.innerWidth < 768`).

### 5.3 Hamburger — `<SidebarToggle>`

- Square button, `40 × 40 px`, same chrome as a panel (corner brackets, dark translucent bg).
- Icon: three horizontal bars (SVG, `currentColor` cyan at 70% opacity). Becomes an X when `sidebarOpen` (simple swap, no morph animation).
- `aria-label` toggles between "Open settings" and "Close settings".

### 5.4 Drawer wrapper

The existing panel stack container changes from:

```tsx
<div className="pointer-events-none absolute left-3 top-3 z-10 flex flex-col gap-2">
```

to a drawer:

```tsx
<div
  className={cn(
    "pointer-events-none absolute right-3 top-[3.75rem] z-10 flex flex-col gap-2 transition-transform duration-200 ease-out",
    sidebarOpen ? "translate-x-0" : "translate-x-[calc(100%+1rem)]",
  )}
  aria-hidden={!sidebarOpen}
>
```

Child panels keep their `pointer-events-auto` as they already do.

### 5.5 Mobile backdrop and z-index layering

Layers, bottom to top:

| Layer | z-index | Notes |
|---|---|---|
| MapLibre canvas | — | default |
| Mobile backdrop | 5 | `md:hidden`, rendered only when `sidebarOpen` |
| MapLibre `.maplibregl-ctrl` containers | 10 | bumped via CSS override so they sit above the backdrop |
| Drawer panel stack | 10 | same layer as controls but spatially disjoint (right vs left) |
| Hamburger `<SidebarToggle>` | 20 | always on top |

Backdrop markup:

```tsx
<div
  className="fixed inset-0 z-[5] bg-black/40 backdrop-blur-sm md:hidden"
  onClick={() => setSidebarOpen(false)}
  aria-hidden
/>
```

CSS override in `globals.css` to raise MapLibre controls above the backdrop:

```css
.maplibregl-ctrl-top-left,
.maplibregl-ctrl-top-right,
.maplibregl-ctrl-bottom-left,
.maplibregl-ctrl-bottom-right {
  z-index: 10;
}
```

This lets the backdrop dim the map while zoom / compass / geolocate / fullscreen / projection remain tappable.

## 6. Feature C — Retro-futuristic HUD aesthetic

### 6.1 Palette tokens

Defined as CSS custom properties in `globals.css`:

```css
--hud-surface:        rgba(10, 10, 11, 0.85);
--hud-surface-opaque: #0a0a0b;
--hud-border:         rgba(34, 211, 238, 0.15);   /* cyan, very subtle */
--hud-border-strong:  rgba(34, 211, 238, 0.45);   /* active/hover */
--hud-accent:         #22d3ee;                     /* cyan-400 */
--hud-accent-glow:    rgba(34, 211, 238, 0.35);
--hud-warn:           #f59e0b;                     /* amber-500 */
--hud-text:           #e5e7eb;                     /* neutral-200 */
--hud-text-muted:     #6b7280;                     /* neutral-500 */
--hud-text-label:     #9ca3af;                     /* neutral-400 */
```

Tailwind classes compose against these where convenient; custom properties let MapLibre overrides share the same values.

### 6.2 Shape language

- **Corners:** `rounded-sm` (2 px) on all panels and buttons. No pill shapes.
- **Corner brackets:** each panel renders four L-shaped cyan ticks inset 4 px from each corner. Implemented via four absolutely-positioned `::before`/`::after` pseudo-elements on a `.hud-panel` base class, or a utility component wrapping children. 1 px stroke, 8 px arm length, `var(--hud-accent)` at 40% opacity.
- **Panel header rule:** label + horizontal `border-t` extending to the panel edge, same subtle cyan tint as the border.

### 6.3 Typography

- Geist Sans (already loaded) for UI labels.
- Geist Mono (already loaded) for numeric readouts, coordinate display, zoom, opacity percentages, frame counts, timestamps.
- Label style: `uppercase`, `tracking-[0.15em]`, `text-[10px]`, `font-semibold`, `var(--hud-text-label)`.

### 6.4 Controls

- **Toggles** — new `<LedToggle>` component replacing `<PillToggle>`. Renders as: a small filled circle (8 px) inside a thin square frame (16 × 16 px). On: cyan fill + 6 px cyan glow (box-shadow). Off: `neutral-800` fill, no glow. Click transitions via opacity tween (150 ms).
- **Sliders** — thin track (2 px), square thumb (12 × 12 px), tick marks every 10% rendered as small vertical lines along the track. Cyan accent on the filled portion of the track, neutral-700 on the empty portion.
- **Buttons (non-icon)** — inactive: `bg-transparent border border-[var(--hud-border)] text-neutral-300`. Hover: `border-[var(--hud-border-strong)]` + faint inner cyan glow via `box-shadow: inset 0 0 0 1px var(--hud-accent-glow)`. Active/selected: same plus `text-[var(--hud-accent)]`.

### 6.5 MapLibre control skin

Override in `globals.css`:

```css
.maplibregl-ctrl-group {
  background: var(--hud-surface);
  border: 1px solid var(--hud-border);
  border-radius: 2px;
  box-shadow: none;
  backdrop-filter: blur(8px);
}
.maplibregl-ctrl-group button {
  background: transparent;
  border-radius: 0;
  width: 32px;
  height: 32px;
}
.maplibregl-ctrl-group button + button {
  border-top: 1px solid var(--hud-border);
}
.maplibregl-ctrl-icon { filter: invert(1) brightness(0.85) hue-rotate(170deg); }
.maplibregl-ctrl-geolocate-active .maplibregl-ctrl-icon,
.maplibregl-ctrl-geolocate-background .maplibregl-ctrl-icon {
  filter: none; /* show native active-state color cue */
}
```

Scale control gets a similar treatment (transparent bg, cyan border, mono font).

### 6.6 Motion

- Drawer slide: `duration-200 ease-out`.
- Toggle LED: single 150 ms opacity pulse on state change (via CSS animation triggered by a `data-animating` attribute flipped in a `useEffect`).
- No looping glow effects, no scanlines, no screen flicker. Restraint keeps it feeling like a precision tool.

## 7. Dependencies

- No new npm packages.
- Uses existing: MapLibre GL, Tailwind CSS, React hooks.

## 8. Testing notes

- **Live Location (desktop)** — localhost only; grant permission; dot appears, follows cursor if you use Chrome's devtools location spoofing. Verify button states cycle correctly.
- **Live Location (iOS Safari)** — must hit the deployed HTTPS site. Expect two permission prompts (location, then compass). Verify cone rotates when rotating the phone in hand while stationary.
- **Live Location (Android Chrome)** — same, but only one permission prompt (location). Cone rotates without further consent.
- **Sidebar** — resize browser across 768 px breakpoint; drawer default follows viewport at page load. Tap hamburger → drawer animates in/out. Mobile: tap backdrop → closes. Press Escape → closes (mobile only).
- **Aesthetic** — visual QA against the specced palette. Check MapLibre control skin in both light and dark basemaps.

## 9. Implementation order

A single sequence, small commits:

1. `src/lib/compass.ts` — module + unit-level behavior check with console.
2. `Map.tsx` — GeolocateControl config flip, custom marker, lifecycle wiring.
3. Layout shuffle — move SearchBox, map controls, sidebar anchor.
4. `SidebarToggle` component + drawer wrapper + backdrop + Escape handler.
5. Aesthetic pass — palette tokens, `.hud-panel` corner brackets, `LedToggle`, slider restyle, MapLibre control overrides.
6. QA pass on both mobile and desktop; production build sanity check.
