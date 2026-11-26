const CACHE_NAME = 'nhatki-diary-v2';
const PRECACHE_URLS = ['/', '/widget', '/manifest.webmanifest', '/icons/caty-icon.svg'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  // Skip cross-origin requests (Supabase API, YouTube, Spotify) and local API endpoints
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith('/api/')) return;

  // Immutable hashed static bundles: Cache-First for maximum speed
  const isImmutableAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/');

  if (isImmutableAsset) {
    event.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              void caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
            }
            return res;
          })
      )
    );
    return;
  }

  // HTML navigations, RSC payloads & manifest: Network-First so new deployments appear immediately
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
        }
        return res;
      })
      .catch(() =>
        caches
          .match(req)
          .then((hit) => hit || (req.mode === 'navigate' ? caches.match('/') : Response.error()))
      )
  );
});
