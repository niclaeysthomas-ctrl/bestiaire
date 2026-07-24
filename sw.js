const CACHE = "bestiaire-v2";
const FILES = [
  "./", "./index.html", "./style.css", "./app.js",
  "./data-animaux-1.js", "./data-animaux-2.js", "./data-animaux-3.js",
  "./data-dossiers.js", "./manifest.webmanifest", "./icon.svg"
];
self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(k => Promise.all(k.filter(x => x !== CACHE).map(x => caches.delete(x)))).then(() => self.clients.claim()));
});
/* stale-while-revalidate : instantané hors ligne, et se met à jour tout seul au chargement suivant */
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET" || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(caches.open(CACHE).then(async c => {
    const cached = await c.match(e.request);
    const reseau = fetch(e.request).then(res => {
      if (res && res.status === 200) c.put(e.request, res.clone());
      return res;
    }).catch(() => null);
    return cached || (await reseau) || c.match("./index.html");
  }));
});
