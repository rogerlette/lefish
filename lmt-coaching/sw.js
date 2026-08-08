/* ================================================================
   sw.js — Service worker : l'application se lance même hors connexion.
   Les données (dossier api/) ne sont jamais mises en cache.
   ================================================================ */

const CACHE = 'lmt-shell-v1';

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/config.js',
  './js/utils.js',
  './js/api.js',
  './js/store.js',
  './js/ui.js',
  './js/views/agenda.js',
  './js/views/session.js',
  './js/views/clients.js',
  './js/views/client.js',
  './js/views/alerts.js',
  './js/views/stats.js',
  './js/views/settings.js',
  './js/app.js',
  './assets/icon.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);

  // Tout ce qui touche aux données part sur le réseau, sans cache.
  if (e.request.method !== 'GET' || url.pathname.indexOf('/api/') !== -1) return;
  if (url.origin !== location.origin) return;

  // Le reste : cache d'abord, réseau ensuite (et on rafraîchit le cache).
  e.respondWith(
    caches.match(e.request).then(hit => {
      const network = fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy));
        }
        return res;
      }).catch(() => hit);
      return hit || network;
    })
  );
});
