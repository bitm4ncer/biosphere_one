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
