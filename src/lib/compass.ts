// Compass heading utilities. Handles the iOS 13+ permission quirk and
// picks the right DeviceOrientationEvent variant per platform.

type PermissionDOE = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

/**
 * Ensures we can receive compass events.
 *
 * iOS 13+ requires DeviceOrientationEvent.requestPermission() inside a
 * user-gesture handler. Android and desktop browsers return true without
 * any prompt. Returns false only if the user explicitly denied on iOS
 * or the API threw.
 */
export async function requestCompassPermission(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const DOE = window.DeviceOrientationEvent as PermissionDOE | undefined;
  if (!DOE) return false;
  if (typeof DOE.requestPermission !== "function") return true;
  try {
    const result = await DOE.requestPermission();
    return result === "granted";
  } catch {
    return false;
  }
}

interface AppleOrientationEvent extends DeviceOrientationEvent {
  webkitCompassHeading?: number;
  webkitCompassAccuracy?: number;
}

/**
 * Subscribes to compass heading in degrees (0 = North, clockwise).
 * Second argument is iOS `webkitCompassAccuracy` in degrees (or `null`
 * if not reported by the platform). A value of `-1` means the
 * magnetometer is uncalibrated and the heading is unreliable — on iOS
 * this is fixed by waving the phone in a figure-8 motion.
 * Returns an unsubscribe function. Safe to call even if permission was
 * denied — it just never fires.
 */
export function subscribeCompass(
  onHeading: (degrees: number, accuracyDeg: number | null) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const useAbsolute = "ondeviceorientationabsolute" in window;
  const eventName = useAbsolute
    ? "deviceorientationabsolute"
    : "deviceorientation";

  const handler = (raw: Event) => {
    const event = raw as AppleOrientationEvent;
    const apple = event.webkitCompassHeading;
    if (typeof apple === "number" && !Number.isNaN(apple)) {
      const accuracy =
        typeof event.webkitCompassAccuracy === "number"
          ? event.webkitCompassAccuracy
          : null;
      onHeading(apple, accuracy);
      return;
    }
    if (event.absolute && typeof event.alpha === "number") {
      const heading = (360 - event.alpha) % 360;
      onHeading(heading, null);
    }
  };

  window.addEventListener(eventName, handler as EventListener);
  return () => window.removeEventListener(eventName, handler as EventListener);
}
