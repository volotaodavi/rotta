import { PrismaClient } from "@prisma/client";

/**
 * Seed de dados de catalogo (nunca de dados transacionais/de tenant) —
 * Dossie 16, Secao "Plano": "criar estrutura para futuros planos". Hoje
 * existe um unico plano (Starter); novos planos sao um `upsert` aqui,
 * nunca uma migration de schema.
 *
 * Roda fora do contexto de RLS (nao ha tenant): a tabela `plans` nao tem
 * policy de RLS (Dossie 8, Secao 1 — e catalogo publico compartilhado).
 */
const prisma = new PrismaClient();

async function main(): Promise<void> {
  await prisma.plan.upsert({
    where: { code: "STARTER" },
    update: { name: "Starter", priceCents: 3990, isActive: true },
    create: { code: "STARTER", name: "Starter", priceCents: 3990, isActive: true },
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
