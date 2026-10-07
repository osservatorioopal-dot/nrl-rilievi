/* Service worker — NRL Rilievi
   Strategia: cache-first sui file dell'applicazione (l'app deve funzionare
   integralmente senza rete), network-first sulle richieste di sincronizzazione. */
const CACHE = 'nrl-rilievi-v6';
const FILE = [
  './', './index.html', './dati.js', './schede.js', './app.js',
  './manifest.webmanifest', './icon-192.png', './icon-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  // le chiamate al backend e l'elenco dei punti pianificati non vanno mai in cache (network-first)
  if (url.hostname.includes('script.google.com') || e.request.method !== 'GET') return;
  if (url.pathname.endsWith('punti_pianificati.geojson')) return;
  e.respondWith(
    caches.match(e.request).then(hit => hit || fetch(e.request).then(r => {
      if (r.ok && url.origin === location.origin) {
        const copia = r.clone();
        caches.open(CACHE).then(c => c.put(e.request, copia));
      }
      return r;
    }).catch(() => caches.match('./index.html')))
  );
});
