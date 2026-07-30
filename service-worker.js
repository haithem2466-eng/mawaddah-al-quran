// ==========================================================================
// service-worker.js
// Strategy:
//   - App shell (HTML/CSS/JS/manifest/icons/fonts) -> precached at install,
//     served cache-first so the app boots instantly with zero network.
//   - Quran data (data/**.json) -> precached list below PLUS runtime
//     cache-on-first-fetch, so any *additional* surah JSON files dropped in
//     later (see about.js for instructions) get cached automatically the
//     first time a user opens them, without needing a service-worker edit.
//   - Everything else -> network-first with cache fallback, so the app
//     never hard-fails just because a resource wasn't anticipated.
// ==========================================================================

const CACHE_VERSION = "v6";
const STATIC_CACHE = `noor-quran-static-${CACHE_VERSION}`;
const DATA_CACHE = `noor-quran-data-${CACHE_VERSION}`;
const RUNTIME_CACHE = `noor-quran-runtime-${CACHE_VERSION}`;

const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/fonts.css",
  "./css/variables.css",
  "./css/base.css",
  "./css/layout.css",
  "./css/components.css",
  "./css/reader.css",
  "./css/responsive.css",
  "./js/app.js",
  "./js/lib/db.js",
  "./js/lib/icons.js",
  "./js/lib/data.js",
  "./js/lib/router.js",
  "./js/lib/utils.js",
  "./js/lib/settings.js",
  "./js/pages/home.js",
  "./js/pages/surahs.js",
  "./js/pages/reader.js",
  "./js/pages/page-reader.js",
  "./js/pages/juz.js",
  "./js/pages/hizb.js",
  "./js/pages/mushaf-pages.js",
  "./js/pages/search.js",
  "./js/pages/bookmarks.js",
  "./js/pages/notes.js",
  "./js/pages/settings.js",
  "./js/pages/about.js",
  "./privacy-policy.html",
  "./Logo.png",
  "./icons/icon-72.png",
  "./icons/icon-96.png",
  "./icons/icon-128.png",
  "./icons/icon-144.png",
  "./icons/icon-152.png",
  "./icons/icon-192.png",
  "./icons/icon-384.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
];

// Known data files at build time. All 114 surahs ship with full Uthmani
// text, so all of them are precached for true offline use. New files added
// later are still cached automatically the first time they're fetched (see
// runtime handling below).
const DATA_FILES = [
  "./data/surahs-meta.json",
  ...Array.from({ length: 114 }, (_, i) => `./data/surahs/${String(i + 1).padStart(3, "0")}.json`),
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const staticCache = await caches.open(STATIC_CACHE);
      await staticCache.addAll(APP_SHELL).catch((err) => console.warn("Precache (shell) partial failure:", err));
      const dataCache = await caches.open(DATA_CACHE);
      await dataCache.addAll(DATA_FILES).catch((err) => console.warn("Precache (data) partial failure:", err));
      self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => ![STATIC_CACHE, DATA_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

function isDataRequest(url) {
  return url.pathname.includes("/data/");
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never proxy cross-origin

  // Navigation requests (e.g. opening the PWA fresh) -> always serve the
  // cached app shell so hash routing can take over client-side.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const network = await fetch(request);
          return network;
        } catch {
          const cache = await caches.open(STATIC_CACHE);
          return (await cache.match("./index.html")) || Response.error();
        }
      })()
    );
    return;
  }

  if (isDataRequest(url)) {
    // Cache-first for Quran data, with a runtime write-through so any newly
    // added surah JSON gets cached the first time it's opened.
    event.respondWith(
      (async () => {
        const dataCache = await caches.open(DATA_CACHE);
        const cached = await dataCache.match(request);
        if (cached) return cached;
        try {
          const network = await fetch(request);
          if (network.ok) dataCache.put(request, network.clone());
          return network;
        } catch {
          return cached || new Response(JSON.stringify({ error: "offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        }
      })()
    );
    return;
  }

  // Static assets -> cache-first, falling back to network, then to runtime cache.
  event.respondWith(
    (async () => {
      const staticCache = await caches.open(STATIC_CACHE);
      const cached = await staticCache.match(request);
      if (cached) return cached;
      try {
        const network = await fetch(request);
        if (network.ok) {
          const runtime = await caches.open(RUNTIME_CACHE);
          runtime.put(request, network.clone());
        }
        return network;
      } catch {
        const runtime = await caches.open(RUNTIME_CACHE);
        const runtimeCached = await runtime.match(request);
        return runtimeCached || Response.error();
      }
    })()
  );
});