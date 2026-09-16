// Cachea el "esqueleto" de la app para que abra rápido y se pueda instalar.
// NO cachea datos: los datos viven en tu carpeta de OneDrive, no aquí.
const CACHE = 'gestor-carteras-v1';
const ARCHIVOS = ['.', 'index.html', 'estilos.css', 'app.js', 'libro-web.js', 'manifest.json',
  'iconos/icon-192.png', 'iconos/icon-512.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS))); self.skipWaiting(); });
self.addEventListener('activate', (e) => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))); self.clients.claim(); });
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => { const cp = r.clone(); caches.open(CACHE).then(c => c.put(e.request, cp)); return r; }).catch(() => caches.match(e.request)));
});
