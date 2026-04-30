"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { CredentialsModal } from "@/components/CredentialsModal";
import { SearchBox } from "@/components/SearchBox";
import { clearCredentials, loadCredentials, saveCredentials } from "@/lib/sentinel/auth";
import type { GeocodeResult } from "@/lib/geocode";
import type { Credentials } from "@/types/sentinel";

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

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
  const [flyTarget, setFlyTarget] = useState<GeocodeResult | null>(null);

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
    setShowModal(false);
  }

  return (
    <div className="fixed inset-0 flex flex-col">
      <header className="relative z-50 flex items-center gap-3 border-b border-[color:var(--hud-border)] bg-[color:var(--hud-surface-solid)] px-4 py-2 pt-[max(env(safe-area-inset-top,0px),0.5rem)] backdrop-blur">
        <h1 className="shrink-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`${basePath}/icon.svg`}
            alt="Biosphere1"
            width={32}
            height={32}
            className="block h-8 w-8"
          />
        </h1>
        <div className="min-w-0 max-w-xl flex-1">
          <SearchBox onSelect={setFlyTarget} />
        </div>
      </header>

      <main className="relative flex-1 overflow-hidden">
        <LiveMap
          credentials={creds}
          flyTarget={flyTarget}
          onOpenSettings={() => setShowModal(true)}
        />
      </main>

      {showModal && (
        <CredentialsModal
          initial={creds}
          onSave={handleSave}
          onClose={() => setShowModal(false)}
          onClear={creds && credsLoaded ? handleReset : undefined}
        />
      )}
    </div>
  );
}
