// StormFile offline support: keep the app on the phone so it opens without signal.
const CACHE = 'stormfile-v8';
const SHELL = ['./', 'index.html', 'app.js', 'manifest.webmanifest', 'icon-192.png', 'icon-512.png', 'icon-maskable-512.png', 'apple-touch-icon.png', 'vendor/pdf-lib.min.js', 'vendor/fonts/barlow-condensed-latin-500-normal.woff2', 'vendor/fonts/barlow-condensed-latin-600-normal.woff2', 'vendor/fonts/barlow-condensed-latin-700-normal.woff2', 'vendor/fonts/ibm-plex-sans-latin-400-normal.woff2', 'vendor/fonts/ibm-plex-sans-latin-500-normal.woff2', 'vendor/fonts/ibm-plex-sans-latin-600-normal.woff2', 'vendor/fonts/ibm-plex-mono-latin-500-normal.woff2'];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin) {
    // Network first for the app files so updates arrive; fall back to the saved copy offline.
    if (req.mode === 'navigate' || /\/(index\.html|app\.js)?$/.test(url.pathname)) {
      // Only the app itself is saved as index.html; other pages (privacy, terms, help) are saved under their own address.
      const isApp = /\/(index\.html)?$/.test(url.pathname);
      const key = req.mode === 'navigate' ? (isApp ? 'index.html' : url.pathname) : req;
      e.respondWith(fetch(req).then(r => { if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(key, copy)); } return r; })
        .catch(() => caches.match(key).then(hit => hit || caches.match('index.html'))));
      return;
    }
    e.respondWith(caches.match(req).then(hit => hit || fetch(req)));
    return;
  }
  // Nothing from other sites is cached; StormFile doesn't load anything from other sites.
});
