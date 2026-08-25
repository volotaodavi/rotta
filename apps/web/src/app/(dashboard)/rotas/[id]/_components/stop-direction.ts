import type { RouteStop, RouteStudent } from "@rotta/api-client";

/**
 * Direção de uma parada (pedido do usuário: "paradas IDA e paradas
 * volta") — `RouteStop` não guarda direção nenhuma (não faz sentido: a
 * MESMA parada, ex. a escola, serve embarque de volta e desembarque de
 * ida ao mesmo tempo). A direção real é por VÍNCULO aluno↔parada
 * (`RouteStudent.paradaEmbarqueId`/`paradaDesembarqueId`), então é
 * derivada aqui, nunca armazenada: uma parada é "Ida" quando algum
 * aluno EMBARCA nela (sai de casa/ponto rumo à escola), "Volta" quando
 * algum aluno DESEMBARCA nela (chega em casa/ponto vindo da escola) —
 * os dois ao mesmo tempo numa rota de ida-e-volta combinada. Sem aluno
 * nenhum vinculado ainda, não dá pra saber (`null`, sem selo).
 *
 * Extraído para um arquivo próprio (em vez de viver dentro de
 * `route-detail-client.tsx`) porque `stops-section.tsx` também precisa
 * dele para o mesmo selo na lista de paradas — importar direto de
 * `route-detail-client.tsx` criava um ciclo de import (`import/no-cycle`),
 * já que este por sua vez importa `StopsSection`.
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
