"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import type { Map as MLMap } from "maplibre-gl";
import { HudPanel } from "./HudPanel";
import { useHiking, getStart, getEnd, getVias } from "@/lib/hiking/store";
import { fetchStationsAround } from "@/lib/hiking/overpass";
import { searchHikingRoutes } from "@/lib/hiking/search";
import { BROUTER_PROFILES, type BrouterProfile } from "@/lib/hiking/routing";
import { downloadGpx, routeToGpx } from "@/lib/hiking/gpx";
import { ElevationChart } from "@/components/hiking/ElevationChart";

interface Props {
  mapRef: React.MutableRefObject<MLMap | null>;
}

export function HikingPanel({ mapRef }: Props) {
  const radiusKm = useHiking((s) => s.radiusKm);
  const distanceMin = useHiking((s) => s.distanceMin);
  const distanceMax = useHiking((s) => s.distanceMax);
  const greenMin = useHiking((s) => s.greenMin);
  const profiles = useHiking((s) => s.profiles);
  const center = useHiking((s) => s.center);
  const stations = useHiking((s) => s.stations);
  const waypoints = useHiking((s) => s.waypoints);
  const candidates = useHiking((s) => s.candidates);
  const selectedCandidateId = useHiking((s) => s.selectedCandidateId);
  const phase = useHiking((s) => s.phase);
  const notice = useHiking((s) => s.notice);

  const setEnabled = useHiking((s) => s.setEnabled);
  const enabled = useHiking((s) => s.enabled);
  const setRadiusKm = useHiking((s) => s.setRadiusKm);
  const setDistanceRange = useHiking((s) => s.setDistanceRange);
  const setGreenMin = useHiking((s) => s.setGreenMin);
  const toggleProfile = useHiking((s) => s.toggleProfile);
  const setCenter = useHiking((s) => s.setCenter);
  const setStations = useHiking((s) => s.setStations);
  const clearWaypoints = useHiking((s) => s.clearWaypoints);
  const reverseWaypoints = useHiking((s) => s.reverseWaypoints);
  const removeWaypoint = useHiking((s) => s.removeWaypoint);
  const setCandidates = useHiking((s) => s.setCandidates);
  const selectCandidate = useHiking((s) => s.selectCandidate);
  const setPhase = useHiking((s) => s.setPhase);
  const setNotice = useHiking((s) => s.setNotice);
  const reset = useHiking((s) => s.reset);

  const abortRef = useRef<AbortController | null>(null);

  // When this panel mounts (becomes visible), activate the feature so the
  // radius + stations + routes render on the map. On unmount (user switches
  // to the Control Deck) we leave `enabled=true` so the routes they just
  // found stay drawn while they fly around; they can clear via the reset
  // button or simply close the panel and hide everything later.
  useEffect(() => {
    setEnabled(true);
  }, [setEnabled]);

  // Adopt the current map center the first time the panel is opened.
  useEffect(() => {
    if (center) return;
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    setCenter({ lat: c.lat, lon: c.lng });
  }, [center, setCenter, mapRef]);

  const handleUseMapCenter = useCallback(() => {
    const map = mapRef.current;
    if (!map) return;
    const c = map.getCenter();
    setCenter({ lat: c.lat, lon: c.lng });
    setNotice(null);
  }, [mapRef, setCenter, setNotice]);

  const handleUseGps = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setNotice("Geolocation not available in this browser.");
      return;
    }
    setNotice("Requesting location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenter({ lat: pos.coords.latitude, lon: pos.coords.longitude });
        setNotice(null);
        const map = mapRef.current;
        if (map) {
          map.flyTo({
            center: [pos.coords.longitude, pos.coords.latitude],
            zoom: Math.max(map.getZoom(), 11),
            duration: 800,
          });
        }
      },
      (err) => setNotice(`Location error: ${err.message}`),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }, [mapRef, setCenter, setNotice]);

  const handleFindStations = useCallback(async () => {
    if (!center) {
      setNotice("Set a center first (map or GPS).");
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPhase({ kind: "fetchingStations" });
    setNotice(null);
    try {
      const results = await fetchStationsAround(center, radiusKm, ctrl.signal);
      if (ctrl.signal.aborted) return;
      setStations(results);
      setPhase({ kind: "stations", count: results.length });
      if (results.length === 0) {
        setNotice(`No stations within ${radiusKm} km.`);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPhase({ kind: "error", message: (err as Error).message });
    }
  }, [center, radiusKm, setPhase, setStations, setNotice]);

  const handleFindRoutes = useCallback(async () => {
    const start = getStart(waypoints);
    const end = getEnd(waypoints);
    const vias = getVias(waypoints);
    if (!start || !end) {
      setNotice("Pick a start and end — tap stations, long-press the map, or search.");
      return;
    }
    if (profiles.length === 0) {
      setNotice("Enable at least one routing profile.");
      return;
    }
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setPhase({ kind: "routing" });
    setNotice(null);
    try {
      const result = await searchHikingRoutes({
        from: { lat: start.lat, lon: start.lon },
        to: { lat: end.lat, lon: end.lon },
        vias: vias.map((v) => ({ lat: v.lat, lon: v.lon })),
        distanceKm: [distanceMin, distanceMax],
        profiles: profiles as BrouterProfile[],
        greenMin,
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      setCandidates(result.candidates);
      setPhase({ kind: "routed" });
      if (result.notice) setNotice(result.notice);
      const map = mapRef.current;
      const best = result.candidates[0];
      if (map && best) {
        let south = Infinity,
          west = Infinity,
          north = -Infinity,
          east = -Infinity;
        for (const [lon, lat] of best.coordinates) {
          if (lat < south) south = lat;
          if (lat > north) north = lat;
          if (lon < west) west = lon;
          if (lon > east) east = lon;
        }
        if (Number.isFinite(south)) {
          map.fitBounds(
            [
              [west, south],
              [east, north],
            ],
            { padding: 60, duration: 900, maxZoom: 14 },
          );
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      setPhase({ kind: "error", message: (err as Error).message });
    }
  }, [
    waypoints,
    profiles,
    distanceMin,
    distanceMax,
    greenMin,
    setCandidates,
    setPhase,
    setNotice,
    mapRef,
  ]);

  const handleExportGpx = useCallback(() => {
    if (!selectedCandidateId) return;
    const cand = candidates.find((c) => c.id === selectedCandidateId);
    if (!cand) return;
    const start = getStart(waypoints);
    const end = getEnd(waypoints);
    const vias = getVias(waypoints);
    const startName = start?.label ?? "Start";
    const endName = end?.label ?? "End";
    const name = `${startName} → ${endName} · ${cand.distanceKm.toFixed(1)} km`;
    const gpx = routeToGpx(cand, {
      name,
      start: start ? { name: startName, lat: start.lat, lon: start.lon } : null,
      end: end ? { name: endName, lat: end.lat, lon: end.lon } : null,
      vias: vias.map((v, i) => ({
        name: v.label ?? `Via ${i + 1}`,
        lat: v.lat,
        lon: v.lon,
      })),
    });
    const filename = `hike-${startName}-${endName}-${cand.distanceKm.toFixed(1)}km.gpx`
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._\-]/g, "");
    downloadGpx(filename, gpx);
  }, [selectedCandidateId, candidates, waypoints]);

  const handleClearAll = useCallback(() => {
    abortRef.current?.abort();
    reset();
    setEnabled(true);
  }, [reset, setEnabled]);

  const tripStart = useMemo(() => getStart(waypoints), [waypoints]);
  const tripEnd = useMemo(() => getEnd(waypoints), [waypoints]);
  const tripVias = useMemo(() => getVias(waypoints), [waypoints]);

  const canFindRoutes =
    Boolean(tripStart) && Boolean(tripEnd) && profiles.length > 0;

  return (
    <div className="flex flex-col gap-3">
      <HudPanel label="Origin">
        <div className="flex flex-col gap-2">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={handleUseMapCenter}
              className="hud-btn-ghost !w-auto justify-center text-[10px] uppercase tracking-wider"
            >
              Map center
            </button>
            <button
              type="button"
              onClick={handleUseGps}
              className="hud-btn-ghost !w-auto justify-center text-[10px] uppercase tracking-wider"
            >
              Use GPS
            </button>
          </div>
          {center && (
            <div className="hud-mono text-[10px] text-[color:var(--hud-text-muted)]">
              {center.lat.toFixed(4)}°, {center.lon.toFixed(4)}°
            </div>
          )}
          <RangeRow
            label="Radius"
            min={2}
            max={25}
            step={1}
            value={radiusKm}
            onChange={setRadiusKm}
            suffix="km"
          />
          <button
            type="button"
            onClick={handleFindStations}
            disabled={!center || phase.kind === "fetchingStations"}
            className="hud-btn-primary"
          >
            {phase.kind === "fetchingStations"
              ? "Searching…"
              : stations.length > 0
                ? `Rescan · ${stations.length} found`
                : "Find stations"}
          </button>
        </div>
      </HudPanel>

      <HudPanel label="Trip">
        <div className="flex flex-col gap-2.5">
          <DualRangeRow
            label="Distance"
            min={3}
            max={40}
            loValue={distanceMin}
            hiValue={distanceMax}
            onChange={setDistanceRange}
          />
          <RangeRow
            label="Green"
            min={0}
            max={0.9}
            step={0.05}
            value={greenMin}
            onChange={setGreenMin}
            format={(v) => `≥ ${Math.round(v * 100)}%`}
          />
          <div className="flex flex-col gap-1">
            <span className="hud-label text-[9px]">Profiles</span>
            <div className="hud-tab-row" style={{ gridTemplateColumns: `repeat(${BROUTER_PROFILES.length}, minmax(0, 1fr))` }}>
              {BROUTER_PROFILES.map((p) => {
                const active = profiles.includes(p.id as BrouterProfile);
                return (
                  <button
                    key={p.id}
                    type="button"
                    className="hud-tab"
                    data-active={active}
                    onClick={() => toggleProfile(p.id as BrouterProfile)}
                  >
                    {p.label.replace("Hiking · ", "").replace("Walking · ", "")}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </HudPanel>

      <HudPanel label="Routes">
        <div className="flex flex-col gap-2">
          {stations.length === 0 ? (
            <p className="text-[11px] text-[color:var(--hud-text-muted)]">
              Find stations above, then tap two markers on the map to pick a
              start and an end.
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-1">
                <WaypointRow
                  role="start"
                  label={tripStart?.label ?? null}
                  onRemove={
                    tripStart ? () => removeWaypoint(tripStart.id) : undefined
                  }
                />
                {tripVias.map((v, i) => (
                  <WaypointRow
                    key={v.id}
                    role="via"
                    label={v.label ?? `Via ${i + 1}`}
                    onRemove={() => removeWaypoint(v.id)}
                  />
                ))}
                <WaypointRow
                  role="end"
                  label={tripEnd?.label ?? null}
                  onRemove={
                    tripEnd ? () => removeWaypoint(tripEnd.id) : undefined
                  }
                />
                {waypoints.length > 0 && (
                  <div className="flex items-center justify-end gap-3">
                    <button
                      type="button"
                      onClick={reverseWaypoints}
                      disabled={waypoints.length < 2}
                      className="text-[10px] uppercase tracking-wider text-[color:var(--hud-text-muted)] hover:text-[color:var(--hud-accent)] disabled:opacity-40"
                    >
                      reverse
                    </button>
                    <button
                      type="button"
                      onClick={clearWaypoints}
                      className="text-[10px] uppercase tracking-wider text-[color:var(--hud-text-muted)] hover:text-[color:var(--hud-accent)]"
                    >
                      clear
                    </button>
                  </div>
                )}
              </div>

              <button
                type="button"
                onClick={handleFindRoutes}
                disabled={!canFindRoutes || phase.kind === "routing"}
                className="hud-btn-primary"
              >
                {phase.kind === "routing"
                  ? "Routing…"
                  : `Find routes · ${distanceMin}–${distanceMax} km`}
              </button>
            </>
          )}

          {phase.kind === "error" && (
            <p className="break-words text-[11px] text-[color:var(--hud-danger)]">
              {phase.message}
            </p>
          )}
          {notice && phase.kind !== "error" && (
            <p className="break-words text-[11px] text-[color:var(--hud-warn)]">
              {notice}
            </p>
          )}

          {candidates.length > 0 && (
            <div className="flex flex-col gap-1.5 pt-1">
              <div className="hud-section-heading">
                <span className="hud-label text-[9px]">Candidates</span>
                <span className="line" aria-hidden />
              </div>
              {candidates.map((c, i) => {
                const active = c.id === selectedCandidateId;
                const greenPct = c.greenRatio == null
                  ? null
                  : Math.round(c.greenRatio * 100);
                return (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCandidate(c.id)}
                    data-active={active}
                    className="hud-basemap-btn flex flex-col items-stretch gap-1 !p-2"
                  >
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[11px] font-semibold">
                        Route {i + 1}
                        <span className="ml-1.5 text-[10px] font-normal text-[color:var(--hud-text-muted)]">
                          · {c.profile}
                        </span>
                      </span>
                      <span className="hud-mono text-[11px]">
                        {c.distanceKm.toFixed(1)} km
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-[color:var(--hud-text-muted)]">
                      <span>
                        {Math.round(c.durationMin)} min · +
                        {Math.round(c.ascentM)} m
                      </span>
                      {greenPct != null && (
                        <span
                          className={
                            greenPct >= 60
                              ? "text-[color:var(--hud-accent)]"
                              : greenPct >= 30
                                ? "text-[color:var(--hud-warn)]"
                                : "text-[color:var(--hud-text-muted)]"
                          }
                        >
                          {greenPct}% green
                        </span>
                      )}
                    </div>
                    {active && (
                      <div className="pt-1">
                        <ElevationChart
                          coordinates={c.coordinates}
                          distanceKm={c.distanceKm}
                        />
                      </div>
                    )}
                  </button>
                );
              })}

              {selectedCandidateId && (
                <button
                  type="button"
                  onClick={handleExportGpx}
                  className="hud-btn-ghost !w-auto justify-center text-[10px] uppercase tracking-wider"
                >
                  Export GPX
                </button>
              )}
            </div>
          )}

          {(stations.length > 0 || candidates.length > 0) && (
            <button
              type="button"
              onClick={handleClearAll}
              className="self-end text-[10px] uppercase tracking-wider text-[color:var(--hud-text-muted)] hover:text-[color:var(--hud-accent)]"
            >
              clear all
            </button>
          )}

          <div className="text-[10px] text-[color:var(--hud-text-muted)]">
            BRouter · Overpass · OSM contributors
          </div>

          {/* enabled is persisted; reading it keeps it from being tree-shaken */}
          <span aria-hidden hidden>{String(enabled)}</span>
        </div>
      </HudPanel>
    </div>
  );
}

function RangeRow({
  label,
  min,
  max,
  step,
  value,
  onChange,
  suffix,
  format,
}: {
  label: string;
  min: number;
  max: number;
  step: number;
  value: number;
  onChange: (v: number) => void;
  suffix?: string;
  format?: (v: number) => string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="flex items-center gap-2">
      <span className="hud-label w-14 text-[9px]">{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="hud-slider flex-1"
        style={{ ["--hud-fill" as string]: `${Math.round(pct)}%` }}
      />
      <span className="hud-mono w-14 text-right text-[10px] text-[color:var(--hud-text-muted)]">
        {format ? format(value) : `${value}${suffix ?? ""}`}
      </span>
    </div>
  );
}

function DualRangeRow({
  label,
  min,
  max,
  loValue,
  hiValue,
  onChange,
}: {
  label: string;
  min: number;
  max: number;
  loValue: number;
  hiValue: number;
  onChange: (lo: number, hi: number) => void;
}) {
  const loPct = ((loValue - min) / (max - min)) * 100;
  const hiPct = ((hiValue - min) / (max - min)) * 100;
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <span className="hud-label w-14 text-[9px]">{label}</span>
        <span className="hud-mono flex-1 text-right text-[10px] text-[color:var(--hud-text-muted)]">
          {loValue}–{hiValue} km
        </span>
      </div>
      <div className="relative h-4">
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={loValue}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v <= hiValue - 1) onChange(v, hiValue);
          }}
          className="hud-slider absolute inset-0"
          style={{ ["--hud-fill" as string]: `${Math.round(loPct)}%` }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={1}
          value={hiValue}
          onChange={(e) => {
            const v = Number(e.target.value);
            if (v >= loValue + 1) onChange(loValue, v);
          }}
          className="hud-slider absolute inset-0"
          style={{ ["--hud-fill" as string]: `${Math.round(hiPct)}%` }}
        />
      </div>
    </div>
  );
}

function WaypointRow({
  role,
  label,
  onRemove,
}: {
  role: "start" | "via" | "end";
  label: string | null;
  onRemove?: () => void;
}) {
  const dotColor =
    role === "start" ? "#7df09e" : role === "end" ? "#ff6b82" : "#d4ff38";
  return (
    <div className="flex items-center gap-2 rounded-sm border border-[color:var(--hud-border)] bg-[rgba(255,255,255,0.02)] px-2 py-1">
      <span
        aria-hidden
        className="inline-block h-2 w-2 rounded-full"
        style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}80` }}
      />
      <span className="hud-label w-10 text-[9px]">{role}</span>
      <span className="min-w-0 flex-1 truncate text-[11px] text-[color:var(--hud-text)]">
        {label ?? (
          <span className="text-[color:var(--hud-text-muted)]">
            — tap a station or long-press the map —
          </span>
        )}
      </span>
      {onRemove && label && (
        <button
          type="button"
          aria-label={`Remove ${role}`}
          onClick={onRemove}
          className="text-[11px] text-[color:var(--hud-text-muted)] hover:text-[color:var(--hud-accent)]"
        >
          ×
        </button>
      )}
    </div>
  );
}
