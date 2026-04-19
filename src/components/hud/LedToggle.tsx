interface LedToggleProps {
  enabled: boolean;
  onToggle: () => void;
  label?: string;
}

/**
 * LED-pip toggle. Renders as a small rectangular frame with a pip that
 * slides and glows cyan when enabled. Replaces PillToggle.
 */
export function LedToggle({ enabled, onToggle, label }: LedToggleProps) {
  return (
    <button
      type="button"
      className="led-toggle"
      data-on={enabled}
      onClick={onToggle}
      aria-pressed={enabled}
      aria-label={label ?? (enabled ? "Toggle off" : "Toggle on")}
    >
      <span className="led-pip" aria-hidden />
    </button>
  );
}
