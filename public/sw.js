// Dot 1 News newsroom service worker.
// Navigation is ALWAYS network-first with no HTML caching, so the newsroom can never be trapped
// on a stale app shell. Only truly static, hashed assets are cached.
const CACHE = "dot1-editorial-v1";

self.addEventListener("install", () => { self.skipWaiting(); });

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (err) { return; }
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return; // never touch API

  // HTML / navigations: network only. Never serve cached HTML.
  if (req.mode === "navigate" || (req.headers.get("accept") || "").includes("text/html")) {
    e.respondWith(fetch(req).catch(() => new Response(
      "<!doctype html><meta charset=utf-8><meta name=viewport content='width=device-width,initial-scale=1'><body style='font-family:system-ui;padding:40px;text-align:center;color:#f4f0e7;background:#141210'><p>You appear to be offline. <a href='' onclick='location.reload();return false' style='color:#b81616'>Try again</a>.</p></body>",
      { headers: { "Content-Type": "text/html" } }
    )));
    return;
  }

  // Hashed build assets only: cache-first is safe because the filename changes on every deploy.
  if (url.pathname.startsWith("/_next/static/") || /\.(?:js|css|woff2?|png|jpg|jpeg|svg|webp|ico)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).then((res) => {
        if (res && res.status === 200 && res.type === "basic") { const copy = res.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); }
        return res;
      }).catch(() => cached))
    );
  }
  // everything else: let the browser handle it normally
});

self.addEventListener("push", (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (err) {}
  const title = d.title || "Dot 1 News · Newsroom";
  e.waitUntil(self.registration.showNotification(title, { body: d.body || "", icon: "/dot1-news-icon-192.png", badge: "/dot1-news-icon-192.png", data: { url: d.url || "/" }, tag: d.tag || undefined, renotify: !!d.tag }));
});
self.addEventListener("notificationclick", (e) => {
  e.notification.close();
  const url = (e.notification.data && e.notification.data.url) || "/";
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((wins) => {
    for (const w of wins) { if (w.url.indexOf(self.location.origin) === 0 && "focus" in w) { w.navigate(url); return w.focus(); } }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  }));
});
