import type { ReactNode } from "react";

interface PaneToggleProps {
  active: boolean;
  label: string;
  onToggle: () => void;
  /** Visual variant — `handle` is the desktop side-pull, `tab` is the
   *  larger pill button used inside the mobile bottom sheet. */
  variant: "handle" | "tab";
  /** Pane key — controls the signature colour shade via [data-pane]. */
  pane: "map" | "biosphere" | "history" | "hiking";
  children: ReactNode;
}

export function PaneToggle({
  active,
  label,
  onToggle,
  variant,
  pane,
  children,
}: PaneToggleProps) {
  const className = variant === "handle" ? "hud-handle" : "hud-sheet-tab";
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={label}
      aria-pressed={active}
      data-active={active}
      data-pane={pane}
      className={`${className} pointer-events-auto`}
    >
      {children}
    </button>
  );
}
