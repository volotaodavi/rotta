import type { StatusPillTone } from "@/features/vehicles/components";
import type { RouteStop, RouteStudent } from "@rotta/api-client";

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
