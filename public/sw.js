// Ancien service worker (vite-plugin-pwa) : les appareils qui l'ont installé le remplacent par celui-ci,
// qui vide les caches Workbox puis se désinstalle pour laisser place à ngsw-worker.js.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      for (const key of await caches.keys()) if (key.startsWith('workbox')) await caches.delete(key)
      await self.registration.unregister()
      for (const client of await self.clients.matchAll({ type: 'window' })) client.navigate(client.url)
    })(),
  )
})
