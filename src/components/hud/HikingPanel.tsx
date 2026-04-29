"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { Map as MLMap } from "maplibre-gl";
import { HudPanel } from "./HudPanel";
import { useHiking } from "@/lib/hiking/store";
import { computeHikingRoute } from "@/lib/hiking/search";
import {
  BROUTER_PROFILES,
  type BrouterProfile,
} from "@/lib/hiking/routing";
import { downloadGpx, routeToGpx } from "@/lib/hiking/gpx";
import { ElevationChart } from "@/components/hiking/ElevationChart";
import { geocode, type GeocodeResult } from "@/lib/geocode";

interface Props {
  mapRef: React.MutableRefObject<MLMap | null>;
}

const ROUTE_DEBOUNCE_MS = 200;

export function HikingPanel({ mapRef }: Props) {
  const waypoints = useHiking((s) => s.waypoints);
  const roundTrip = useHiking((s) => s.roundTrip);
  const profile = useHiking((s) => s.profile);
  const candidates = useHiking((s) => s.candidates);
  const selectedCandidateId = useHiking((s) => s.selectedCandidateId);
  const finalized = useHiking((s) => s.finalized);
  const phase = useHiking((s) => s.phase);
  const notice = useHiking((s) => s.notice);

  const setEnabled = useHiking((s) => s.setEnabled);
  const addWaypoint = useHiking((s) => s.addWaypoint);
  const removeWaypoint = useHiking((s) => s.removeWaypoint);
  const moveWaypoint = useHiking((s) => s.moveWaypoint);
  const reverseWaypoints = useHiking((s) => s.reverseWaypoints);
  const clearWaypoints = useHiking((s) => s.clearWaypoints);
  const setRoundTrip = useHiking((s) => s.setRoundTrip);
  const setProfile = useHiking((s) => s.setProfile);
  const setCandidates = useHiking((s) => s.setCandidates);
  const selectCandidate = useHiking((s) => s.selectCandidate);
  const finalizeRoute = useHiking((s) => s.finalizeRoute);
  const unfinalize = useHiking((s) => s.unfinalize);
  const setPhase = useHiking((s) => s.setPhase);
  const setNotice = useHiking((s) => s.setNotice);

  const abortRef = useRef<AbortController | null>(null);

  // Activate hiking layers as long as the panel is mounted.
  useEffect(() => {
    setEnabled(true);
  }, [setEnabled]);

  // Auto-recompute the route whenever waypoints / profile / round-trip change.
  // Skips while finalized — the user has committed to this exact route.
  useEffect(() => {
    if (finalized) return;
    if (waypoints.length < 2) {
      setCandidates([]);
      setPhase({ kind: "idle" });
      return;
    }
    const ctrl = new AbortController();
    abortRef.current?.abort();
    abortRef.current = ctrl;
    const handle = window.setTimeout(async () => {
      setPhase({ kind: "routing" });
      setNotice(null);
      try {
        const result = await computeHikingRoute({
          waypoints,
          roundTrip,
          profile,
          signal: ctrl.signal,
          // Phase 2: green scoring resolves async; re-render candidates
          // (now with greenRatio) and re-rank. The user already saw the
          // unscored line within ~1 s.
          onScored: (scored, scoreNotice) => {
            if (ctrl.signal.aborted) return;
            setCandidates(scored);
            if (scoreNotice) setNotice(scoreNotice);
          },
        });
        if (ctrl.signal.aborted) return;
        setCandidates(result.candidates);
        setPhase({ kind: "routed" });
        if (result.notice) setNotice(result.notice);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setPhase({ kind: "error", message: (err as Error).message });
      }
    }, ROUTE_DEBOUNCE_MS);
    return () => {
      window.clearTimeout(handle);
      ctrl.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waypoints, roundTrip, profile, finalized]);

  // Fly to the selected route once it is computed.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    const cand = candidates.find((c) => c.id === selectedCandidateId);
    if (!cand || cand.coordinates.length < 2) return;
    let south = Infinity;
    let west = Infinity;
    let north = -Infinity;
    let east = -Infinity;
    for (const [lon, lat] of cand.coordinates) {
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
        { padding: 70, duration: 700, maxZoom: 14 },
      );
    }
  }, [selectedCandidateId, candidates, mapRef]);

  const handleAddGps = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setNotice("Geolocation not available.");
      return;
    }
    setNotice("Requesting location…");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        addWaypoint({
          lat: pos.coords.latitude,
          lon: pos.coords.longitude,
          label: "My location",
          source: "gps",
        });
        setNotice(null);
      },
      (err) => setNotice(`Location error: ${err.message}`),
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  }, [addWaypoint, setNotice]);

  const handleAddSearchResult = useCallback(
    (r: GeocodeResult) => {
      addWaypoint({
        lat: r.coordinates[1],
        lon: r.coordinates[0],
        label: r.label || r.name || "Search result",
        source: "search",
      });
    },
    [addWaypoint],
  );

  const handleExportGpx = useCallback(() => {
    if (!selectedCandidateId) return;
    const cand = candidates.find((c) => c.id === selectedCandidateId);
    if (!cand) return;
    const first = waypoints[0]?.label ?? "Start";
    const last = waypoints[waypoints.length - 1]?.label ?? "End";
    const name = `${first} → ${last} · ${cand.distanceKm.toFixed(1)} km`;
    const gpx = routeToGpx(cand, { name, waypoints });
    const filename = `hike-${first}-${last}-${cand.distanceKm.toFixed(1)}km.gpx`
      .replace(/\s+/g, "_")
      .replace(/[^a-zA-Z0-9._\-]/g, "");
    downloadGpx(filename, gpx);
  }, [selectedCandidateId, candidates, waypoints]);

  const selectedCand = useMemo(
    () => candidates.find((c) => c.id === selectedCandidateId) ?? null,
    [candidates, selectedCandidateId],
  );
  const altCount = finalized
    ? 0
    : Math.max(0, candidates.length - 1);

  return (
    <div className="flex flex-col gap-3">
      {/* Route summary card */}
      <HudPanel label="Route">
        <RouteSummary
          phase={phase}
          waypointCount={waypoints.length}
          candidate={selectedCand}
          finalized={finalized}
        />
      </HudPanel>

      {/* Waypoints */}
      <HudPanel label={`Waypoints · ${waypoints.length}`}>
        <div className="flex flex-col gap-2">
          {waypoints.length === 0 ? (
            <p className="text-[11px] text-[color:var(--hud-text-muted)]">
              Long-press the map to drop a waypoint, search by name, use GPS,
              or tap a station when Rail · Lines is active.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {waypoints.map((w, i) => (
                <li key={w.id}>
                  <WaypointRow
                    index={i}
                    total={waypoints.length}
                    label={w.label}
                    source={w.source}
                    onUp={() => moveWaypoint(w.id, -1)}
                    onDown={() => moveWaypoint(w.id, 1)}
                    onDelete={() => removeWaypoint(w.id)}
                  />
                </li>
              ))}
            </ul>
          )}

          {/* Add row */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleAddGps}
              className="hud-btn-ghost !w-auto justify-center gap-1.5 px-2 text-[10px] uppercase tracking-wider"
              title="Add my current location"
            >
              <GpsIcon /> GPS
            </button>
            <SearchAdd onPick={handleAddSearchResult} />
          </div>
        </div>
      </HudPanel>

      {/* Options */}
      <HudPanel label="Options">
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="hud-label text-[9px]">Round-trip</span>
            <ToggleSwitch
              on={roundTrip}
              onChange={setRoundTrip}
              ariaLabel="Round-trip"
            />
          </div>
          <button
            type="button"
            onClick={reverseWaypoints}
            disabled={waypoints.length < 2}
            className="hud-btn-ghost !w-auto justify-center gap-1.5 self-start px-2 text-[10px] uppercase tracking-wider"
          >
            <ReverseIcon /> Reverse order
          </button>
          <div className="flex flex-col gap-1">
            <span className="hud-label text-[9px]">Profile</span>
            <div className="hud-tab-row" style={{ gridTemplateColumns: `repeat(${BROUTER_PROFILES.length}, minmax(0, 1fr))` }}>
              {BROUTER_PROFILES.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  className="hud-tab"
                  data-active={profile === p.id}
                  onClick={() => setProfile(p.id as BrouterProfile)}
                >
                  {p.label.replace("Hiking · ", "").replace("Walking · ", "")}
                </button>
              ))}
            </div>
          </div>
        </div>
      </HudPanel>

      {/* Candidates / actions */}
      {candidates.length > 0 && (
        <HudPanel label={finalized ? "Final route" : `Options · ${candidates.length}`}>
          <div className="flex flex-col gap-1.5">
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

            {(finalized
              ? candidates.filter((c) => c.id === selectedCandidateId)
              : candidates
            ).map((c, i) => {
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
                      {finalized ? "Selected" : `Option ${i + 1}`}
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
                      {Math.round(c.durationMin)} min · +{Math.round(c.ascentM)} m
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

            {!finalized && altCount > 0 && (
              <p className="text-[10px] text-[color:var(--hud-text-muted)]">
                {altCount} alternative{altCount === 1 ? "" : "s"} drawn on map
                — tap a dashed line or option above to switch.
              </p>
            )}

            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {!finalized ? (
                <button
                  type="button"
                  onClick={finalizeRoute}
                  disabled={!selectedCandidateId}
                  className="hud-btn-primary"
                >
                  Confirm route
                </button>
              ) : (
                <button
                  type="button"
                  onClick={unfinalize}
                  className="hud-btn-ghost !w-auto justify-center px-3 text-[10px] uppercase tracking-wider"
                >
                  Show options
                </button>
              )}
              {selectedCandidateId && (
                <button
                  type="button"
                  onClick={handleExportGpx}
                  className="hud-btn-ghost !w-auto justify-center px-3 text-[10px] uppercase tracking-wider"
                >
                  Export GPX
                </button>
              )}
            </div>
          </div>
        </HudPanel>
      )}

      {(waypoints.length > 0 || candidates.length > 0) && (
        <button
          type="button"
          onClick={() => {
            abortRef.current?.abort();
            clearWaypoints();
            setNotice(null);
          }}
          className="self-end text-[10px] uppercase tracking-wider text-[color:var(--hud-text-muted)] hover:text-[color:var(--hud-accent)]"
        >
          clear all
        </button>
      )}

      <div className="text-[10px] text-[color:var(--hud-text-muted)]">
        BRouter · Photon · Overpass · OSM contributors
      </div>
    </div>
  );
}

function RouteSummary({
  phase,
  waypointCount,
  candidate,
  finalized,
}: {
  phase: ReturnType<typeof useHiking.getState>["phase"];
  waypointCount: number;
  candidate: ReturnType<typeof useHiking.getState>["candidates"][number] | null;
  finalized: boolean;
}) {
  if (waypointCount < 2) {
    return (
      <p className="text-[11px] text-[color:var(--hud-text-muted)]">
        Add at least two waypoints to compute a route.
      </p>
    );
  }
  if (phase.kind === "routing") {
    return (
      <p className="text-[11px] text-[color:var(--hud-text-muted)]">
        Computing route…
      </p>
    );
  }
  if (phase.kind === "error") {
    return (
      <p className="break-words text-[11px] text-[color:var(--hud-danger)]">
        {phase.message}
      </p>
    );
  }
  if (!candidate) {
    return (
      <p className="text-[11px] text-[color:var(--hud-text-muted)]">
        Adjust waypoints to compute a route.
      </p>
    );
  }
  const greenPct = candidate.greenRatio == null
    ? null
    : Math.round(candidate.greenRatio * 100);
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between gap-2">
        <span className="hud-mono text-[14px] text-[color:var(--hud-accent)]">
          {candidate.distanceKm.toFixed(1)} km
        </span>
        <span className="hud-mono text-[11px] text-[color:var(--hud-text-muted)]">
          {Math.round(candidate.durationMin)} min · +
          {Math.round(candidate.ascentM)} m
        </span>
      </div>
      <div className="flex items-center justify-between gap-2 text-[10px] text-[color:var(--hud-text-muted)]">
        <span>{finalized ? "Final · committed" : "Best of options · tap Confirm to lock"}</span>
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
    </div>
  );
}

