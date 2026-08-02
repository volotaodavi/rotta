"use client";

import { useEffect } from "react";

/** Registro do Service Worker (briefing "PWA") — melhoria progressiva: navegadores sem suporte simplesmente ignoram. */
export function ServiceWorkerRegistration(): null {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  return null;
}
