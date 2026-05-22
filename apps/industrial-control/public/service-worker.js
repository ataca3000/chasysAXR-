const CACHE_VERSION = "gopilot-v1";
const RUNTIME_CACHE = "gopilot-runtime-v1";
const ASSETS_TO_CACHE = ["/", "/index.html", "/manifest.json", "/favicon.ico"];

// Install: cache essential assets
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_VERSION).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn("Cache addAll failed:", err);
        // Fallback: cache what we can
        return Promise.all(
          ASSETS_TO_CACHE.map((url) =>
            cache.add(url).catch(() => {
              console.warn(`Failed to cache ${url}`);
            }),
          ),
        );
      });
    }),
  );
  self.skipWaiting();
});

// Activate: clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_VERSION && cacheName !== RUNTIME_CACHE) {
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  self.clients.claim();
});

// Fetch: Network-first for API, cache-first for assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") {
    return;
  }

  // API calls: network first, fallback to cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Cache successful responses
          if (response.ok) {
            const cache = caches.open(RUNTIME_CACHE);
            cache.then((c) => c.put(request, response.clone()));
          }
          return response;
        })
        .catch(() => {
          // Fallback to cache
          return caches.match(request).then((cached) => {
            return (
              cached ||
              new Response("Offline - API unavailable", { status: 503 })
            );
          });
        }),
    );
    return;
  }

  // Static assets: cache first
  if (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff|woff2)$/) ||
    url.pathname === "/"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        return (
          cached ||
          fetch(request)
            .then((response) => {
              if (response.ok) {
                caches.open(RUNTIME_CACHE).then((cache) => {
                  cache.put(request, response.clone());
                });
              }
              return response;
            })
            .catch(() => {
              // Offline fallback
              if (request.destination === "document") {
                return caches.match("/index.html");
              }
              return new Response("Offline - Resource unavailable", {
                status: 503,
              });
            })
        );
      }),
    );
    return;
  }

  // Default: network first
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && request.method === "GET") {
          caches.open(RUNTIME_CACHE).then((cache) => {
            cache.put(request, response.clone());
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(request).then((cached) => {
          return (
            cached ||
            new Response("Offline - Resource unavailable", { status: 503 })
          );
        });
      }),
  );
});

// Background sync for offline messages
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-lab-chat") {
    event.waitUntil(
      // Retry syncing pending messages
      caches
        .open(RUNTIME_CACHE)
        .then((cache) => cache.match("/api/device-sync"))
        .then((response) => {
          if (response) {
            return fetch("/api/device-sync", { method: "POST" });
          }
        })
        .catch((err) => console.error("Background sync failed:", err)),
    );
  }
});

// Message handler for cache clearing
self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "CLEAR_CACHE") {
    caches.delete(RUNTIME_CACHE);
  }
});
