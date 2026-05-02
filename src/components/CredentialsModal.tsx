"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Credentials } from "@/types/sentinel";

interface Props {
  initial?: Credentials | null;
  onSave: (c: Credentials) => void;
  onClose?: () => void;
  onClear?: () => void;
}

export function CredentialsModal({ initial, onSave, onClose, onClear }: Props) {
  const [clientId, setClientId] = useState(initial?.clientId ?? "");
  const [clientSecret, setClientSecret] = useState(initial?.clientSecret ?? "");
  const [showSecret, setShowSecret] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const descId = useId();

  const canSubmit = clientId.trim().length > 0 && clientSecret.trim().length > 0;

  // ESC closes; Tab is trapped inside the dialog so keyboard users don't fall
  // through to the map underneath.
  useEffect(() => {
    if (!onClose) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }
      if (e.key !== "Tab") return;
      const root = dialogRef.current;
      if (!root) return;
      const focusables = root.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusables.length === 0) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      const active = document.activeElement as HTMLElement | null;
      if (e.shiftKey && (active === first || !root.contains(active))) {
        last.focus();
        e.preventDefault();
      } else if (!e.shiftKey && active === last) {
        first.focus();
        e.preventDefault();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (onClose && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={descId}
        className="w-full max-w-lg rounded-3xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl"
      >
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 id={titleId} className="text-lg font-semibold tracking-tight">
              Bring your own credentials
            </h2>
            <p id={descId} className="mt-1 text-sm text-neutral-400">
              BiosphereOne runs entirely in your browser — no backend, no proxy. Create an OAuth
              client in your{" "}
              <a
                href="https://dataspace.copernicus.eu/"
                target="_blank"
                rel="noreferrer"
                className="text-[color:var(--hud-accent)] underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--hud-accent)] rounded"
              >
                Copernicus Data Space
              </a>{" "}
              account (type: <span className="font-mono">Single-Page Application</span>, Web
              origins: allow all or your page URL).
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="ml-4 text-neutral-500 hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--hud-accent)] rounded-full"
              aria-label="Close"
            >
              ✕
            </button>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            onSave({ clientId: clientId.trim(), clientSecret: clientSecret.trim() });
          }}
          className="space-y-3"
        >
          <label className="block text-sm">
            <span className="mb-1 block text-neutral-300">Client ID</span>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-full border border-neutral-700 bg-neutral-950 px-5 py-2 font-mono text-sm focus:border-[color:var(--hud-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--hud-accent)]"
              placeholder="sh-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-neutral-300">Client Secret</span>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="w-full rounded-full border border-neutral-700 bg-neutral-950 px-5 py-2 pr-20 font-mono text-sm focus:border-[color:var(--hud-accent)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--hud-accent)]"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--hud-accent)]"
                aria-label={showSecret ? "Hide secret" : "Show secret"}
              >
                {showSecret ? "hide" : "show"}
              </button>
            </div>
          </label>

          <p className="text-xs text-neutral-500">
            Stored in <span className="font-mono">localStorage</span>. Your credentials never
            leave this browser except when calling Copernicus directly.
          </p>

          <div className="flex items-center justify-between gap-2 pt-2">
            {onClear ? (
              <button
                type="button"
                onClick={onClear}
                className="rounded-full px-3 py-2 text-sm text-red-400 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400"
              >
                Clear credentials
              </button>
            ) : (
              <span />
            )}
            <div className="flex items-center gap-2">
              {onClose && (
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-full px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--hud-accent)]"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={!canSubmit}
                className="hud-btn-primary"
              >
                Save
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
