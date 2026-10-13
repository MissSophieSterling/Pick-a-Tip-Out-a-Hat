/* Offline cache for the app shell. Bump CACHE when files change. */
const CACHE = 'tiphat-v7';
const SHELL = [
  './', './index.html', './manifest.webmanifest',
  './css/tokens.css', './css/ember-espresso.css', './css/app.css', './css/party.css',
  './js/util.js', './js/tipmath.js', './js/settings.js', './js/hand.js', './js/hat.js', './js/audio.js', './js/celebrate.js', './js/crackers.js', './js/game.js',
  './icons/icon.svg', './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  // fonts: cache on first use so the app still looks right offline
  if (url.hostname.endsWith('gstatic.com') || url.hostname.endsWith('googleapis.com')) {
    e.respondWith(caches.open(CACHE + '-fonts').then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; } catch (err) { return hit || Response.error(); }
    }));
    return;
  }
  if (url.origin !== location.origin) return;
  // app shell: network first so updates land, cache as the fallback
  e.respondWith(fetch(req).then((res) => {
    if (res.ok) caches.open(CACHE).then((c) => c.put(req, res.clone()));
    return res;
  }).catch(() => caches.match(req).then((hit) => hit || caches.match('./index.html'))));
});
