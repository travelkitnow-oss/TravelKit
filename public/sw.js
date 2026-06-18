// Minimal service worker para que la PWA sea "instalable"
const CACHE = 'travelkit-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Network-first para no servir versiones viejas
  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
