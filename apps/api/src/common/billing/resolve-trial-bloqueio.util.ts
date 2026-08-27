import { CompanyStatus } from "@prisma/client";

import type { TrialBloqueioMotivo } from "../exceptions/trial-expirado.exception";

import { TRIAL_GRACE_DAYS } from "@/modules/companies/companies.constants";

/**
 * Regra única de "a empresa está bloqueada por faturamento?" — usada
 * tanto por `TrialGuard` (decide se lança `TrialExpiradoException`)
 * quanto por `AuthService.toMeResponse` (decide `billingBlocked`/
 * `billingBlockedReason` pro frontend mostrar o cadeado sem precisar
 * duplicar a regra de datas no cliente). Extraída pra cá pra nunca
 * divergir entre os dois pontos.
 */
export function resolveTrialBloqueioMotivo(
  status: CompanyStatus,
  trialExpiraEm: Date | null,
): TrialBloqueioMotivo | null {
  if (status === CompanyStatus.INADIMPLENTE) {
    return "INADIMPLENTE";
  }
  if (status === CompanyStatus.SUSPENSO) {
    return "SUSPENSO";
  }
  if (status === CompanyStatus.CANCELADO) {
    return "CANCELADO";
  }
  if (status === CompanyStatus.TRIAL && trialExpiraEm) {
    const graceEndsAt = new Date(trialExpiraEm);
    graceEndsAt.setDate(graceEndsAt.getDate() + TRIAL_GRACE_DAYS);
    if (new Date() > graceEndsAt) {
      return "TRIAL_VENCIDO";
    }
  }
  return null;
}
