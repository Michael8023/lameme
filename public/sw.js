const CACHE_VERSION = "v1";
const APP_SHELL_CACHE = `lameme-shell-${CACHE_VERSION}`;
const RUNTIME_CACHE = `lameme-runtime-${CACHE_VERSION}`;
const OFFLINE_PAGE = "/offline.html";
const APP_SHELL = [
  "/",
  "/index.html",
  "/manifest.webmanifest",
  "/icons/icon-192.svg",
  "/icons/icon-512.svg",
  OFFLINE_PAGE,
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(APP_SHELL_CACHE).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((key) => ![APP_SHELL_CACHE, RUNTIME_CACHE].includes(key))
          .map((key) => caches.delete(key))
      );
      await self.clients.claim();
    })()
  );
});

async function closeTimerNotifications() {
  const notifications = await self.registration.getNotifications({ tag: "poop-timer" });
  notifications.forEach((n) => n.close());
}

self.addEventListener("message", async (event) => {
  const data = event.data || {};

  if (data.type === "TIMER_UPDATE") {
    await self.registration.showNotification("蹲坑计时进行中", {
      body: `已计时 ${data.formatted || "00:00"}`,
      tag: "poop-timer",
      renotify: false,
      requireInteraction: true,
      silent: true,
      data: { url: "/timer" },
    });
  }

  if (data.type === "TIMER_STOP" || data.type === "TIMER_HIDE") {
    await closeTimerNotifications();
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          const networkRes = await fetch(req);
          const cache = await caches.open(RUNTIME_CACHE);
          cache.put(req, networkRes.clone());
          return networkRes;
        } catch {
          const cached = await caches.match(req);
          if (cached) return cached;
          return caches.match(OFFLINE_PAGE);
        }
      })()
    );
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(RUNTIME_CACHE);
      const cached = await cache.match(req);
      const networkFetch = fetch(req)
        .then((res) => {
          cache.put(req, res.clone());
          return res;
        })
        .catch(() => null);

      return cached || networkFetch || caches.match(req);
    })()
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.postMessage({ type: "NAVIGATE", url: targetUrl });
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
      return undefined;
    })
  );
});
