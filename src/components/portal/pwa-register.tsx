"use client";

import { useEffect } from "react";

export function PWARegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // Unregister all existing service workers and clear all caches.
    // The old SW (v2) cached HTML pages and API responses, causing auth
    // redirect loops. This runs on every portal load to self-heal any
    // affected browser without requiring user action.
    async function cleanup() {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((r) => r.unregister()));

      const cacheKeys = await caches.keys();
      await Promise.all(cacheKeys.map((k) => caches.delete(k)));
    }

    cleanup().catch(() => {});
  }, []);

  return null;
}
