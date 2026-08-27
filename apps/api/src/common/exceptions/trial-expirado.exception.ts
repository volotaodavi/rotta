import { ForbiddenException } from "@nestjs/common";

/** Motivo do bloqueio — mensagens diferentes, mesmo `code` (`TRIALEXPIRADO`) pro frontend tratar igual (ver `TrialLockModal`). */
export type TrialBloqueioMotivo = "TRIAL_VENCIDO" | "INADIMPLENTE" | "SUSPENSO" | "CANCELADO";

/** Exportado pra `AuthService` compor `billingBlockedReason` sem duplicar texto. */
export const TRIAL_BLOQUEIO_MENSAGENS: Record<TrialBloqueioMotivo, string> = {
  TRIAL_VENCIDO:
    "Seu período de teste grátis acabou. Assine o plano Starter (R$ 39,90/mês) para continuar usando a Rotta.",
  INADIMPLENTE:
    "O pagamento da sua assinatura não foi confirmado. Regularize para continuar usando a Rotta.",
  SUSPENSO: "Sua conta foi suspensa pelo Admin Rotta. Entre em contato com o suporte.",
  CANCELADO: "Sua assinatura foi cancelada. Assine novamente para continuar usando a Rotta.",
};

/**
 * Lançada por `TrialGuard` quando uma empresa em `TRIAL` já passou de
 * `Company.trialExpiraEm` (+ 1 dia de graça) e tenta uma ação de
 * escrita, ou está `INADIMPLENTE`/`SUSPENSO`/`CANCELADO`.
 * `AllExceptionsFilter` deriva `code` do nome da classe
 * (`exception.constructor.name.replace(/Exception$/, "").toUpperCase()`)
 * — mesma convenção de toda a API, sem precisar de nenhuma mudança no
 * filtro. O front (`packages/api-client`) reconhece esse `code` exato
 * (`TRIALEXPIRADO`) pra mostrar o modal de cadeado em vez do toast de
 * erro genérico, com a mensagem específica do motivo — ver
 * `TrialLockModal`/`query-provider.tsx`.
 */
export class TrialExpiradoException extends ForbiddenException {
  constructor(motivo: TrialBloqueioMotivo = "TRIAL_VENCIDO") {
    super(TRIAL_BLOQUEIO_MENSAGENS[motivo]);
  }
}
