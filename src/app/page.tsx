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
    setShowModal(false);
  }

  return (
    <div className="fixed inset-0">
      <LiveMap
        credentials={creds}
        onOpenSettings={() => setShowModal(true)}
      />

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
