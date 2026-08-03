/// <reference lib="webworker" />

import { cleanupOutdatedCaches, matchPrecache, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst, StaleWhileRevalidate } from 'workbox-strategies'

declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: Array<string | { url: string; revision?: string }>
}

// El token self.__WB_MANIFEST se reemplaza en el build
// con el manifiesto de precache generado por workbox-build.injectManifest.
precacheAndRoute(self.__WB_MANIFEST)
cleanupOutdatedCaches()

self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', () => self.clients.claim())

const notFound = () =>
  new Response('<h1>Sin conexión</h1>', {
    status: 503,
    headers: { 'Content-Type': 'text/html' }
  })

const offlineFallback = async (request: Request): Promise<Response> => {
  const cached = await caches.match(request, { ignoreSearch: true })
  if (cached) return cached
  for (const url of ['/index.html', '/', 'index.html']) {
    const hit = (await matchPrecache(url)) || (await caches.match(url, { ignoreSearch: true }))
    if (hit) return hit
  }
  return notFound()
}

// Navegaciones: network-first con respaldo al index precacheado
registerRoute(
  ({ request }) => request.mode === 'navigate' && request.url.startsWith('http'),
  async ({ event, request }) => {
    try {
      return await new NetworkFirst({ cacheName: 'forja-pages' }).handle({ event, request })
    } catch {
      return offlineFallback(request)
    }
  }
)

// Assets estáticos del build: stale-while-revalidate
registerRoute(
  ({ request, sameOrigin }) =>
    sameOrigin &&
    request.url.startsWith('http') &&
    request.destination !== 'document' &&
    ['script', 'style', 'font', 'image'].includes(request.destination),
  ({ event, request }) =>
    new StaleWhileRevalidate({ cacheName: 'forja-assets' }).handle({ event, request })
)