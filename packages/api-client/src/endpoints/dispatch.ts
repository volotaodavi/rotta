import type { ApiClient } from "../http";

/**
 * Painel Geral do Despachante — espelha
 * `apps/api/src/modules/dispatch`.
 *
 * Uma chamada só devolve a tela inteira, e isso é de propósito: o
 * painel recarrega enquanto a operação acontece, e seis chamadas por
 * ciclo multiplicariam por seis o trabalho do servidor para entregar
 * a mesma tela.
 *
 * Este módulo é **só leitura**. Trocar o ônibus da viagem continua em
 * `tripsApi.substituirVeiculo` (que avisa as famílias) e escalar
 * continua em `routeAssignmentsApi.definir`. Manter as duas coisas
 * separadas é o que permite recarregar o painel sem pensar duas vezes.
 */

/**
 * O que o marcador diz sobre o carro.
 *
 * `SEM_RASTREADOR` não é "sem sinal": é um carro que não tem como
 * informar posição. Um vira telefonema para o motorista, o outro vira
 * ordem de compra.
 */
export type SituacaoDoVeiculo = "EM_MOVIMENTO" | "PARADO" | "SEM_SINAL" | "SEM_RASTREADOR";

/** Onde a rota está no dia. */
export type SituacaoDaRota =
  "NAO_INICIADA" | "EM_ANDAMENTO" | "PAUSADA" | "ATRASADA" | "CONCLUIDA" | "CANCELADA";

export type NivelDoAlerta = "CRITICO" | "ATENCAO" | "INFORMACAO";

/** `total` é anulável: nem todo indicador tem denominador honesto. */
export interface IndicadorDoPainel {
  atual: number;
  total: number | null;
}

export interface IndicadoresDoPainel {
  veiculosEmOperacao: IndicadorDoPainel;
  rotasEmAndamento: IndicadorDoPainel;
  motoristasEmAtividade: IndicadorDoPainel;
  monitoresEmAtividade: IndicadorDoPainel;
  ocorrenciasHoje: IndicadorDoPainel;
  veiculosSemRastreador: number;
}

export interface VeiculoNoMapa {
  tripId: string;
  veiculoId: string;
  rotaId: string;
  rotaNome: string;
  turno: string;
  /** Número do ônibus; cai para a placa quando a frota não usa numeração. */
  identificacao: string;
  placa: string;
  motoristaNome: string;
  monitorNome: string | null;
  situacao: SituacaoDoVeiculo;
  latitude: number | null;
  longitude: number | null;
  velocidadeKmh: number | null;
  /** ISO. Quando o APARELHO capturou, não quando o servidor gravou. */
  posicaoCapturadaEm: string | null;
  /**
   * Idade da posição em minutos. É isto que a tela escreve ao lado do
   * marcador antigo, e o que a impede de chamar posição velha de tempo
   * real.
   */
  minutosDesdeAPosicao: number | null;
}

export interface RotaDoDia {
  rotaId: string;
  nome: string;
  turno: string;
  situacao: SituacaoDaRota;
  /** `null` nas rotas sem parada fixa, o normal no transporte público escolar. */
  horarioPrevistoInicio: string | null;
  horarioPrevistoFim: string | null;
  alunos: number;
  tripId: string | null;
  veiculoIdentificacao: string | null;
  motoristaNome: string | null;
  monitorNome: string | null;
  minutosDeAtraso: number | null;
}

export interface AlertaDoPainel {
  id: string;
  nivel: NivelDoAlerta;
  titulo: string;
  descricao: string;
  /** ISO. */
  em: string;
  rotaNome: string | null;
  rotaId: string | null;
}

export interface EventoRecenteDoPainel {
  id: string;
  titulo: string;
  detalhe: string;
  /** ISO. */
  em: string;
}

export interface LinhaDaEscalaDoDia {
  rotaId: string;
  rotaNome: string;
  turno: string;
  veiculoIdentificacao: string;
  motoristaNome: string;
  monitorNome: string | null;
  situacao: SituacaoDaRota;
  observacao: string | null;
}

export interface PainelDoDespachante {
  /** ISO, carimbado pelo servidor. A tela mostra: painel que não diz quando atualizou parece ao vivo para sempre. */
  atualizadoEm: string;
  indicadores: IndicadoresDoPainel;
  veiculos: VeiculoNoMapa[];
  rotasDoDia: RotaDoDia[];
  alertas: AlertaDoPainel[];
  eventosRecentes: EventoRecenteDoPainel[];
  escalaDoDia: LinhaDaEscalaDoDia[];
}

interface ApiEnvelope<T> {
  data: T;
}

export function createDispatchEndpoints(apiClient: ApiClient) {
  return {
    /**
     * O estado da operação de hoje.
     *
     * `companyId` só serve ao Admin Rotta, que não tem tenant. Empresa
     * e gestor sempre recebem o painel da própria transportadora, e o
     * backend ignora o parâmetro para eles.
     */
    painel: async (companyId?: string): Promise<PainelDoDespachante> =>
      (
        await apiClient.request<ApiEnvelope<PainelDoDespachante>>(
          companyId
            ? `/dispatch/painel?companyId=${encodeURIComponent(companyId)}`
            : "/dispatch/painel",
        )
      ).data,
  };
}
