import type { Plan } from "@prisma/client";

export interface UpsertPlanInput {
  code: string;
  name: string;
  priceCents: number;
  isActive: boolean;
}

/** `plans` é catálogo público sem RLS (Dossiê 24 — "criar estrutura para futuros planos"). */
export interface PlanRepository {
  findByCode(code: string): Promise<Plan | null>;
  findById(id: string): Promise<Plan | null>;
  listActive(): Promise<Plan[]>;
  /** Mesma operação de `prisma/seed.ts` — usado por `CompaniesService.onModuleInit` para autoprovisionar o plano padrão se o catálogo estiver vazio (Dossiê 26). */
  upsertByCode(input: UpsertPlanInput): Promise<Plan>;
}
