interface SettingsGearProps {
  onOpen: () => void;
}

/**
 * Compact gear button that opens the credentials/API settings modal.
 * Visually a small terminal-style diamond with the accent glow.
 */
export function SettingsGear({ onOpen }: SettingsGearProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open settings"
      className="hud-btn-ghost pointer-events-auto"
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 16 16"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <circle cx="8" cy="8" r="2.2" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M8 1.2 V3 M8 13 V14.8 M1.2 8 H3 M13 8 H14.8 M3.2 3.2 L4.5 4.5 M11.5 11.5 L12.8 12.8 M12.8 3.2 L11.5 4.5 M4.5 11.5 L3.2 12.8"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
