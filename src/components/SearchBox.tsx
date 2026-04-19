"use client";

import { useEffect, useRef, useState } from "react";
import { geocode, type GeocodeResult } from "@/lib/geocode";

interface Props {
  onSelect: (result: GeocodeResult) => void;
}

type State =
  | { kind: "idle" }
  | { kind: "loading" }
  | { kind: "ok"; results: GeocodeResult[] }
  | { kind: "error"; message: string };

export function SearchBox({ onSelect }: Props) {
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
        const results = await geocode(query, { signal: ctrl.signal, limit: 6 });
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
    <div
      ref={boxRef}
      className="pointer-events-auto w-64 rounded-xl border border-neutral-700 bg-neutral-900/85 text-xs shadow-xl backdrop-blur"
    >
      <div className="flex items-center gap-2 px-2.5 py-1.5">
        <svg
          viewBox="0 0 16 16"
          className="h-3.5 w-3.5 shrink-0 text-neutral-500"
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
          className="w-full bg-transparent text-neutral-100 placeholder:text-neutral-500 focus:outline-none"
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
            className="text-neutral-500 hover:text-neutral-200"
            aria-label="Clear"
          >
            ✕
          </button>
        )}
      </div>

      {showDropdown && (
        <div className="border-t border-neutral-800">
          {state.kind === "loading" && (
            <div className="px-3 py-2 text-neutral-500">Searching…</div>
          )}
          {state.kind === "error" && (
            <div className="px-3 py-2 text-red-400">{state.message}</div>
          )}
          {state.kind === "ok" && state.results.length === 0 && (
            <div className="px-3 py-2 text-neutral-500">No matches</div>
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
                        ? "bg-sky-500/20 text-sky-100"
                        : "text-neutral-200 hover:bg-neutral-800"
                    }`}
                  >
                    <div className="truncate font-medium">{r.name || r.label}</div>
                    <div className="truncate text-[10px] text-neutral-500">
                      {r.label.replace(r.name ? `${r.name}, ` : "", "") || "—"}
                      {r.category && (
                        <span className="ml-1.5 rounded bg-neutral-800 px-1 py-0.5 text-neutral-400">
                          {r.category}
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
