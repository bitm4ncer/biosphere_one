interface SidebarToggleProps {
  open: boolean;
  onToggle: () => void;
}

/**
 * Tab handle that hangs off the left edge of the sidebar. When the sidebar
 * is open the chevron points right (tap to push the drawer closed); when
 * closed the chevron points left (tap to pull the drawer open).
 */
export function SidebarToggle({ open, onToggle }: SidebarToggleProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={open ? "Close panel" : "Open panel"}
      aria-expanded={open}
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
        {open ? (
          <path
            d="M6 4 L10 8 L6 12"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        ) : (
          <path
            d="M10 4 L6 8 L10 12"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        )}
      </svg>
    </button>
  );
}
