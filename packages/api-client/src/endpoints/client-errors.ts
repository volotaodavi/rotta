import { buildQueryString } from "../query.util";

import type { ApiClient } from "../http";

/**
 * Endpoint tipado do módulo de captura de erro do cliente — espelha
 * `apps/api/src/modules/client-errors`. Ver a nota completa em
 * `ClientErrorReport` (schema.prisma) sobre o motivo real de existir:
 * em produção (Vercel), o Next.js redige a mensagem original de todo
 * erro de "Server Components render" antes de mandar pro navegador —
 * `POST /client-errors` é o único jeito de recuperar essa mensagem
 * real depois (o `digest` fica registrado, consultável via
 * `GET /client-errors`, só Admin Rotta).
 */

export type ClientApp = "WEB" | "ADMIN" | "MOBILE";

/** Ver a nota completa em `ClientErrorReport` (schema.prisma). */
export type ClientErrorSource =
  | "error-boundary"
  | "window-error"
  | "unhandledrejection"
  /**
   * A sessão não pôde ser renovada por motivo técnico (tempo esgotado,
   * rede, servidor fora do ar), e a pessoa foi jogada para o login sem
   * ter feito nada errado.
   *
   * Entrou em 06/10/2026. Até então esse caminho não gerava registro
   * nenhum: o app "não abria", e o plantão de erro mostrava zero
   * ocorrências em uma semana inteira, porque do ponto de vista do
   * código não havia erro, havia uma sessão que não deu para renovar.
   * Sessão legitimamente expirada (401/403) NÃO entra aqui.
   */
  | "sessao-nao-renovada";

export interface CreateClientErrorReportInput {
  app: ClientApp;
  message: string;
  digest?: string;
  stack?: string;
  path: string;
  buildId?: string;
  serviceWorkerActive?: boolean;
  source?: ClientErrorSource;
  companyId?: string;
}

export interface ClientErrorReport {
  id: string;
  app: ClientApp;
  message: string;
  digest: string | null;
  stack: string | null;
  path: string;
  userAgent: string | null;
  buildId: string | null;
  serviceWorkerActive: boolean | null;
  source: string | null;
  userId: string | null;
  userNome: string | null;
  companyId: string | null;
  companyNome: string | null;
  createdAt: string;
}

export interface ListClientErrorReportsParams {
  app?: ClientApp;
  digest?: string;
  buildId?: string;
  page?: number;
  pageSize?: number;
}

export interface ListClientErrorReportsResponse {
  items: ClientErrorReport[];
  total: number;
  page: number;
  pageSize: number;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createClientErrorsEndpoints(apiClient: ApiClient) {
  return {
    /**
     * Nunca deve derrubar a própria tela de erro que a está chamando —
     * ver o mesmo cuidado em `apps/web/src/app/error.tsx` (chamada
     * envolvida em `.catch(() => undefined)` no call site, não aqui).
     */
    report: async (input: CreateClientErrorReportInput): Promise<ClientErrorReport> =>
      (
        await apiClient.request<ApiEnvelope<ClientErrorReport>>("/client-errors", {
          method: "POST",
          body: input,
        })
      ).data,

    list: async (
      params: ListClientErrorReportsParams = {},
    ): Promise<ListClientErrorReportsResponse> =>
      (
        await apiClient.request<ApiEnvelope<ListClientErrorReportsResponse>>(
          `/client-errors${buildQueryString(params)}`,
        )
      ).data,
  };
}

export type ClientErrorsEndpoints = ReturnType<typeof createClientErrorsEndpoints>;
