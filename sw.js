const V = "barberia-v1",
  SHELL = [
    "./",
    "index.html",
    "styles.css",
    "barber.js",
    "config.js",
    "manifest.json",
    "icon-192.png",
  ],
  OK = ["www.gstatic.com", "fonts.googleapis.com", "fonts.gstatic.com"];
self.addEventListener("install", (e) =>
  e.waitUntil(
    caches
      .open(V)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((k) =>
        Promise.all(k.filter((x) => x !== V).map((x) => caches.delete(x))),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (e) => {
  const r = e.request,
    u = new URL(r.url);
  if (
    r.method !== "GET" ||
    (u.origin !== location.origin && !OK.includes(u.hostname))
  )
    return;
  e.respondWith(
    fetch(r)
      .then((res) => {
        if (res.ok || res.type === "opaque") {
          const c = res.clone();
          caches.open(V).then((x) => x.put(r, c));
        }
        return res;
      })
      .catch(() =>
        caches.match(r).then((m) => m || caches.match("index.html")),
      ),
  );
});
