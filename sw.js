// Service worker: deja la app disponible sin internet.
// Los datos (Firestore) tienen su propia memoria offline; esto guarda solo la "cáscara" de la app.
const CACHE = 'stock-tonny-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];
const RUNTIME_HOSTS = ['www.gstatic.com', 'fonts.googleapis.com', 'fonts.gstatic.com', 'cdn.jsdelivr.net'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);

  // Al abrir la app: primero internet (para tener siempre la última versión), si no hay, la copia guardada.
  if (u.origin === location.origin && r.mode === 'navigate') {
    e.respondWith(
      fetch(r)
        .then(res => { const copy = res.clone(); caches.open(CACHE).then(c => c.put('./index.html', copy)); return res; })
        .catch(() => caches.match('./index.html'))
    );
    return;
  }

  // Archivos de la app, librerías de Firebase y tipografías: copia guardada al instante y se actualiza de fondo.
  if (u.origin === location.origin || RUNTIME_HOSTS.includes(u.hostname)) {
    e.respondWith(
      caches.match(r).then(hit => {
        const net = fetch(r)
          .then(res => {
            if (res && (res.ok || res.type === 'opaque')) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(r, copy)); }
            return res;
          })
          .catch(() => hit);
        return hit || net;
      })
    );
  }
  // Todo lo demás (Firestore, login) pasa directo sin tocar.
});
