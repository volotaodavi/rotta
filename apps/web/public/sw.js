/**
 * Service Worker mínimo (briefing "PWA"). Estratégia deliberadamente
 * simples: network-first com fallback de cache só para navegação
 * (evita servir uma versão desatualizada do painel enquanto online,
 * mas ainda funciona offline para a última página visitada) — nenhuma
 * estratégia de cache de dados de API (esses nunca deveriam ficar
 * obsoletos silenciosamente).
 */
const CACHE_NAME = "rotta-shell-v1";

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate") {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const responseClone = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, responseClone));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
