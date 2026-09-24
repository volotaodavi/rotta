import type { ApiClient } from "../http";

/**
 * Escala do dia — qual ônibus, com qual motorista, faz cada rota em
 * cada data. Espelha `apps/api/src/modules/route-assignments`.
 *
 * Convive com `Route.veiculoPadraoId`/`motoristaPadraoId` numa
 * precedência simples: **escala do dia vence o padrão da rota**. Rota
 * que sempre sai com o mesmo carro e o mesmo motorista não precisa de
 * escala nenhuma; a escala existe para o dia que foge do padrão.
 */

export interface Escala {
  id: string;
  /** `AAAA-MM-DD`. */
  data: string;
  routeId: string;
  rotaNome: string;
  rotaTurno: string;
  veiculoId: string;
  /** Número do ônibus; cai para a placa quando a frota não usa numeração. */
  veiculoIdentificacao: string;
  motoristaId: string;
  motoristaNome: string;
  monitorId: string | null;
  monitorNome: string | null;
  observacao: string | null;
}

export interface DefinirEscalaInput {
  routeId: string;
  /** `AAAA-MM-DD`. */
  data: string;
  veiculoId: string;
  motoristaId: string;
  monitorId?: string;
  observacao?: string;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createRouteAssignmentsEndpoints(apiClient: ApiClient) {
  return {
    /**
     * Cria OU atualiza a escala daquela rota naquele dia. Mandar de
     * novo a mesma rota na mesma data edita — é assim que o despachante
     * troca o motorista de última hora.
     */
    definir: async (input: DefinirEscalaInput): Promise<Escala> =>
      (await apiClient.request<ApiEnvelope<Escala>>("/escalas", { method: "POST", body: input }))
        .data,

    listarPorDia: async (data: string): Promise<Escala[]> =>
      (await apiClient.request<ApiEnvelope<Escala[]>>(`/escalas?data=${encodeURIComponent(data)}`))
        .data,

    /** "Qual a minha escala?", do lado do motorista/monitor — hoje e os próximos dias. */
    minhas: async (): Promise<Escala[]> =>
      (await apiClient.request<ApiEnvelope<Escala[]>>("/escalas/minhas")).data,

    remover: async (id: string): Promise<void> => {
      await apiClient.request(`/escalas/${id}`, { method: "DELETE" });
    },
  };
}

export type RouteAssignmentsEndpoints = ReturnType<typeof createRouteAssignmentsEndpoints>;
