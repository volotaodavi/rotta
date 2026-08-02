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
}

export interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
  /**
   * `"blob"` para respostas binárias (ex. exportação de veículos em
   * PDF/Excel/CSV, Dossiê 13 módulo Veículos — "EXPORTAÇÃO") — evita
   * que o wrapper tente `response.json()` num arquivo. Padrão `"json"`.
   */
  responseType?: "json" | "blob";
}

export interface ApiClient {
  request: <T>(path: string, options?: RequestOptions) => Promise<T>;
}

/**
 * Cria um cliente de API configurado para um ambiente especifico. Cada app
 * (`apps/web`, `apps/mobile`, `apps/admin`) instancia um unico cliente a
 * partir da sua propria configuracao de ambiente (Dossie 23, Secao 8).
 */
export function createApiClient(config: ApiClientConfig): ApiClient {
  async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const token = (await config.getAccessToken?.()) ?? null;
    // `FormData` (upload de foto/documento) nunca é serializado em JSON
    // nem leva `Content-Type` manual — o `fetch` monta o boundary
    // multipart sozinho a partir do corpo.
    const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

    const response = await fetch(`${config.baseUrl}${path}`, {
      ...options,
      headers: {
        ...(isFormData ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...options.headers,
      },
      body:
        options.body === undefined
          ? undefined
          : isFormData
            ? (options.body as FormData)
            : JSON.stringify(options.body),
    });

    if (!response.ok) {
      const errorBody = (await response.json().catch(() => null)) as ApiErrorBody | null;
      throw new ApiError(
        response.status,
        errorBody ?? { code: "UNKNOWN_ERROR", message: "Erro desconhecido ao chamar a API." },
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    if (options.responseType === "blob") {
      return (await response.blob()) as T;
    }

    return (await response.json()) as T;
  }

  return { request };
}
