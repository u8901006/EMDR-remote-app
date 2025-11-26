const CACHE_NAME = 'mindsync-emdr-v1';
const URLS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        // We try to cache core assets. Since we use CDNs heavily in this dev environment,
        // we prioritize the app shell (index.html, manifest).
        return cache.addAll(URLS_TO_CACHE);
      })
  );
});

self.addEventListener('fetch', (event) => {
  // Navigation requests (HTML) - try cache first, then network
  if (event.request.mode === 'navigate') {
    event.respondWith(
      caches.match('./index.html').then((response) => {
        return response || fetch(event.request);
      })
    );
    return;
  }

  // Other requests - Network first, falling back to cache if available
  // This ensures we always get the latest CDN scripts
  event.respondWith(
    fetch(event.request)
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});