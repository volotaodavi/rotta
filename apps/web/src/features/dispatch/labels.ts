import type { NivelDoAlerta, SituacaoDaRota, SituacaoDoVeiculo } from "@rotta/api-client";
import type { BadgeVariant } from "@rotta/ui/web";

/**
 * Como cada estado do painel aparece escrito.
 *
 * Fica num arquivo só, e não espalhado pela tela, por uma razão que já
 * custou caro antes: o mesmo estado chamado de dois jeitos em dois
 * cantos da tela faz o despachante achar que são coisas diferentes.
 */

export const SITUACAO_DO_VEICULO_LABEL: Record<SituacaoDoVeiculo, string> = {
  EM_MOVIMENTO: "Em movimento",
  PARADO: "Parado",
  SEM_SINAL: "Sem sinal",
  SEM_RASTREADOR: "Sem rastreador",
};

/**
 * A cor de cada situação.
 *
 * `SEM_RASTREADOR` é neutro, e não vermelho, de propósito: não é uma
 * emergência da operação de hoje, é uma pendência de equipamento. Pintar
 * de vermelho faria o despachante procurar um problema que não é dele.
 */
export const SITUACAO_DO_VEICULO_VARIANT: Record<SituacaoDoVeiculo, BadgeVariant> = {
  EM_MOVIMENTO: "success",
  PARADO: "warning",
  SEM_SINAL: "danger",
  SEM_RASTREADOR: "neutral",
};

/** A bolinha de cada situação na lista e no mapa. Nunca o único portador do estado: sempre tem texto ao lado. */
export const SITUACAO_DO_VEICULO_COR: Record<SituacaoDoVeiculo, string> = {
  EM_MOVIMENTO: "bg-success",
  PARADO: "bg-warning",
  SEM_SINAL: "bg-danger",
  SEM_RASTREADOR: "bg-secondary",
};

export const SITUACAO_DA_ROTA_LABEL: Record<SituacaoDaRota, string> = {
  NAO_INICIADA: "Não iniciada",
  EM_ANDAMENTO: "Em andamento",
  PAUSADA: "Pausada",
  ATRASADA: "Atrasada",
  CONCLUIDA: "Concluída",
  CANCELADA: "Cancelada",
};

export const SITUACAO_DA_ROTA_VARIANT: Record<SituacaoDaRota, BadgeVariant> = {
  NAO_INICIADA: "neutral",
  EM_ANDAMENTO: "success",
  PAUSADA: "warning",
  ATRASADA: "danger",
  CONCLUIDA: "info",
  CANCELADA: "neutral",
};

export const NIVEL_DO_ALERTA_LABEL: Record<NivelDoAlerta, string> = {
  CRITICO: "Crítico",
  ATENCAO: "Atenção",
  INFORMACAO: "Informação",
};

export const NIVEL_DO_ALERTA_VARIANT: Record<NivelDoAlerta, BadgeVariant> = {
  CRITICO: "danger",
  ATENCAO: "warning",
  INFORMACAO: "info",
};

/** A barra colorida à esquerda do alerta. */
export const NIVEL_DO_ALERTA_BARRA: Record<NivelDoAlerta, string> = {
  CRITICO: "bg-danger",
  ATENCAO: "bg-warning",
  INFORMACAO: "bg-info",
};

/**
 * A hora de um instante ISO, no relógio de quem está lendo.
 *
 * `toLocaleTimeString` sem fuso usa o do navegador, que é o do
 * despachante. É o certo aqui: ele compara o que vê na tela com o
 * relógio da parede dele.
 */
export function horaDe(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

/**
 * A janela de horário de uma rota, ou a frase que explica a ausência.
 *
 * Rota sem parada cadastrada é o caso normal do transporte público
 * escolar, onde quase não há ponto fixo. Dizer isso é melhor que um
 * traço solto, que parece cadastro pela metade.
 */
export function janelaDeHorario(inicio: string | null, fim: string | null): string {
  if (!inicio) return "Sem horário previsto";
  return fim && fim !== inicio ? `${inicio} às ${fim}` : inicio;
}
