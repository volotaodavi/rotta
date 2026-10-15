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
  | "sessao-nao-renovada"
  /**
   * A tentativa de entrar falhou por algo que NÃO é resposta do
   * servidor: conexão caída no meio, requisição abortada, falha de
   * rede. Credencial errada não entra aqui — isso é um 401 com texto
   * próprio, e a pessoa precisa ler aquele texto, não este registro.
   *
   * Entrou em 13/10/2026, pelo mesmo motivo de `sessao-nao-renovada`:
   * o fundador recebeu "Erro inesperado ao entrar" com a senha certa, o
   * banco mostrava que o servidor tinha processado o login, e o plantão
   * não tinha NADA — porque o `catch` da tela de login trocava o erro
   * real por uma frase genérica e seguia em frente. Um caminho de falha
   * que o app trata sozinho continua sendo uma falha; se ele não vira
   * registro, ninguém nunca descobre o que aconteceu.
   */
  | "login-falhou";

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
