/* ============================================================
   THE SIGNAL — Service Worker v1
   Network-first for HTML, cache-first for static assets.
   Increment CACHE_VERSION on each deploy to bust stale caches.
   ============================================================ */

const CACHE_VERSION = 'signal-v2-2026-04-11';

const STATIC_ASSETS = [
  '/base.css',
  '/style.css',
  '/app.js',
  '/manifest.json'
];

// Install: pre-cache core static assets
self.addEventListener('install', (event) => {
  self.skipWaiting(); // Activate immediately, don't wait for old SW
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => cache.addAll(STATIC_ASSETS))
  );
});

// Activate: purge ALL old caches, take control immediately
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// Fetch: network-first for HTML, stale-while-revalidate for assets
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only handle GET requests
  if (request.method !== 'GET') return;

  // Skip cross-origin requests (fonts, analytics, etc.)
  if (!request.url.startsWith(self.location.origin)) return;

  // Skip Netlify function calls
  if (request.url.includes('/.netlify/')) return;

  const isHTML = request.headers.get('accept')?.includes('text/html') ||
                 request.url.endsWith('.html') ||
                 request.url.endsWith('/');

  if (isHTML) {
    // Network-first for HTML — always try fresh content
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match('/404.html')))
    );
  } else {
    // Stale-while-revalidate for CSS, JS, images
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_VERSION).then((cache) => cache.put(request, clone));
          }
          return response;
        });
        return cached || fetchPromise;
      })
    );
  }
});
