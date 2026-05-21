/* Simple app-shell service worker for Audiometro Clinico (static site).
   - Pre-caches core assets
   - Cache-first for same-origin GET requests
   - Offline fallback to /index.html for navigation requests
*/

const CACHE_VERSION = "v1";
const CACHE_NAME = `audiometro-clinico-${CACHE_VERSION}`;

const CORE_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/logoappclinica.png",
  "/css/styles.css",
  "/js/constants.js",
  "/js/state.js",
  "/js/audio.js",
  "/js/audiogram.js",
  "/js/classifications.js",
  "/js/storage.js",
  "/js/logo.js",
  "/js/tonal.js",
  "/js/patient.js",
  "/js/ui.js",
  "/js/pdf.js",
  "/js/jspdf.umd.min.js",
  "/js/app.js"
];

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
          cache.put(request, fresh.clone()).catch(() => {});
          return fresh;
        } catch {
          const cached = await caches.match(request);
          return cached || (await caches.match("/index.html")) || Response.error();
        }
      })()
    );
    return;
  }

  // Static assets: cache-first
  event.respondWith(
    (async () => {
      const cached = await caches.match(request);
      if (cached) return cached;

      const response = await fetch(request);
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone()).catch(() => {});
      return response;
    })()
  );
});

