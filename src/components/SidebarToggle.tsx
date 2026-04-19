interface SidebarToggleProps {
  open: boolean;
  onToggle: () => void;
}

/**
 * Top-right toggle that opens/closes the sidebar drawer.
 * Icon: a vertical "flag" edge paired with a line arrow — points left
 * when closed (drawer will slide out to the left) and right when open
 * (tap pushes it back to the right).
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
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <line
            x1="3"
            y1="3"
            x2="3"
            y2="15"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M6 9 H14 M11 6 L14 9 L11 12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      ) : (
        <svg
          width="18"
          height="18"
          viewBox="0 0 18 18"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          aria-hidden
        >
          <line
            x1="15"
            y1="3"
            x2="15"
            y2="15"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
          <path
            d="M12 9 H4 M7 6 L4 9 L7 12"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
        </svg>
      )}
    </button>
  );
}
