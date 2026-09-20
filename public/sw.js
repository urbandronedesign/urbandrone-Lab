/* Atelier service worker — cache-first for immutable assets.
 *
 * GitHub Pages only sends `Cache-Control: max-age=600`, so the browser would
 * re-check every asset after ten minutes. Everything below is content-addressed
 * (filenames derived from a hash or an IPFS CID) and therefore never changes:
 * once fetched it is served from the local cache for good. The HTML itself is
 * NOT cached here, so a new deploy is picked up on the next visit.
 */
const CACHE = 'atelier-immutable-v1';
const MAX_ENTRIES = 1500;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});

function isImmutable(req) {
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    return (
      url.pathname.startsWith('/media/') ||
      url.pathname.startsWith('/uploads/') ||
      url.pathname.startsWith('/_next/static/')
    );
  }
  // IPFS gateway responses are content-addressed too — cache images only;
  // videos stream with range requests and would bloat the cache.
  return /\/ipfs\//.test(url.pathname) && req.destination === 'image';
}

async function trim(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_ENTRIES) return;
  await Promise.all(keys.slice(0, keys.length - MAX_ENTRIES).map((k) => cache.delete(k)));
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || req.headers.has('range') || !isImmutable(req)) return;
  e.respondWith(
    (async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.status === 200 || res.type === 'opaque') {
        cache.put(req, res.clone()).then(() => trim(cache));
      }
      return res;
    })()
  );
});
