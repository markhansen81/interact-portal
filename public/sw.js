const CACHE_NAME = 'interact-ta-v3';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  // Clear all old caches
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Pass all requests through to the network — no caching.
// The portal uses server-side auth (cookies); caching HTML or API
// responses causes stale auth state and session redirect loops.
self.addEventListener('fetch', () => {
  // intentionally do nothing — browser handles normally
});
