/**
 * Catálogo inicial do CMS de documentos legais — os 10 documentos REAIS
 * já publicados em `apps/web/src/app/legal/*`
 * (`apps/web/src/features/legal/documents.ts` é a fonte canônica de
 * slug/título do lado público).
 *
 * Só slug e título: nenhuma versão/conteúdo nasce aqui. Cada versão de
 * verdade é redigida pelo CMS, por gente.
 *
 * MORA AQUI, e não só em `prisma/seed.ts`, desde 19/09/2026. Motivo:
 * o container rodava `prisma migrate deploy && prisma db seed` antes de
 * abrir a porta, e no plano gratuito do Render — onde o container dorme
 * e é recriado a cada acordada — isso significava pagar, a CADA cold
 * start, o boot do pnpm, o do CLI do Prisma e o do ts-node compilando
 * TypeScript em tempo de execução. A API levava mais de 90 segundos
 * para responder o primeiro byte (medido: `curl: (28) timed out after
 * 90s with 0 bytes received`, em 15 das 20 últimas execuções do cron de
 * keep-warm), e o app do celular desistia antes — era a origem da tela
 * azul travada que os transportadores viam.
 *
 * Provisionar daqui, no boot da própria aplicação, é o mesmo padrão que
 * `CompaniesService.onModuleInit` já usava para o catálogo de planos: o
 * processo Node e o Prisma Client já estão de pé, então os `upsert`
 * custam milissegundos em vez de dezenas de segundos de ferramenta.
 *
 * `prisma/seed.ts` continua existindo e importando esta lista — para
 * desenvolvimento local e para banco novo, `pnpm prisma:seed` segue
 * funcionando. O que saiu foi a execução A CADA PARTIDA do container,
 * não o seed.
 */
export const LEGAL_DOCUMENT_CATALOG: readonly { slug: string; titulo: string }[] = [
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
] as const;
