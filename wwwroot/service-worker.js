self.addEventListener('install', event => {
  event.waitUntil(
    caches.open('reproductor-v1').then(cache =>
      cache.addAll(['./', './index.html', './css/app.css', './manifest.webmanifest'])
    )
  );
  self.skipWaiting();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});