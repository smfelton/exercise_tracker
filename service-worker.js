// Offline support with fast updates.
//
// Strategy is "network first, cache fallback": every request goes to the site
// first, so a launch with signal always gets the latest version. If there is no
// signal, or the site takes longer than NETWORK_TIMEOUT_MS (weak gym signal),
// the saved copy is used instead. Every successful response refreshes the cache.
//
// Requests use `cache: 'no-cache'` so the browser revalidates with the server
// instead of reusing its own HTTP-cached copy (GitHub Pages allows 10 minutes).
//
// Bump CACHE_VERSION when the list of files below changes.
const CACHE_VERSION = 'v2';
const CACHE_NAME = `exercise-tracker-${CACHE_VERSION}`;
const NETWORK_TIMEOUT_MS = 3000;

const APP_FILES = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/app.js',
  './js/db.js',
  './js/ui.js',
  './js/vendor/dexie.mjs',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      // 'reload' skips the browser's HTTP cache so the fresh files are saved.
      .then(cache => cache.addAll(APP_FILES.map(url => new Request(url, { cache: 'reload' }))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k.startsWith('exercise-tracker-') && k !== CACHE_NAME)
          .map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

function timeout(ms) {
  return new Promise(resolve => setTimeout(() => resolve(undefined), ms));
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);

    const network = fetch(request, { cache: 'no-cache' })
      .then(response => {
        if (response.ok) cache.put(request, response.clone());
        return response;
      })
      .catch(() => undefined);
    // Let a slow download finish and refresh the cache even if we stop waiting.
    event.waitUntil(network);

    const fresh = await Promise.race([network, timeout(NETWORK_TIMEOUT_MS)]);
    if (fresh) return fresh;

    const cached = await cache.match(request, { ignoreSearch: true });
    if (cached) return cached;

    // Nothing saved yet: keep waiting for the network as a last resort.
    return (await network) || Response.error();
  })());
});
