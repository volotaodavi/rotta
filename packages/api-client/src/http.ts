/**
 * Wrapper fino sobre `fetch` nativo — Dossie 23, Secao 3.1: "nenhum app
 * consome Axios; interceptors/retry/cache ficam a cargo do TanStack Query
 * (em cada app), este wrapper cuida apenas de injecao de header de
 * autenticacao, base URL por ambiente e do formato padrao de erro
 * (Dossie 13, Secao 23)".
 *
 * Este e infraestrutura pura (nenhum endpoint de negocio) — os endpoints
 * reais (ex. `endpoints/trips.ts`) sao adicionados junto com cada modulo
 * implementado (Dossie 13).
 */

/** Formato padrao de erro de toda API da Rotta (Dossie 13, Secao 23). */
export interface ApiErrorBody {
  code: string;
  message: string;
  field?: string;
  correlationId?: string;
}

export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly field?: string;
  readonly correlationId?: string;

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.field = body.field;
    this.correlationId = body.correlationId;
  }
}

export interface ApiClientConfig {
  /** Base URL da Core API para o ambiente corrente (Dossie 23, Secao 8). */
  baseUrl: string;
  /** Resolve o token de acesso atual — implementado por @rotta/auth. */
  getAccessToken?: () => string | null | Promise<string | null>;
  /**
   * BUG REAL de produção (usuário 03/09/2026: "está dando erro na
   * plataforma dos admins, por completo... clico e dá erro" — TODA
   * ação, não uma tela específica). Causa raiz: o único refresh de
   * sessão existente era PROATIVO, agendado por `setTimeout` a partir
   * do `exp` do JWT — mas navegadores atrasam (ou pausam) timers de
   * abas em segundo plano (Chrome/Firefox throttling de aba inativa),
   * então deixar o painel aberto numa aba em segundo plano por tempo
   * suficiente faz o `access_token` expirar ANTES do timer disparar.
   * Sem nenhum retry reativo, todo request seguinte voltava 401 pra
   * sempre — cada clique, cada ação — até um F5/relogin manual.
   *
   * `refreshAccessToken` (opcional, implementado por `@rotta/auth` —
   * `registerRefreshHandler`/`AuthProvider`) fecha esse gap: chamado
   * automaticamente na PRIMEIRA vez que um request autenticado volta
   * 401, tenta renovar a sessão e devolve o novo `access_token` (ou
   * `null` se a renovação falhou de verdade — refresh_token também
   * expirado/revogado). Só então o request original é refeito UMA
   * única vez com o token novo — nunca um loop.
   */
  refreshAccessToken?: () => Promise<string | null>;
  /**
   * Enviado em toda requisição via `X-Rotta-Platform` (pedido do usuário
   * 01/09/2026 — Cloudflare Turnstile) — o backend só EXIGE o token do
   * widget "não sou um robô" no cadastro (`AuthService.register*`)
   * quando `platform === "web"`; Turnstile não roda em app nativo (não
   * existe widget de navegador lá), então `"mobile"` sempre pula a
   * verificação (`TurnstileService.assertHuman`), nunca bloqueia o
   * app. Auto-declarado pelo cliente, não é uma prova criptográfica —
   * mesma classe de limitação aceita em outros pontos do projeto
   * (complementa `ThrottlerGuard`, não substitui).
   */
  platform: "web" | "mobile";
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /**
   * `"blob"` para respostas binárias (ex. exportação de veículos em
   * PDF/Excel/CSV, Dossiê 13 módulo Veículos — "EXPORTAÇÃO") — evita
   * que o wrapper tente `response.json()` num arquivo. Padrão `"json"`.
   */
  responseType?: "json" | "blob";
  /**
   * Teto de tempo desta requisição. Padrão `TIMEOUT_PADRAO_MS`; upload
   * (`FormData`) usa `TIMEOUT_UPLOAD_MS`. Ver `performFetch`.
   */
  timeoutMs?: number;
}

/**
 * BUG REAL de produção (18/09/2026, relato do usuário: "a conta do
 * transportador não está entrando (nenhuma)" — e a tela era a splash
 * azul do app, parada para sempre).
 *
 * Causa raiz: `fetch` não tem timeout embutido, nem no navegador nem no
 * React Native. Uma requisição para uma API em cold start (o plano
 * gratuito do Render leva mais de 90s para acordar) não falha — ela
 * simplesmente nunca resolve. E código que trata falha com `try/catch`
 * NUNCA roda, porque não há rejeição nenhuma:
 *
 *     try { await authApi.refresh(...) } catch { setStatus("unauth") }
 *
 * O `catch` acima (`auth-context.tsx`) é exatamente o caminho que leva
 * o usuário para a tela de login quando a sessão não pode ser renovada
 * — e ele ficava inalcançável, deixando `status` em `"loading"` para
 * sempre. Daí a splash eterna.
 *
 * Com um teto de tempo, a requisição vira uma rejeição normal, o
 * `catch` roda, e o app segue para a tela de login em vez de congelar.
 */
export const TIMEOUT_PADRAO_MS = 60_000;

/**
 * Upload de foto/documento em rede móvel é legitimamente lento — um teto
 * curto aqui transformaria "conexão ruim" em "não consigo enviar meus
 * documentos". Vale o dobro do padrão.
 */
export const TIMEOUT_UPLOAD_MS = 120_000;

