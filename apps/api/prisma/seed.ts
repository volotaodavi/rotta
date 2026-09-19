import { PrismaClient } from "@prisma/client";

import { DEFAULT_PLAN } from "../src/modules/companies/companies.constants";
import { LEGAL_DOCUMENT_CATALOG } from "../src/modules/legal-documents/legal-documents.catalog";

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

/**
 * A lista de documentos legais MUDOU DE LUGAR (19/09/2026): mora em
 * `src/modules/legal-documents/legal-documents.catalog.ts`, e a própria
 * aplicação a provisiona no boot (`LegalDocumentsService.onModuleInit`).
 *
 * Motivo: este seed rodava a CADA partida do container, via
 * `ts-node` — compilando TypeScript em tempo de execução, antes de a
 * porta abrir. No plano gratuito do Render, onde o container dorme e é
 * recriado a cada acordada, isso era uma fatia grande dos 90+ segundos
 * de cold start que derrubavam o login do app.
 *
 * Este arquivo continua servindo desenvolvimento local e banco novo
 * (`pnpm prisma:seed`), agora importando a MESMA lista — nunca uma
 * segunda cópia que pode divergir.
 */
async function main(): Promise<void> {
  await prisma.plan.upsert({
    where: { code: DEFAULT_PLAN.code },
    update: { name: DEFAULT_PLAN.name, priceCents: DEFAULT_PLAN.priceCents, isActive: true },
    create: { ...DEFAULT_PLAN, isActive: true },
  });

  for (const doc of LEGAL_DOCUMENT_CATALOG) {
    await prisma.legalDocument.upsert({
      where: { slug: doc.slug },
      update: { titulo: doc.titulo },
      create: doc,
    });
  }
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
