"use client";

import { useState } from "react";
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

  const canSubmit = clientId.trim().length > 0 && clientSecret.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-neutral-800 bg-neutral-900 p-6 shadow-2xl">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold tracking-tight">Bring your own credentials</h2>
            <p className="mt-1 text-sm text-neutral-400">
              Biosphere1 runs entirely in your browser — no backend, no proxy. Create an OAuth
              client in your{" "}
              <a
                href="https://dataspace.copernicus.eu/"
                target="_blank"
                rel="noreferrer"
                className="text-sky-400 underline underline-offset-2 hover:text-sky-300"
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
              className="ml-4 text-neutral-500 hover:text-neutral-200"
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
              className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 font-mono text-sm focus:border-sky-500 focus:outline-none"
              placeholder="sh-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
              autoComplete="off"
              spellCheck={false}
            />
          </label>

          <label className="block text-sm">
            <span className="mb-1 block text-neutral-300">Client Secret</span>
            <div className="relative">
              <input
                type={showSecret ? "text" : "password"}
                value={clientSecret}
                onChange={(e) => setClientSecret(e.target.value)}
                className="w-full rounded-lg border border-neutral-700 bg-neutral-950 px-3 py-2 pr-16 font-mono text-sm focus:border-sky-500 focus:outline-none"
                autoComplete="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => setShowSecret((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 rounded px-2 py-1 text-xs text-neutral-400 hover:text-neutral-200"
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
                className="rounded-lg px-3 py-2 text-sm text-red-400 hover:text-red-300"
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
                  className="rounded-lg px-4 py-2 text-sm text-neutral-400 hover:text-neutral-200"
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                disabled={!canSubmit}
                className="rounded-lg bg-sky-500 px-4 py-2 text-sm font-medium text-black hover:bg-sky-400 disabled:cursor-not-allowed disabled:bg-neutral-700 disabled:text-neutral-400"
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