/** `ApiError.status` usado quando a requisição estourou o tempo. */
export const STATUS_TEMPO_ESGOTADO = 408;

export interface ApiClient {
  request: <T>(path: string, options?: RequestOptions) => Promise<T>;
}

/**
 * Cria um cliente de API configurado para um ambiente especifico. Cada app
 * (`apps/web`, `apps/mobile`, `apps/admin`) instancia um unico cliente a
 * partir da sua propria configuracao de ambiente (Dossie 23, Secao 8).
 */
// Emitem/consomem o próprio refresh_token — nunca faz sentido tentar
// "renovar a sessão" de um 401 vindo de um destes (evitaria só um loop
// sem chance real de sucesso). Comparação por sufixo: `path` pode vir
// com ou sem o prefixo de versão (`/v1`), dependendo do `baseUrl`.
const AUTH_TOKEN_PATHS = ["/auth/login", "/auth/refresh", "/auth/logout"];

function isAuthTokenPath(path: string): boolean {
  return AUTH_TOKEN_PATHS.some((authPath) => path.endsWith(authPath));
}

export function createApiClient(config: ApiClientConfig): ApiClient {
  async function performFetch(
    path: string,
    options: RequestOptions,
    token: string | null,
  ): Promise<Response> {
    // `FormData` (upload de foto/documento) nunca é serializado em JSON
    // nem leva `Content-Type` manual — o `fetch` monta o boundary
    // multipart sozinho a partir do corpo.
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

    // Teto de tempo — ver a nota em `TIMEOUT_PADRAO_MS` para o bug que
    // isto conserta. `AbortController` + `setTimeout` em vez de
    // `AbortSignal.timeout()`: o segundo não existe em todas as versões
    // do Hermes (React Native), o primeiro existe em toda parte.
    //
    // Um `signal` passado por quem chama vence o nosso: quem já controla
    // o cancelamento sabe melhor quando abortar, e sobrescrever seria
    // quebrar esse controle silenciosamente.
    const timeoutMs = options.timeoutMs ?? (isFormData ? TIMEOUT_UPLOAD_MS : TIMEOUT_PADRAO_MS);
    const controller = options.signal ? null : new AbortController();
    const timer = controller ? setTimeout(() => controller.abort(), timeoutMs) : null;

    try {
      return await fetch(`${config.baseUrl}${path}`, {
        ...options,
        ...(controller ? { signal: controller.signal } : {}),
        headers: {
          ...(isFormData ? {} : { "Content-Type": "application/json" }),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "X-Rotta-Platform": config.platform,
          ...options.headers,
        },
        body:
          options.body === undefined
            ? undefined
            : isFormData
              ? (options.body as FormData)
              : JSON.stringify(options.body),
      });
    } catch (erro) {
      // Só traduz o NOSSO abort. Um abort de quem chamou (troca de tela,
      // busca digitada) é cancelamento intencional e deve continuar
      // sendo o que era, não virar "erro de tempo esgotado" na cara do
      // usuário.
      if (controller?.signal.aborted) {
        throw new ApiError(STATUS_TEMPO_ESGOTADO, {
          code: "TEMPO_ESGOTADO",
          message:
            "O servidor demorou demais para responder. Verifique sua conexão e tente de novo.",
        });
      }
      throw erro;
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  async function parseResponse<T>(response: Response, options: RequestOptions): Promise<T> {
    if (response.status === 204) {
      return undefined as T;
    }
    if (options.responseType === "blob") {
      return (await response.blob()) as T;
    }
    return (await response.json()) as T;
  }

  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const token = (await config.getAccessToken?.()) ?? null;
    const response = await performFetch(path, options, token);

    if (response.ok) {
      return parseResponse<T>(response, options);
    }

    // Ver comentário de `refreshAccessToken` em `ApiClientConfig` — só
    // tenta renovar a sessão e refazer o request UMA vez: tinha um
    // token pra começo de conversa (uma chamada anônima que voltou 401
    // nunca é resolvida por refresh nenhum), o handler existe, e a rota
    // não é uma das próprias emissoras/consumidoras do refresh_token.
    // Usa o `newToken` devolvido DIRETO na segunda tentativa — nunca lê
    // `getAccessToken()` de novo (mesmo que ele reflita o novo token na
    // prática, por `applySession` já ter rodado antes do handler
    // resolver): explícito é mais robusto que depender desse
    // encadeamento implícito entre módulos separados.
    if (response.status === 401 && token && config.refreshAccessToken && !isAuthTokenPath(path)) {
      const newToken = await config.refreshAccessToken().catch(() => null);
      if (newToken) {
        const retryResponse = await performFetch(path, options, newToken);
        if (retryResponse.ok) {
          return parseResponse<T>(retryResponse, options);
        }
        const retryErrorBody = (await retryResponse
          .json()
          .catch(() => null)) as ApiErrorBody | null;
        throw new ApiError(
          retryResponse.status,
          retryErrorBody ?? {
            code: "UNKNOWN_ERROR",
            message: "Erro desconhecido ao chamar a API.",
          },
        );
      }
    }

    const errorBody = (await response.json().catch(() => null)) as ApiErrorBody | null;
    throw new ApiError(
      response.status,
      errorBody ?? { code: "UNKNOWN_ERROR", message: "Erro desconhecido ao chamar a API." },
    );
  }

  return { request };
}