function WaypointRow({
  index,
  total,
  label,
  source,
  onUp,
  onDown,
  onDelete,
}: {
  index: number;
  total: number;
  label: string;
  source: string;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
}) {
  const role = index === 0 ? "start" : index === total - 1 ? "end" : "via";
  const dotColor =
    role === "start" ? "#7df09e" : role === "end" ? "#ff6b82" : "#d4ff38";
  return (
    <div className="flex items-center gap-1.5 rounded-sm border border-[color:var(--hud-border)] bg-[rgba(255,255,255,0.02)] px-1.5 py-1">
      <span
        aria-hidden
        className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-[#0a0a0b]"
        style={{ background: dotColor, boxShadow: `0 0 6px ${dotColor}80` }}
      >
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[11px] text-[color:var(--hud-text)]">
          {label}
        </div>
        <div className="text-[9px] uppercase tracking-wider text-[color:var(--hud-text-muted)]">
          {role} · {source}
        </div>
      </div>
      <div className="flex items-center">
        <IconBtn ariaLabel="Move up" disabled={index === 0} onClick={onUp}>
          <ArrowUpIcon />
        </IconBtn>
        <IconBtn
          ariaLabel="Move down"
          disabled={index === total - 1}
          onClick={onDown}
        >
          <ArrowDownIcon />
        </IconBtn>
        <IconBtn ariaLabel="Remove" onClick={onDelete}>
          <CloseIcon />
        </IconBtn>
      </div>
    </div>
  );
}

function IconBtn({
  children,
  onClick,
  disabled,
  ariaLabel,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className="inline-flex h-6 w-6 items-center justify-center rounded-sm text-[color:var(--hud-text-muted)] transition-colors hover:bg-[var(--hud-accent-soft)] hover:text-[color:var(--hud-accent)] disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-[color:var(--hud-text-muted)]"
    >
      {children}
    </button>
  );
}

function ToggleSwitch({
  on,
  onChange,
  ariaLabel,
}: {
  on: boolean;
  onChange: (on: boolean) => void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      onClick={() => onChange(!on)}
      className="hud-switch"
      data-on={on}
    >
      <span className="hud-switch-thumb" aria-hidden />
    </button>
  );
}

function SearchAdd({
  onPick,
}: {
  onPick: (r: GeocodeResult) => void;
}) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<GeocodeResult[]>([]);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [anchor, setAnchor] = useState<{
    left: number;
    top: number;
    width: number;
  } | null>(null);
  const ctrlRef = useRef<AbortController | null>(null);
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const text = q.trim();
    if (text.length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    ctrlRef.current?.abort();
    const ctrl = new AbortController();
    ctrlRef.current = ctrl;
    setBusy(true);
    const handle = window.setTimeout(async () => {
      try {
        const out = await geocode(text, { limit: 6, signal: ctrl.signal });
        if (ctrl.signal.aborted) return;
        setResults(out);
        setOpen(true);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setResults([]);
      } finally {
        if (!ctrl.signal.aborted) setBusy(false);
      }
    }, 250);
    return () => {
      window.clearTimeout(handle);
      ctrl.abort();
    };
  }, [q]);

  // Track input position so the portal-rendered dropdown stays anchored.
  useEffect(() => {
    if (!open) return;
    const update = () => {
      const el = inputRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      setAnchor({ left: r.left, top: r.bottom + 4, width: r.width });
    };
    update();
    window.addEventListener("resize", update);
    window.addEventListener("scroll", update, true);
    return () => {
      window.removeEventListener("resize", update);
      window.removeEventListener("scroll", update, true);
    };
  }, [open]);

  // Close on outside click / touch.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      if (wrapRef.current?.contains(target)) return;
      // The dropdown lives in a portal — check by data-attribute.
      const inDropdown = (target as HTMLElement).closest?.(
        "[data-search-dropdown=\"true\"]",
      );
      if (inDropdown) return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown, true);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown, true);
    };
  }, [open]);

  return (
    <div ref={wrapRef} className="relative min-w-0 flex-1">
      <input
        ref={inputRef}
        type="search"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search a place…"
        className="hud-search w-full px-2 py-1 text-[11px]"
      />
      {busy && (
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] text-[color:var(--hud-text-muted)]">
          …
        </span>
      )}
      {open && results.length > 0 && anchor && typeof document !== "undefined"
        ? createPortal(
            <div
              data-search-dropdown="true"
              className="hud-scrollbar fixed z-[1000] max-h-64 overflow-y-auto rounded-sm border border-[color:var(--hud-border)] bg-[color:var(--hud-surface-solid)] shadow-lg backdrop-blur"
              style={{
                left: anchor.left,
                top: anchor.top,
                width: anchor.width,
              }}
            >
              {results.map((r) => (
                <button
                  key={r.id}
                  type="button"
                  onClick={() => {
                    onPick(r);
                    setQ("");
                    setResults([]);
                    setOpen(false);
                  }}
                  className="flex w-full items-start gap-1 border-b border-[color:var(--hud-border)] px-2 py-1.5 text-left text-[11px] text-[color:var(--hud-text)] last:border-b-0 hover:bg-[var(--hud-accent-soft)] hover:text-[color:var(--hud-accent)]"
                >
                  <span className="truncate">{r.label || r.name}</span>
                </button>
              ))}
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

// --- Inline icons ---
function ArrowUpIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 19V5" />
      <path d="m6 11 6-6 6 6" />
    </svg>
  );
}
function ArrowDownIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 5v14" />
      <path d="m6 13 6 6 6-6" />
    </svg>
  );
}
function CloseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}
function GpsIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3" />
      <path d="M12 19v3" />
      <path d="M2 12h3" />
      <path d="M19 12h3" />
    </svg>
  );
}
function ReverseIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="m17 3 4 4-4 4" />
      <path d="M21 7H7" />
      <path d="m7 21-4-4 4-4" />
      <path d="M3 17h14" />
    </svg>
  );
}
