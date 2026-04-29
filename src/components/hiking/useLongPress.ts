"use client";

import { useEffect } from "react";
import type { Map as MLMap } from "maplibre-gl";

interface Options {
  /** Hold duration in ms before the long-press fires. */
  holdMs?: number;
  /** Cancel if the pointer moves more than this many CSS pixels. */
  moveTolerancePx?: number;
  /** Brief haptic feedback on Android (no-op on iOS Safari). */
  vibrate?: boolean;
}

/**
 * Robust map long-press handler.
 *
 * Uses Pointer Events on the map container so touch + mouse + pen are all
 * handled uniformly. The handler:
 *
 *   - starts a timer on `pointerdown`
 *   - cancels on `pointermove` if movement exceeds tolerance (so a pan
 *     gesture never triggers a long-press)
 *   - cancels on `pointerup`, `pointercancel`, `wheel`, or `contextmenu`
 *   - on fire: vibrates briefly, fires `onLongPress`, and suppresses the
 *     subsequent `click` event so MapLibre does not treat it as a tap
 *
 * On desktop, right-click also fires the same handler.
 */
export function useLongPress(
  map: MLMap | null,
  enabled: boolean,
  onLongPress: (lng: number, lat: number) => void,
  options: Options = {},
) {
  const holdMs = options.holdMs ?? 550;
  const moveTolerancePx = options.moveTolerancePx ?? 12;
  const vibrate = options.vibrate ?? true;

  useEffect(() => {
    if (!map || !enabled) return;
    const canvas = map.getCanvasContainer();

    let timer: number | null = null;
    let startX = 0;
    let startY = 0;
    let activePointerId: number | null = null;
    /** Set to true when long-press fires; consumed by the next click. */
    let suppressNextClick = false;

    const clearTimer = () => {
      if (timer != null) {
        window.clearTimeout(timer);
        timer = null;
      }
    };

    const cancel = () => {
      clearTimer();
      activePointerId = null;
    };

    const onPointerDown = (e: PointerEvent) => {
      // Only primary button / single touch
      if (e.pointerType === "mouse" && e.button !== 0) return;
      if (activePointerId != null) return;
      activePointerId = e.pointerId;
      startX = e.clientX;
      startY = e.clientY;
      clearTimer();
      timer = window.setTimeout(() => {
        if (activePointerId == null) return;
        const rect = canvas.getBoundingClientRect();
        const px = startX - rect.left;
        const py = startY - rect.top;
        const lngLat = map.unproject([px, py]);
        suppressNextClick = true;
        if (vibrate && typeof navigator !== "undefined" && navigator.vibrate) {
          try {
            navigator.vibrate(40);
          } catch {
            /* ignore */
          }
        }
        onLongPress(lngLat.lng, lngLat.lat);
        cancel();
      }, holdMs);
    };

    const onPointerMove = (e: PointerEvent) => {
      if (activePointerId !== e.pointerId) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      if (Math.hypot(dx, dy) > moveTolerancePx) cancel();
    };

    const onPointerEnd = (e: PointerEvent) => {
      if (activePointerId !== e.pointerId) return;
      cancel();
    };

    const onWheel = () => cancel();

    const onContextMenu = (e: MouseEvent) => {
      // Desktop right-click → treat as long-press, suppress browser menu
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      const lngLat = map.unproject([px, py]);
      onLongPress(lngLat.lng, lngLat.lat);
    };

    const onClickCapture = (e: MouseEvent) => {
      if (suppressNextClick) {
        suppressNextClick = false;
        e.stopPropagation();
        e.preventDefault();
      }
    };

    canvas.addEventListener("pointerdown", onPointerDown);
    canvas.addEventListener("pointermove", onPointerMove);
    canvas.addEventListener("pointerup", onPointerEnd);
    canvas.addEventListener("pointercancel", onPointerEnd);
    canvas.addEventListener("pointerleave", onPointerEnd);
    canvas.addEventListener("wheel", onWheel, { passive: true });
    canvas.addEventListener("contextmenu", onContextMenu);
    // Capture phase so we get the chance to suppress before MapLibre's click.
    canvas.addEventListener("click", onClickCapture, true);

    return () => {
      cancel();
      canvas.removeEventListener("pointerdown", onPointerDown);
      canvas.removeEventListener("pointermove", onPointerMove);
      canvas.removeEventListener("pointerup", onPointerEnd);
      canvas.removeEventListener("pointercancel", onPointerEnd);
      canvas.removeEventListener("pointerleave", onPointerEnd);
      canvas.removeEventListener("wheel", onWheel);
      canvas.removeEventListener("contextmenu", onContextMenu);
      canvas.removeEventListener("click", onClickCapture, true);
    };
  }, [map, enabled, onLongPress, holdMs, moveTolerancePx, vibrate]);
}
