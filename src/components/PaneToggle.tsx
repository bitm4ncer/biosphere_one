import type { ReactNode } from "react";

interface PaneToggleProps {
  active: boolean;
  label: string;
  onToggle: () => void;
  /** Visual variant — `handle` is the thin desktop side-pull, `tab` is
   *  the larger pill button used in the mobile sheet-tabs row. */
  variant: "handle" | "tab";
  children: ReactNode;
}

/**
 * Unified pane switcher button used in two places:
 * - desktop side-handle column hanging off the drawer's left edge,
 * - mobile sheet-tabs row at the top of the bottom sheet.
 *
 * Same icon + same active state, just two visual variants. Centralising
 * here means the sets stay in sync — adding a new pane only touches one
 * place.
 */
export function PaneToggle({
  active,
  label,
  onToggle,
  variant,
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
      className={`${className} pointer-events-auto`}
    >
      {children}
    </button>
  );
}
