"use client";

import maplibregl from "maplibre-gl";
import type { Map as MLMap } from "maplibre-gl";
import type { Station, StationTier, WaypointRole } from "@/lib/hiking/types";
import { useHiking } from "@/lib/hiking/store";

const TIER_LABEL: Record<StationTier, string> = {
  intercity: "IC/ICE",
  regional: "Regional",
  sBahn: "S-Bahn",
  subway: "U-Bahn",
  tram: "Tram",
  halt: "Halt",
};

const TIER_DOT_COLOR: Record<StationTier, string> = {
  intercity: "#d4ff38",
  regional: "#9dd4ff",
  sBahn: "#7df09e",
  subway: "#c7a6ff",
  tram: "#ffb561",
  halt: "#9aa0a6",
};

function roleButton(
  label: string,
  onClick: () => void,
  accent = false,
): HTMLButtonElement {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = label;
  b.className = accent ? "hud-btn-primary" : "hud-btn-ghost";
  b.style.padding = "4px 8px";
  b.style.fontSize = "10px";
  b.style.letterSpacing = "0.08em";
  b.style.textTransform = "uppercase";
  b.addEventListener("click", onClick);
  return b;
}

function buildPopupBody(opts: {
  title: string;
  subtitle?: string;
  dotColor?: string;
  onStart: () => void;
  onVia: () => void;
  onEnd: () => void;
  currentRole?: WaypointRole | null;
  onRemove?: () => void;
}): HTMLDivElement {
  const root = document.createElement("div");
  root.className = "hud-mono";
  root.style.minWidth = "200px";
  root.style.display = "flex";
  root.style.flexDirection = "column";
  root.style.gap = "8px";
  root.style.padding = "2px";

  const head = document.createElement("div");
  head.style.display = "flex";
  head.style.alignItems = "center";
  head.style.gap = "6px";
  if (opts.dotColor) {
    const dot = document.createElement("span");
    dot.style.display = "inline-block";
    dot.style.width = "8px";
    dot.style.height = "8px";
    dot.style.borderRadius = "999px";
    dot.style.background = opts.dotColor;
    dot.style.boxShadow = `0 0 6px ${opts.dotColor}90`;
    head.appendChild(dot);
  }
  const title = document.createElement("span");
  title.textContent = opts.title;
  title.style.fontSize = "12px";
  title.style.color = "var(--hud-text)";
  title.style.fontWeight = "600";
  head.appendChild(title);
  root.appendChild(head);

  if (opts.subtitle) {
    const sub = document.createElement("div");
    sub.textContent = opts.subtitle;
    sub.style.fontSize = "10px";
    sub.style.color = "var(--hud-text-muted)";
    root.appendChild(sub);
  }

  const row = document.createElement("div");
  row.style.display = "grid";
  row.style.gridTemplateColumns = "1fr 1fr 1fr";
  row.style.gap = "4px";
  row.appendChild(
    roleButton("Start", opts.onStart, opts.currentRole === "start"),
  );
  row.appendChild(roleButton("Via", opts.onVia, opts.currentRole === "via"));
  row.appendChild(roleButton("End", opts.onEnd, opts.currentRole === "end"));
  root.appendChild(row);

  if (opts.onRemove) {
    const rm = document.createElement("button");
    rm.type = "button";
    rm.textContent = "Remove from trip";
    rm.style.background = "transparent";
    rm.style.border = "none";
    rm.style.color = "var(--hud-text-muted)";
    rm.style.fontSize = "10px";
    rm.style.letterSpacing = "0.08em";
    rm.style.textTransform = "uppercase";
    rm.style.textAlign = "right";
    rm.style.padding = "2px 0";
    rm.style.cursor = "pointer";
    rm.addEventListener("click", opts.onRemove);
    root.appendChild(rm);
  }

  return root;
}

export function openStationPopup(map: MLMap, station: Station) {
  const store = useHiking.getState();
  const existing = store.waypoints.find((w) => w.stationId === station.id);
  const currentRole = (existing?.role as WaypointRole | undefined) ?? null;

  const popup = new maplibregl.Popup({
    closeButton: true,
    closeOnClick: true,
    offset: 14,
    className: "hud-popup",
  }).setLngLat([station.lon, station.lat]);

  const setRole = (role: WaypointRole) => {
    const s = useHiking.getState();
    const found = s.waypoints.find((w) => w.stationId === station.id);
    if (found) {
      s.setWaypointRole(found.id, role);
    } else {
      s.addWaypoint({
        role,
        lat: station.lat,
        lon: station.lon,
        label: station.name,
        source: "station",
        stationId: station.id,
      });
    }
    popup.remove();
  };

  const body = buildPopupBody({
    title: station.name,
    subtitle: TIER_LABEL[station.tier],
    dotColor: TIER_DOT_COLOR[station.tier],
    currentRole,
    onStart: () => setRole("start"),
    onVia: () => setRole("via"),
    onEnd: () => setRole("end"),
    onRemove: existing
      ? () => {
          useHiking.getState().removeWaypoint(existing.id);
          popup.remove();
        }
      : undefined,
  });
  popup.setDOMContent(body).addTo(map);
}

export function openMapPopup(
  map: MLMap,
  lngLat: { lng: number; lat: number },
) {
  const popup = new maplibregl.Popup({
    closeButton: true,
    closeOnClick: true,
    offset: 8,
    className: "hud-popup",
  }).setLngLat(lngLat);

  const title = `${lngLat.lat.toFixed(4)}°, ${lngLat.lng.toFixed(4)}°`;

  const setRole = (role: WaypointRole) => {
    useHiking.getState().addWaypoint({
      role,
      lat: lngLat.lat,
      lon: lngLat.lng,
      label: `Pin ${title}`,
      source: "map",
    });
    popup.remove();
  };

  const body = buildPopupBody({
    title: "Map point",
    subtitle: title,
    dotColor: "#d4ff38",
    onStart: () => setRole("start"),
    onVia: () => setRole("via"),
    onEnd: () => setRole("end"),
  });
  popup.setDOMContent(body).addTo(map);
}
