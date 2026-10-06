/* Service worker : met tout en cache à la première visite, puis sert hors-ligne.
   IMPORTANT : si tu modifies un fichier ou une image, change CACHE ('invoc-v5', 'invoc-v3'...)
   sinon l'iPad continuera d'afficher l'ancienne version. */
const CACHE = 'invoc-v5';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(
  caches.keys()
    .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => clients.claim())
));

// Safari exige le support des requêtes "Range" pour lire une vidéo : on le simule depuis le cache
async function rangeResponse(req, res) {
  const buf = await res.arrayBuffer();
  const m = /bytes=(\d+)-(\d*)/.exec(req.headers.get('range'));
  const start = +m[1], end = m[2] ? +m[2] : buf.byteLength - 1;
  return new Response(buf.slice(start, end + 1), { status: 206, headers: {
    'Content-Type': res.headers.get('Content-Type') || 'video/mp4',
    'Content-Range': 'bytes ' + start + '-' + end + '/' + buf.byteLength,
    'Content-Length': end - start + 1 } });
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    let res = await cache.match(req.url);
    if (!res) {
      try { res = await fetch(req.url); if (res.ok) cache.put(req.url, res.clone()); }
      catch (err) { return new Response('hors-ligne', { status: 503 }); }
    }
    if (req.headers.has('range') && res.status === 200) return rangeResponse(req, res);
    return res;
  })());
});
