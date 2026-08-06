/** Tokens de injeção de dependência do módulo Companies (Repository Pattern, Dossiê 12 Seção 6.1). */
export const COMPANY_REPOSITORY = Symbol("COMPANY_REPOSITORY");
export const COMPANY_SETTING_REPOSITORY = Symbol("COMPANY_SETTING_REPOSITORY");
export const PLAN_REPOSITORY = Symbol("PLAN_REPOSITORY");

/**
 * Plano padrão do cadastro self-service (Dossiê 26 — único plano hoje,
 * R$ 39,90/mês, confirmado pelo usuário e já refletido em
 * `prisma/seed.ts`). Usado tanto pelo fallback de `create()`
 * (`dto.planCode ?? DEFAULT_PLAN.code`) quanto pelo autoprovisionamento
 * de `CompaniesService.onModuleInit` — nunca duplicado como string
 * solta em mais de um lugar.
 */
export const DEFAULT_PLAN = {
  code: "STARTER",
  // Mesmo nome exibido na página pública /planos (estático, não lido
  // do banco) — nunca deixar os dois divergirem.
  name: "Starter",
  priceCents: 3990,
} as const;
