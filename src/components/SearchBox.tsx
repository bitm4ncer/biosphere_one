"use client";

import { useEffect, useRef, useState } from "react";
import { geocode, prettyCategory, type GeocodeResult } from "@/lib/geocode";

interface Props {
  onSelect: (result: GeocodeResult) => void;
  /** [lng, lat] — used to bias geocoding toward what's on screen, so
   * supermarkets / cafés / sights nearby outrank distant string matches. */
  nearby?: [number, number];
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; results: GeocodeResult[] }
  | { kind: "error"; message: string };

export function SearchBox({ onSelect, nearby }: Props) {
  const [query, setQuery] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });
  const [focused, setFocused] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const abortRef = useRef<AbortController | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (query.trim().length < 2) {
      setState({ kind: "idle" });
      abortRef.current?.abort();
      return;
    }

    const timer = setTimeout(async () => {
      abortRef.current?.abort();
      const ctrl = new AbortController();
      abortRef.current = ctrl;
      setState({ kind: "loading" });
      try {
        const results = await geocode(query, {
          signal: ctrl.signal,
          limit: 8,
          nearby,
        });
        if (!ctrl.signal.aborted) {
          setState({ kind: "ok", results });
          setHighlight(0);
        }
      } catch (err) {
        if (ctrl.signal.aborted) return;
        setState({
          kind: "error",
          message: err instanceof Error ? err.message : String(err),
        });
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setFocused(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function choose(r: GeocodeResult) {
    onSelect(r);
    setQuery(r.label || r.name);
    setFocused(false);
  }

  function handleKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (state.kind !== "ok" || !state.results.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => Math.min(h + 1, state.results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(state.results[highlight]);
    } else if (e.key === "Escape") {
      setFocused(false);
    }
  }

  const showDropdown =
    focused &&
    query.trim().length >= 2 &&
    (state.kind === "loading" || state.kind === "ok" || state.kind === "error");

  return (
    <div ref={boxRef} className="pointer-events-auto relative w-full text-xs">
      <div className="hud-search flex h-9 items-center gap-2 px-4">
        <svg
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5 shrink-0 text-[color:var(--hud-text-muted)]"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        >
          <circle cx="7" cy="7" r="4.5" />
          <path d="m10.5 10.5 3 3" />
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setFocused(true)}
          onKeyDown={handleKey}
          placeholder="Search places, streets, POIs"
          className="w-full bg-transparent text-[color:var(--hud-text)] placeholder:text-[color:var(--hud-text-muted)] focus:outline-none"
          spellCheck={false}
          autoComplete="off"
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setState({ kind: "idle" });
            }}
            className="text-[color:var(--hud-text-muted)] hover:text-[color:var(--hud-accent)]"
            aria-label="Clear"
          >
            ✕
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="hud-search-dropdown absolute left-0 right-0 top-full z-50 mt-1">
          {state.kind === "loading" && (
            <div className="px-3 py-2 text-[color:var(--hud-text-muted)]">Searching…</div>
          )}
          {state.kind === "error" && (
            <div className="px-3 py-2 text-[color:var(--hud-danger)]">{state.message}</div>
          )}
          {state.kind === "ok" && state.results.length === 0 && (
            <div className="px-3 py-2 text-[color:var(--hud-text-muted)]">No matches</div>
          )}
          {state.kind === "ok" && state.results.length > 0 && (
            <ul className="max-h-72 overflow-y-auto">
              {state.results.map((r, i) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => choose(r)}
                    onMouseEnter={() => setHighlight(i)}
                    className={`block w-full px-3 py-1.5 text-left transition-colors ${
                      highlight === i
                        ? "bg-[color:var(--hud-accent-soft)] text-[color:var(--hud-accent)]"
                        : "text-[color:var(--hud-text)] hover:bg-white/5"
                    }`}
                  >
                    <div className="truncate font-medium">{r.name || r.label}</div>
                    <div className="truncate text-[10px] text-[color:var(--hud-text-muted)]">
                      {r.label.replace(r.name ? `${r.name}, ` : "", "") || "—"}
                      {prettyCategory(r.category) && (
                        <span className="ml-1.5 rounded-full border border-[color:var(--hud-border)] px-1.5 py-0.5 text-[color:var(--hud-text-muted)]">
                          {prettyCategory(r.category)}
                        </span>
                      )}
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
