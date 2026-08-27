import { SetMetadata } from "@nestjs/common";

export const SKIP_TRIAL_GUARD_KEY = "skipTrialGuard";

/**
 * Dispensa o `TrialGuard` (Dossiê 26, faturamento) — usado nos módulos
 * que uma empresa com trial vencido/inadimplente/suspensa **precisa**
 * continuar acessando: `SupportController` (pedido explícito do
 * usuário: "bloqueio em todas as funcionalidades, exceto no suporte,
 * que aí eles podem acionar o suporte") e `BillingController` (senão
 * ninguém bloqueado conseguiria pagar pra se desbloquear). Mesmo padrão
 * de `@Public()` pro `JwtAuthGuard` — `SetMetadata` lido via `Reflector`.
 */
export const SkipTrialGuard = () => SetMetadata(SKIP_TRIAL_GUARD_KEY, true);
