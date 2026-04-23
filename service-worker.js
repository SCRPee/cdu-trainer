/* CDU Trainer — service worker
   Caches the app shell so it works offline once installed. */
const CACHE = 'cdu-trainer-v1';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  // B612 Mono is loaded from Google Fonts; runtime cache below covers it.
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req).then((res) => {
        // Cache successful same-origin and font responses on the fly.
        try {
          const url = new URL(req.url);
          const isAppOrigin = url.origin === self.location.origin;
          const isFontHost  = url.host === 'fonts.googleapis.com' || url.host === 'fonts.gstatic.com';
          if ((isAppOrigin || isFontHost) && res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
        } catch (_) {}
        return res;
      }).catch(() => cached); // offline fallback
    })
  );
});
