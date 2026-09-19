import type { StatusPillTone } from "@/features/vehicles/components";
import type { StopDirection } from "@rotta/api-client";

/**
 * `ROT-07` — a REGRA mora em `@rotta/api-client`
 * (`rules/paradas.ts`), compartilhada com o Painel Web e o Admin. Até
 * 19/09/2026 ela estava copiada em três arquivos, dois deles idênticos
 * caractere por caractere, e nada impedia uma cópia de mudar sozinha.
 *
 * O que sobra aqui é o que é do aplicativo e de mais ninguém: o tom do
 * selo, que depende do sistema de componentes do mobile. O re-export
 * existe para as telas continuarem com um import só.
 */
export {
  getStopDirection,
  ordenarParadasPorSentido,
  STOP_DIRECTION_LABEL,
  type StopDirection,
} from "@rotta/api-client";

/** Mesma decisão do Painel Web: tom informativo, nunca sucesso/erro — é rótulo, não estado. */
export const STOP_DIRECTION_TONE: Record<StopDirection, StatusPillTone> = {
  IDA: "info",
  VOLTA: "neutral",
  IDA_E_VOLTA: "info",
};
