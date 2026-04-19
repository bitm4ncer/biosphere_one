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
