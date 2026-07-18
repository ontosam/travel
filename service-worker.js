// Offline app shell for the US States Tracker.
// Bump CACHE when you change any cached file to push the update to clients.
const CACHE = "fill-your-map-v6";
const ASSETS = [
  "./",
  "./index.html",
  "./css/styles.css",
  "./js/app.js",
  "./js/scenes.js",
  "./js/storage.js",
  "./js/us-geo.js",
  "./js/us-latlng.js",
  "./js/geo-locate.js",
  "./js/exif.js",
  "./js/supabase-config.js",
  "./js/cloud.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Network-first for our own files, so a new deploy shows up immediately; fall
// back to the cache only when offline. Cross-origin requests (e.g. the Supabase
// SDK from a CDN) pass straight through to the network, untouched.
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;
  if (new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(request)
      .then((res) => {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(request, copy));
        return res;
      })
      .catch(() => caches.match(request))
  );
});
