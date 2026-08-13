-- Frente N (briefing item 9) — Motorista/Monitor autônomo (User.autonomoRole)
-- + pedidos de vínculo com uma transportadora via Company.codigoInterno.

ALTER TABLE "users" ADD COLUMN "autonomoRole" TEXT;

CREATE TYPE "CompanyJoinRequestStatus" AS ENUM ('PENDENTE', 'APROVADO', 'RECUSADO');

CREATE TABLE "company_join_requests" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "status" "CompanyJoinRequestStatus" NOT NULL DEFAULT 'PENDENTE',
    "motivoRecusa" TEXT,
    "decididoPorId" UUID,
    "decidedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_join_requests_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "company_join_requests_companyId_status_idx" ON "company_join_requests"("companyId", "status");

CREATE INDEX "company_join_requests_userId_status_idx" ON "company_join_requests"("userId", "status");

ALTER TABLE "company_join_requests" ADD CONSTRAINT "company_join_requests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_join_requests" ADD CONSTRAINT "company_join_requests_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_join_requests" ADD CONSTRAINT "company_join_requests_decididoPorId_fkey" FOREIGN KEY ("decididoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RowLevelSecurity (Dossiê 8, Seção 15.2 — mesmo padrão de "invites":
-- FORCE garante que a policy vale até para a role dona da tabela; o
-- solicitante ainda não tem tenant nenhum quando cria o pedido, então
-- `CompanyJoinRequestsService.create`/`findMine` usam
-- `PrismaService.withBypass`, nunca contornam esta policy por fora)
ALTER TABLE "company_join_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_join_requests" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "company_join_requests"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');
