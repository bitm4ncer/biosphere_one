interface HikingToggleProps {
  open: boolean;
  onToggle: () => void;
}

/**
 * Tab handle that hangs off the left edge of the sidebar, used to open
 * the Hiking sidebar. Visually identical shape to SidebarToggle so the
 * two handles stack cleanly, but carries a pennant-flag glyph.
 */
export function HikingToggle({ open, onToggle }: HikingToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? "Close hiking panel" : "Open hiking panel"}
      aria-expanded={open}
      data-active={open}
      className="hud-handle pointer-events-auto"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        {/* flagpole */}
        <path
          d="M5 2 L5 14"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
        />
        {/* pennant */}
        <path
          d="M5 3 L12 5 L5 7 Z"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinejoin="round"
          fill="currentColor"
          fillOpacity="0.45"
        />
      </svg>
    </button>
  );
}
