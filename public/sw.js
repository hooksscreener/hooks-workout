// Lets the app open with no connection. Pages load network-first (so updates still arrive), and
// fingerprinted files, fonts and icons are cached after the first visit. /api calls are never cached here:
// offline saving is handled inside the app, which keeps a copy of your data on the phone.
const V = "hooks-v1";
self.addEventListener("install", (e) => { self.skipWaiting(); });
self.addEventListener("activate", (e) => { e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== V).map((k) => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener("fetch", (e) => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;
  const isAsset = url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/fonts/") || /\.(png|ico|json|woff2?)$/.test(url.pathname);
  if (isAsset) {
    e.respondWith(caches.match(req).then((hit) => hit || fetch(req).then((res) => { if (res.ok) { const c = res.clone(); caches.open(V).then((ch) => ch.put(req, c)); } return res; })));
    return;
  }
  if (req.mode === "navigate") {
    e.respondWith(fetch(req).then((res) => { if (res.ok) { const c = res.clone(); caches.open(V).then((ch) => ch.put("/", c)); } return res; }).catch(() => caches.match("/")));
  }
});
