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

/**
 * Catálogo inicial do CMS de documentos legais (Dossiê 45 FRENTE 4,
 * tarefa #205) — os 10 documentos REAIS já publicados como componentes
 * React estáticos em `apps/web/src/app/legal/*`
 * (`apps/web/src/features/legal/documents.ts` é a fonte de slug/título
 * canônica do lado público). Só cria o registro `LegalDocument`
 * (slug+título) — nenhuma versão/conteúdo é semeado aqui: cada versão
 * de verdade nasce quando alguém do time redige pelo CMS.
 */
const LEGAL_DOCUMENT_CATALOG: { slug: string; titulo: string }[] = [
  { slug: "privacidade", titulo: "Política de Privacidade / LGPD" },
  { slug: "termos", titulo: "Termos de Uso" },
  { slug: "seguranca", titulo: "Segurança na Rotta" },
  { slug: "comunidade", titulo: "Política da Comunidade Rotta" },
  { slug: "rottapay", titulo: "Política Financeira RottaPay" },
  { slug: "motoristas", titulo: "Diretrizes para Motoristas e Modalidades de Transporte" },
  { slug: "marketplace", titulo: "Política de Contratação e Marketplace" },
  { slug: "cookies", titulo: "Política de Cookies" },
  { slug: "comunicacoes", titulo: "Política de Comunicações" },
  { slug: "ajuda", titulo: "Central de Ajuda / Transparência" },
];

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
