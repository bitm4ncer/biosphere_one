interface SettingsGearProps {
  onOpen: () => void;
}

/**
 * Bottom-right gear button that opens the settings/credentials popup.
 * Shares the same HUD chrome as other floating controls.
 */
export function SettingsGear({ onOpen }: SettingsGearProps) {
  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label="Open settings"
      className="hud-panel pointer-events-auto flex h-10 w-10 items-center justify-center text-[color:var(--hud-accent)] transition-colors hover:border-[color:var(--hud-border-strong)]"
    >
      <span className="hud-corner-tr" aria-hidden />
      <span className="hud-corner-br" aria-hidden />
      <svg
        width="18"
        height="18"
        viewBox="0 0 18 18"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <circle cx="9" cy="9" r="2.2" stroke="currentColor" strokeWidth="1.4" />
        <path
          d="M9 1.5 V3.5 M9 14.5 V16.5 M1.5 9 H3.5 M14.5 9 H16.5 M3.7 3.7 L5.2 5.2 M12.8 12.8 L14.3 14.3 M14.3 3.7 L12.8 5.2 M5.2 12.8 L3.7 14.3"
          stroke="currentColor"
          strokeWidth="1.3"
          strokeLinecap="round"
        />
      </svg>
    </button>
  );
}
