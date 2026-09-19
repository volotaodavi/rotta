import type { RouteStop, RouteStudent } from "../endpoints/routes";
import type { TripSentido } from "../endpoints/trips";

/**
 * `ROT-07` — a ordem e a direção das paradas, num lugar só.
 *
 * Até 19/09/2026 estas mesmas funções existiam em TRÊS arquivos:
 * `apps/mobile/src/features/routes/stop-direction.ts`,
 * `apps/web/src/features/routes/stop-order.ts` e
 * `apps/web/src/app/(dashboard)/rotas/[id]/_components/stop-direction.ts`.
 * Duas delas eram idênticas caractere por caractere, e os comentários
 * de cada uma diziam ser "mirror"/"porta 1:1" da outra — o que é a
 * própria descrição do problema: a regra que decide a ORDEM DO
 * PERCURSO estava copiada, e nada impedia uma cópia de mudar sozinha.
 *
 * Uma divergência aqui não apareceria como erro: apareceria como o
 * traçado do mapa e a fila de cartões de parada discordando entre o
 * celular e o computador, com as duas telas parecendo certas.
 *
 * Mora em `@rotta/api-client` porque é onde `RouteStop`, `RouteStudent`
 * e `TripSentido` já são definidos, e porque os três aplicativos de
 * interface (mobile, web, admin) já dependem deste pacote. É lógica
 * pura: sem rede, sem React, sem tema.
 */

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
 * Direção de uma parada.
 *
 * `RouteStop` não guarda direção nenhuma, e não deve guardar: a MESMA
 * parada (a escola, por exemplo) é desembarque da ida e embarque da
 * volta ao mesmo tempo. A direção real está no VÍNCULO aluno↔parada
 * (`RouteStudent.paradaEmbarqueId`/`paradaDesembarqueId`), então é
 * derivada aqui e nunca armazenada: "Ida" quando algum aluno EMBARCA
 * nela (sai de casa rumo à escola), "Volta" quando algum aluno
 * DESEMBARCA nela (chega em casa vindo da escola). Sem aluno vinculado
 * ainda, não dá pra saber — `null`, sem selo, nunca um "Ida" adivinhado.
 */
export type StopDirection = "IDA" | "VOLTA" | "IDA_E_VOLTA";

export const STOP_DIRECTION_LABEL: Record<StopDirection, string> = {
  IDA: "Ida",
  VOLTA: "Volta",
  IDA_E_VOLTA: "Ida e volta",
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
