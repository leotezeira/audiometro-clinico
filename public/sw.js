/* Simple app-shell service worker for Audiometro Clinico (static site).
   - Pre-caches core assets
   - Cache-first for same-origin GET requests
   - Offline fallback to /index.html for navigation requests
*/

const CACHE_VERSION = "v2";
const CACHE_NAME = `audiometro-clinico-${CACHE_VERSION}`;

const CORE_ASSETS = [
  "./",
  "index.html",
  "manifest.json",
  "logoappclinica.png",
  "css/styles.css",
  "js/constants.js",
  "js/state.js",
  "js/audio.js",
  "js/audiogram.js",
  "js/classifications.js",
  "js/storage.js",
  "js/logo.js",
  "js/tonal.js",
  "js/patient.js",
  "js/ui.js",
  "js/pdf.js",
  "js/jspdf.umd.min.js",
  "js/app.js"
].map(asset => new URL(asset, self.registration.scope).href);

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      await cache.addAll(CORE_ASSETS);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => k.startsWith("audiometro-clinico-") && k !== CACHE_NAME)
          .map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  // Navigation requests: network-first with cache fallback to app shell
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const fresh = await fetch(request);
          const cache = await caches.open(CACHE_NAME);
          if (fresh.ok) cache.put(request, fresh.clone()).catch(error => {
            console.warn("No se pudo actualizar la caché:", error);
          });
          return fresh;
        } catch {
          const cached = await caches.match(request);
          const indexUrl = new URL("index.html", self.registration.scope).href;
          return cached || (await caches.match(indexUrl)) || Response.error();
        }
      })()
    );
    return;
  }

  // Static assets: network-first so deployments become visible immediately.
  event.respondWith(
    (async () => {
      try {
        const fresh = await fetch(request);
        if (fresh.ok) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(request, fresh.clone()).catch(error => {
            console.warn("No se pudo actualizar la caché:", error);
          });
        }
        return fresh;
      } catch {
        return (await caches.match(request)) || Response.error();
      }
    })()
  );
});
