import type { StatusPillTone } from "@/features/vehicles/components";
import type { RouteStop, RouteStudent, TripSentido } from "@rotta/api-client";

/**
 * As paradas na ORDEM EM QUE VÃO SER PERCORRIDAS neste sentido.
 *
 * `RouteStop.ordem` é sempre a ordem da ida (as casas e, no fim, a
 * escola). Na volta o veículo faz o caminho inverso — sai da escola e
 * vai deixando cada aluno —, então a ordem de percurso é a lista
 * invertida. Mesma regra que o backend aplica em
 * `TripsService.listParadasPendentes`; existe aqui porque as telas
 * montam a própria lista a partir de `GET /routes/:id/stops` (que
 * devolve sempre na ordem cadastrada) e a usam pro traçado do mapa,
 * pros marcadores e pra sequência de cartões de parada — tudo coisa em
 * que a ordem é o conteúdo, não um detalhe.
 *
 * `sentido` indefinido (viagem ainda não iniciada) = ordem cadastrada:
 * antes de existir viagem não há sentido nenhum a respeitar.
 */
export function ordenarParadasPorSentido<T extends { ordem: number }>(
  paradas: T[],
  sentido: TripSentido | undefined,
): T[] {
  const porOrdem = [...paradas].sort((a, b) => a.ordem - b.ordem);
  return sentido === "VOLTA" ? porOrdem.reverse() : porOrdem;
}

/**
 * Direção de uma parada — porta 1:1 de
 * `apps/web/src/app/(dashboard)/rotas/[id]/_components/stop-direction.ts`.
 *
 * `RouteStop` não guarda direção nenhuma, e não deve guardar: a MESMA
 * parada (a escola, por exemplo) é desembarque da ida e embarque da
 * volta ao mesmo tempo. A direção real está no VÍNCULO aluno↔parada
 * (`RouteStudent.paradaEmbarqueId`/`paradaDesembarqueId`), então é
 * derivada aqui e nunca armazenada: "Ida" quando algum aluno EMBARCA
 * nela (sai de casa rumo à escola), "Volta" quando algum aluno
 * DESEMBARCA nela (chega em casa/no trabalho do responsável vindo da
 * escola). Sem aluno vinculado ainda, não dá pra saber — `null`, sem
 * selo, nunca um "Ida" adivinhado.
 */
export type StopDirection = "IDA" | "VOLTA" | "IDA_E_VOLTA";

export const STOP_DIRECTION_LABEL: Record<StopDirection, string> = {
  IDA: "Ida",
  VOLTA: "Volta",
  IDA_E_VOLTA: "Ida e volta",
};

/** Mesma decisão do Painel Web: tom informativo, nunca sucesso/erro — é rótulo, não estado. */
export const STOP_DIRECTION_TONE: Record<StopDirection, StatusPillTone> = {
  IDA: "info",
  VOLTA: "neutral",
  IDA_E_VOLTA: "info",
};

export function getStopDirection(
  stop: RouteStop,
  routeStudents: RouteStudent[] | undefined,
): StopDirection | null {
  if (!routeStudents || routeStudents.length === 0) return null;
  const isEmbarque = routeStudents.some((student) => student.paradaEmbarqueId === stop.id);
  const isDesembarque = routeStudents.some((student) => student.paradaDesembarqueId === stop.id);
  if (isEmbarque && isDesembarque) return "IDA_E_VOLTA";
  if (isEmbarque) return "IDA";
  if (isDesembarque) return "VOLTA";
  return null;
}
