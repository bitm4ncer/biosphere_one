import type { IControl, Map as MLMap } from "maplibre-gl";

export type OrientationMode = "north" | "route" | "heading";

interface OrientationControlOptions {
  initial: OrientationMode;
  onChange: (mode: OrientationMode) => void;
}

const NEXT: Record<OrientationMode, OrientationMode> = {
  north: "route",
  route: "heading",
  heading: "north",
};

const TITLE: Record<OrientationMode, string> = {
  north: "Orientation: north up — tap for route up",
  route: "Orientation: route up — tap for heading up",
  heading: "Orientation: heading up — tap for north up",
};

/**
 * Three-state orientation toggle. Cycles north → route → heading → north.
 * Mirrors ProjectionControl's IControl shape so it stacks naturally in
 * the bottom-left navigation group. The actual map rotation is owned by
 * a single bearing-effect in Map.tsx; this control just dispatches the
 * mode change and visualises which mode is active.
 */
export class OrientationControl implements IControl {
  private container: HTMLDivElement | null = null;
  private button: HTMLButtonElement | null = null;
  private mode: OrientationMode;
  private armed = true;
  private readonly onChange: (mode: OrientationMode) => void;

  constructor(options: OrientationControlOptions) {
    this.mode = options.initial;
    this.onChange = options.onChange;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  onAdd(_map: MLMap): HTMLElement {
    this.container = document.createElement("div");
    this.container.className = "maplibregl-ctrl maplibregl-ctrl-group";

    this.button = document.createElement("button");
    this.button.type = "button";
    this.button.className = `maplibregl-ctrl-orientation orientation-${this.mode}`;
    this.button.title = TITLE[this.mode];
    this.button.setAttribute("aria-label", TITLE[this.mode]);
    this.button.dataset.armed = this.armed ? "true" : "false";
    this.button.innerHTML = iconFor(this.mode);
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

  setMode(mode: OrientationMode): void {
    if (mode === this.mode || !this.button) return;
    this.mode = mode;
    this.button.className = `maplibregl-ctrl-orientation orientation-${mode}`;
    this.button.title = TITLE[mode];
    this.button.setAttribute("aria-label", TITLE[mode]);
    this.button.innerHTML = iconFor(mode);
  }

  /**
   * Visual hint that the current mode has no live data to act on (e.g.,
   * route mode without a selected hike, heading mode before the first
   * compass tick). Does not change the mode — only dims the icon.
   */
  setArmed(armed: boolean): void {
    if (armed === this.armed) return;
    this.armed = armed;
    if (this.button) this.button.dataset.armed = armed ? "true" : "false";
  }

  private handleClick = () => {
    const next = NEXT[this.mode];
    this.setMode(next);
    this.onChange(next);
  };
}

function iconFor(mode: OrientationMode): string {
  if (mode === "north") {
    // Compass needle in a ring with an "N" indicator on top.
    return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="10" cy="10" r="7.5" stroke="currentColor" stroke-width="1.3"/>
      <path d="M10 3 L12 10 L10 9 L8 10 Z" fill="currentColor"/>
      <path d="M10 17 L12 10 L10 11 L8 10 Z" fill="currentColor" opacity="0.35"/>
      <text x="10" y="6.4" text-anchor="middle" font-size="3.4" font-family="ui-sans-serif,system-ui,sans-serif" fill="currentColor" font-weight="700">N</text>
    </svg>`;
  }
  if (mode === "route") {
    // Curving polyline with an arrow head — implies "follow the line".
    return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M4 16 C 6 12 8 12 10 10 C 12 8 14 8 16 4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M13 4 L16 4 L16 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>
      <circle cx="4" cy="16" r="1.4" fill="currentColor"/>
    </svg>`;
  }
  // Heading: filled view-cone over a dot — same visual language as the
  // user-location cone on the map itself.
  return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
    <path d="M10 3 L15 13 L10 11 L5 13 Z" fill="currentColor"/>
    <circle cx="10" cy="13.5" r="2.2" fill="currentColor"/>
    <circle cx="10" cy="13.5" r="3.6" stroke="currentColor" stroke-width="1" opacity="0.45"/>
  </svg>`;
}
