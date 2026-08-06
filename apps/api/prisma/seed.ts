import { PrismaClient } from "@prisma/client";

import { DEFAULT_PLAN } from "../src/modules/companies/companies.constants";

/**
 * Seed de dados de catalogo (nunca de dados transacionais/de tenant) —
 * Dossie 16, Secao "Plano": "criar estrutura para futuros planos". Hoje
 * existe um unico plano (`DEFAULT_PLAN`, R$ 39,90/mes — mesma fonte que
 * `CompaniesService.onModuleInit` usa pra autoprovisionar o catalogo se
 * ele estiver vazio no boot, nunca duas definicoes divergentes); novos
 * planos sao um `upsert` aqui, nunca uma migration de schema.
 *
 * Roda fora do contexto de RLS (nao ha tenant): a tabela `plans` nao tem
 * policy de RLS (Dossie 8, Secao 1 — e catalogo publico compartilhado).
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.plan.upsert({
    where: { code: DEFAULT_PLAN.code },
    update: { name: DEFAULT_PLAN.name, priceCents: DEFAULT_PLAN.priceCents, isActive: true },
    create: { ...DEFAULT_PLAN, isActive: true },
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exitCode = 1;
  });
