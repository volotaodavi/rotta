-- CreateEnum
CREATE TYPE "SupportTicketCategoria" AS ENUM ('DUVIDA', 'PROBLEMA_TECNICO', 'COBRANCA', 'OUTRO');

-- CreateEnum
CREATE TYPE "SupportTicketStatus" AS ENUM ('ABERTO', 'EM_ANDAMENTO', 'ENCERRADO');

-- CreateTable
CREATE TABLE "support_tickets" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "abertoPorUserId" UUID NOT NULL,
    "assunto" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "categoria" "SupportTicketCategoria" NOT NULL,
    "status" "SupportTicketStatus" NOT NULL DEFAULT 'ABERTO',
    "anexoUrl" TEXT,
    "encerradoEm" TIMESTAMP(3),
    "encerradoPorUserId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "support_tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "support_messages" (
    "id" UUID NOT NULL,
    "ticketId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "autorUserId" UUID NOT NULL,
    "autorIsAdminRotta" BOOLEAN NOT NULL DEFAULT false,
    "mensagem" TEXT NOT NULL,
    "anexoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "support_messages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "support_tickets_companyId_status_createdAt_idx" ON "support_tickets"("companyId", "status", "createdAt");

-- CreateIndex
CREATE INDEX "support_tickets_status_createdAt_idx" ON "support_tickets"("status", "createdAt");

-- CreateIndex
CREATE INDEX "support_messages_ticketId_createdAt_idx" ON "support_messages"("ticketId", "createdAt");

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_abertoPorUserId_fkey" FOREIGN KEY ("abertoPorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_tickets" ADD CONSTRAINT "support_tickets_encerradoPorUserId_fkey" FOREIGN KEY ("encerradoPorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "support_tickets"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "support_messages" ADD CONSTRAINT "support_messages_autorUserId_fkey" FOREIGN KEY ("autorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RowLevelSecurity (Dossiê 8, Seção 15 — RLS por companyId, mesma convenção
-- de todas as demais tabelas de tenant, ex. "contracts" em
-- 20260803025420_marketplace_module).
ALTER TABLE "support_tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "support_tickets" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "support_tickets"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "support_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "support_messages" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "support_messages"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');
