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
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4"
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
        className="w-full max-w-lg rounded-3xl bg-[color:var(--surf-1)] p-7 shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
      >
        <div className="mb-5 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="pane-tape mb-3 w-12" aria-hidden />
            <h2
              id={titleId}
              className="text-[18px] font-semibold tracking-tight text-[color:var(--ink)]"
            >
              Bring your own credentials
            </h2>
            <p
              id={descId}
              className="mt-1.5 text-[13px] leading-relaxed text-[color:var(--ink-dim)]"
            >
              BiosphereOne runs entirely in your browser — no backend, no
              proxy. Create an OAuth client in your{" "}
              <a
                href="https://dataspace.copernicus.eu/"
                target="_blank"
                rel="noreferrer"
                className="text-[color:var(--accent)] underline underline-offset-2 hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] rounded"
              >
                Copernicus Data Space
              </a>{" "}
              account (type: <span className="font-mono">Single-Page Application</span>,
              Web origins: allow all or your page URL).
            </p>
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="hud-icon-btn shrink-0"
              aria-label="Close"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
                aria-hidden
              >
                <path d="M4 4 L12 12 M12 4 L4 12" />
              </svg>
            </button>
          )}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!canSubmit) return;
            onSave({ clientId: clientId.trim(), clientSecret: clientSecret.trim() });
          }}
          className="space-y-4"
        >
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-[color:var(--ink-dim)]">
              Client ID
            </span>
            <input
              type="text"
              value={clientId}
              onChange={(e) => setClientId(e.target.value)}
              className="w-full rounded-2xl bg-[color:var(--surf-0)] px-4 py-2.5 font-mono text-[13px] text-[color:var(--ink)] placeholder:text-[color:var(--ink-mute)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
              placeholder="sh-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              autoComplete="off"
              spellCheck={false}
              autoFocus
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[12px] font-medium text-[color:var(--ink-dim)]">
              Client Secret
            </span>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="w-full rounded-2xl bg-[color:var(--surf-0)] px-4 py-2.5 pr-20 font-mono text-[13px] text-[color:var(--ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)]"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full px-3 py-1 text-[11px] text-[color:var(--ink-dim)] hover:bg-[rgba(241,240,232,0.06)] hover:text-[color:var(--ink)]"
                aria-label={showSecret ? "Hide secret" : "Show secret"}
              >
                {showSecret ? "hide" : "show"}
              </button>
            </div>
          </label>

          <p className="text-[11px] text-[color:var(--ink-mute)]">
            Stored in <span className="font-mono">localStorage</span>. Your
            credentials never leave this browser except when calling Copernicus
            directly.
          </p>

          <div className="flex items-center justify-between gap-2 pt-2">
            {onClear ? (
              <button
                type="button"
                onClick={onClear}
                className="rounded-full px-3 py-2 text-[12px] text-[color:var(--danger)] hover:bg-[rgba(236,128,115,0.08)]"
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
                  className="rounded-full px-4 py-2 text-[12px] text-[color:var(--ink-dim)] hover:bg-[rgba(241,240,232,0.06)] hover:text-[color:var(--ink)]"
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
