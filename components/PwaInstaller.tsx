"use client";

import { useEffect, useState } from "react";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaInstaller() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [hidden, setHidden] = useState(false);

  // Register the service worker on mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Ignore — the app still works without SW, just not installable offline.
      });
    };

    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return;
    if (sessionStorage.getItem("pwa-install-dismissed") === "1") {
      setHidden(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  if (hidden || !deferredPrompt) return null;

  const install = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    try {
      await deferredPrompt.userChoice;
    } catch {
      // ignore
    }
    setDeferredPrompt(null);
  };

  const dismiss = () => {
    sessionStorage.setItem("pwa-install-dismissed", "1");
    setHidden(true);
  };

  return (
    <div className="pwa-install-banner" role="dialog" aria-label="Ilovani o'rnatish">
      <div className="pwa-install-text">
        <strong>Ilova sifatida o'rnating</strong>
        <span>Telefon bosh ekraningizga qo'shib, brauzersiz oching</span>
      </div>
      <div className="pwa-install-actions">
        <button type="button" className="btn-ghost" onClick={dismiss}>
          Keyin
        </button>
        <button type="button" className="btn-primary" onClick={install}>
          O'rnatish
        </button>
      </div>
    </div>
  );
}
