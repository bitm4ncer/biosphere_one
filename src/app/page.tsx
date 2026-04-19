"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { CredentialsModal } from "@/components/CredentialsModal";
import { clearCredentials, loadCredentials, saveCredentials } from "@/lib/sentinel/auth";
import type { Credentials } from "@/types/sentinel";

const LiveMap = dynamic(() => import("@/components/Map").then((m) => m.LiveMap), {
  ssr: false,
  loading: () => (
    <div className="flex h-full w-full items-center justify-center text-sm text-neutral-500">
      Loading map…
    </div>
  ),
});

export default function Home() {
  const [creds, setCreds] = useState<Credentials | null>(null);
  const [credsLoaded, setCredsLoaded] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const c = loadCredentials();
    setCreds(c);
    setCredsLoaded(true);
  }, []);

  function handleSave(c: Credentials) {
    saveCredentials(c);
    setCreds(c);
    setShowModal(false);
  }

  function handleReset() {
    clearCredentials();
    setCreds(null);
    setShowModal(true);
  }

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="flex items-center justify-between border-b border-neutral-800 bg-neutral-950/95 px-4 py-2 backdrop-blur">
        <div className="flex items-baseline gap-3">
          <h1 className="text-base font-semibold tracking-tight">Biosphere1</h1>
          <span className="hidden text-xs text-neutral-500 sm:inline">
            Live Sentinel-2 · client-side
          </span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          {credsLoaded && (
            <span className="hidden text-neutral-500 sm:inline">
              {creds ? "credentials set" : "no credentials"}
            </span>
          )}
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="rounded-md border border-neutral-700 px-2.5 py-1 text-neutral-300 hover:bg-neutral-800"
          >
            {creds ? "Edit credentials" : "Add credentials"}
          </button>
          {creds && (
            <button
              type="button"
              onClick={handleReset}
              className="rounded-md border border-neutral-800 px-2.5 py-1 text-neutral-500 hover:text-neutral-200"
            >
              Clear
            </button>
          )}
        </div>
      </header>

      <main className="relative flex-1">
        <LiveMap credentials={creds} />
      </main>

      {showModal && (
        <CredentialsModal
          initial={creds}
          onSave={handleSave}
          onClose={creds ? () => setShowModal(false) : undefined}
        />
      )}
    </div>
  );
}
