const CACHE_NAME = 'matika-shell-v1';
const SHELL_URLS = [
  '/',
  '/manifest.webmanifest',
  '/brand/matika-logo.png',
  '/brand/matika-mark.png',
  '/brand/matika-icon-192.png',
  '/brand/matika-icon-512.png',
  '/brand/apple-touch-icon.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('matika-shell-') && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      ))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (
    request.method !== 'GET'
    || new URL(request.url).origin !== self.location.origin
    || new URL(request.url).pathname.startsWith('/.netlify/')
  ) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone();
            void caches.open(CACHE_NAME).then((cache) => cache.put('/', copy));
          }
          return response;
        })
        .catch(() => caches.match('/').then((response) => response || Response.error())),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      const refreshed = fetch(request).then((networkResponse) => {
        if (networkResponse.ok) {
          const copy = networkResponse.clone();
          void caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
        }
        return networkResponse;
      }).catch(() => undefined);
      if (cached) {
        event.waitUntil(refreshed);
        return cached;
      }
      return refreshed.then((networkResponse) => networkResponse || Response.error());
    }),
  );
});
