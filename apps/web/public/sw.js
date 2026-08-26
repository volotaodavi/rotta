/**
 * Service Worker mínimo (briefing "PWA").
 *
 * ACHADO REAL (a causa de verdade do "algo deu errado"/"Server
 * Components render" que persistia mesmo depois dos dois fixes
 * anteriores — double-stringify em `/client-errors` e o
 * `ChunkLoadError` de deploy): a versão anterior deste arquivo fazia
 * cache "network-first" de QUALQUER navegação (`event.request.mode
 * === "navigate"`), inclusive páginas autenticadas e dinâmicas como
 * `/rotas/[id]` — cada rota tem HTML próprio, com o payload RSC
 * (`self.__next_f.push(...)`) do React embutido inline. Cachear e
 * depois reproduzir esse payload (via `caches.match()` no `.catch()`)
 * é seguro só se a resposta cacheada estiver 100% íntegra; qualquer
 * instabilidade real de rede no meio da gravação do cache (`cache.put`
 * lendo o mesmo stream da resposta) podia deixar uma cópia truncada —
 * e o Next, ao tentar desserializar esse payload quebrado no
 * navegador, reporta exatamente "An error occurred in the Server
 * Components render..." com `digest: null` (nunca um `Error` de app
 * de verdade, então nunca há digest computado) — bate 100% com todos
 * os relatos reais capturados via `reportClientError`.
 *
 * Piorou justamente DEPOIS do fix de `/rotas/novo` (navegação FORÇADA
 * via `window.location.href` em vez de `router.replace`): navegação
 * client-side (`router.replace`) NUNCA passa por aqui (só
 * `mode: "navigate"`, ou seja, carregamento de página inteira) — a
 * troca pra navegação HARD, motivada pelo bug real do ChunkLoadError,
 * começou a rotear a MESMA tela pra dentro deste Service Worker pela
 * primeira vez.
 *
 * Correção: parar de interceptar/cachear navegação do painel
 * autenticado — não há ganho real de "funciona offline" numa rota
 * dinâmica por ID que quase nunca foi visitada antes (o cache só
 * ajudaria a re-servir a MESMA rota já vista, o que raramente é o
 * caso), e o risco de reproduzir um payload RSC corrompido é real e
 * documentado acima. O cache de app-shell fica restrito só às páginas
 * de marketing (público, sem dado por usuário/sessão) — essas sim se
 * beneficiam de continuar abrindo offline. `CACHE_NAME` mudou de versão
 * pra forçar a limpeza do cache antigo (potencialmente com payload
 * corrompido) em quem já tinha o Service Worker anterior instalado.
 */
const CACHE_NAME = "rotta-shell-v2";

/**
 * Único conjunto de rotas cacheado para abrir offline: marketing
 * público, sem HTML por usuário/sessão/tenant. Qualquer rota fora
 * desta lista (todo o painel autenticado, inclusive `/rotas/[id]` e
 * qualquer coisa sob `(dashboard)`) passa direto pra rede, sem
 * interceptação — nunca cacheada, nunca reproduzida a partir do cache.
 */
const OFFLINE_SHELL_PATHS = new Set(["/", "/entrar", "/criar-conta", "/planos", "/sobre"]);

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      caches
        .keys()
        .then((names) =>
          Promise.all(
            names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name)),
          ),
        ),
    ]),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET" || event.request.mode !== "navigate") {
    return;
  }

  const { pathname } = new URL(event.request.url);
  if (!OFFLINE_SHELL_PATHS.has(pathname)) {
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

/**
 * Push real (Frente 0) — RFC 8030/VAPID via `web-push` no backend
 * (`WebPushService`). O payload chega como JSON simples (`titulo`/`corpo`/
 * `url` opcional, mesmo formato de dados usado pro Expo no app mobile) —
 * qualquer erro de parse não derruba o evento, só cai pro texto genérico.
 */
self.addEventListener("push", (event) => {
  let dados = { titulo: "Rotta", corpo: "Você tem uma notificação nova." };
  try {
    if (event.data) {
      dados = { ...dados, ...event.data.json() };
    }
  } catch {
    // Payload não era JSON — mantém o texto genérico acima em vez de
    // deixar o evento inteiro falhar.
  }

  event.waitUntil(
    self.registration.showNotification(dados.titulo, {
      body: dados.corpo,
      icon: "/brand/rotta-mark-192.png",
      badge: "/brand/rotta-mark-192.png",
      data: { url: dados.url || "/notificacoes" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const destino = event.notification.data?.url || "/notificacoes";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(destino) && "focus" in client) {
          return client.focus();
        }
      }
      if (clientList.length > 0 && "focus" in clientList[0]) {
        clientList[0].navigate(destino);
        return clientList[0].focus();
      }
      return self.clients.openWindow(destino);
    }),
  );
});
