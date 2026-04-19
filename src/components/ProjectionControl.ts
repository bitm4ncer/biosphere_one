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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
