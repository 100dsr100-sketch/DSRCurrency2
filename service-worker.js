/* Service worker for DSR Currency.
   - satisfies the installability requirement (Android "Install app")
   - network-first for the page itself, so deployed updates show on next launch
   - cache-first for the static shell, with an offline fallback */
const CACHE = 'dsr-currency-v3';
const OWN = 'dsr-currency-';   // only ever delete THIS app's old caches – every DSR app shares the github.io origin's cache storage
const SHELL = ['./', './index.html', './icon.svg', './manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE && k.indexOf(OWN) === 0).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // rate APIs hit the network directly

  const isPage = req.mode === 'navigate' || req.destination === 'document';

  if (isPage) {
    // network-first: always try to get the freshest page
    e.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put('./index.html', copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
    );
    return;
  }

  // cache-first for everything else on our origin
  e.respondWith(
    caches.match(req).then(hit => hit || fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => undefined))
  );
});
