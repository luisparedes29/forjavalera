const CACHE = 'forja-v1'
const SHELL = ['./', './index.html', './manifest.json', './icon.svg']

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  )
})

// Sirve del caché al instante y actualiza en segundo plano.
// Sin red, usa el caché igualmente (las fuentes de Google incluidas).
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return
  e.respondWith(
    caches.match(e.request).then((hit) => {
      const red = fetch(e.request)
        .then((res) => {
          if (res && (res.ok || res.type === 'opaque')) {
            const copia = res.clone()
            caches.open(CACHE).then((c) => c.put(e.request, copia))
          }
          return res
        })
        .catch(() => hit)
      return hit || red
    })
  )
})
