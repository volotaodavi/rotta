import type { Plan } from "@prisma/client";

/** `plans` é catálogo público sem RLS (Dossiê 24 — "criar estrutura para futuros planos"). */
export interface PlanRepository {
  findByCode(code: string): Promise<Plan | null>;
  findById(id: string): Promise<Plan | null>;
  listActive(): Promise<Plan[]>;
}
