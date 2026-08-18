import type { ApiClient } from "../http";

/**
 * Endpoints tipados do Rotta AI (`apps/api/src/modules/rotta-ai`) — só
 * `suggestRouteOptimization` (ROT-08, Frente D) por enquanto: é o único
 * usado por uma tela até agora (o resto do módulo — validação de
 * documento/contrato — é chamado internamente por outros módulos do
 * backend, nunca direto do frontend). Pedido do usuário: "as IAs de
 * localização irão traçar as rotas (por ordem de proximidade)" — o
 * motor (OSRM via Rotta Geo Engine) já existia desde a Frente D, só
 * nunca tinha ficado visível em nenhuma tela.
 */

export interface SuggestRouteOptimizationInput {
  routeId: string;
}

/**
 * Nunca altera a rota sozinha (Dossiê 18 §ROT-08: "a sugestão nunca
 * altera a rota automaticamente") — só a comparação lado a lado pro
 * Gestor decidir.
 */
export interface RouteOptimizationResult {
  routeId: string;
  ordemAtualIds: string[];
  ordemSugeridaIds: string[];
  duracaoAtualSegundos: number;
  duracaoSugeridaSegundos: number;
  economiaSegundos: number;
  distanciaSugeridaMetros: number;
  jaOtimizada: boolean;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createRottaAiEndpoints(apiClient: ApiClient) {
  return {
    suggestRouteOptimization: async (
      input: SuggestRouteOptimizationInput,
    ): Promise<RouteOptimizationResult> =>
      (
        await apiClient.request<ApiEnvelope<RouteOptimizationResult>>(
          "/rotta-ai/suggest-route-optimization",
          { method: "POST", body: input },
        )
      ).data,
  };
}

export type RottaAiEndpoints = ReturnType<typeof createRottaAiEndpoints>;
