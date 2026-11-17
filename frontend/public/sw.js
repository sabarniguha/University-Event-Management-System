/* UniEvents service worker.
   - Keeps the app itself available offline (page shell + built files).
   - Never touches /api or other sites, so no account data is ever stored here.
   Saved tickets live in the page (localStorage), not in this file. */
const VERSION = 'v1';
const SHELL = `unievents-shell-${VERSION}`;
const ASSETS = `unievents-assets-${VERSION}`;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((c) => fetch('/', { cache: 'reload' }).then((r) => (r.ok ? c.put('/shell', r) : undefined))).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL && k !== ASSETS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin || url.pathname.startsWith('/api/')) return;

  // Pages: network first, so people always get the newest app; fall back to the saved shell when offline.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(SHELL).then((c) => c.put('/shell', copy)); }
          return res;
        })
        .catch(() => caches.open(SHELL).then((c) => c.match('/shell')).then((r) => r || new Response('You are offline. Open UniEvents again when you have a connection.', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })))
    );
    return;
  }

  // Built files have a hash in their name, so a saved copy never goes stale.
  if (url.pathname.startsWith('/assets/')) {
    event.respondWith(
      caches.open(ASSETS).then((c) => c.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) c.put(req, res.clone()); return res; })))
    );
    return;
  }

  // Icons and the manifest: use the network, fall back to a saved copy.
  if (/\.(png|webmanifest|svg|ico)$/.test(url.pathname)) {
    event.respondWith(
      fetch(req).then((res) => { if (res.ok) { const copy = res.clone(); caches.open(ASSETS).then((c) => c.put(req, copy)); } return res; }).catch(() => caches.match(req))
    );
  }
});
