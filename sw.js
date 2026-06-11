// Crossroads service worker — enables PWA install + offline shell
const CACHE = 'crossroads-v1';
const SHELL = [
  '/', '/index.html', '/style.css', '/app.js', '/api-proxy.js',
  '/boundaries.js', '/chart.js', '/wheel.js', '/interpretations.js',
  '/astronomy.js', '/manifest.json',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  // Cache-first for shell assets, network-first for API calls
  if (e.request.url.includes('/api/') || e.request.url.includes('ssd.jpl.nasa.gov') ||
      e.request.url.includes('nominatim') || e.request.url.includes('timeapi.io')) {
    e.respondWith(fetch(e.request).catch(() => caches.match(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request).then(hit => hit || fetch(e.request)));
});
