-- CreateTable
CREATE TABLE "plan_notices" (
    "id" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "companyId" UUID,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criadoPorUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "plan_notices_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "plan_notices_companyId_idx" ON "plan_notices"("companyId");

-- CreateIndex
CREATE INDEX "plan_notices_ativo_idx" ON "plan_notices"("ativo");

-- AddForeignKey
ALTER TABLE "plan_notices" ADD CONSTRAINT "plan_notices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "plan_notices" ADD CONSTRAINT "plan_notices_criadoPorUserId_fkey" FOREIGN KEY ("criadoPorUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS: "companyId" nulo = aviso GLOBAL (toda empresa enxerga, mesmo em
-- leitura tenant-scoped) — diferente do padrão usual de
-- "tenant_isolation" (ex. driver_documents_rls_fix), que só libera a
-- própria linha do tenant. Admin Rotta (bypass) sempre enxerga tudo,
-- inclusive avisos de empresas específicas que não são a sua.
ALTER TABLE "plan_notices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "plan_notices" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "plan_notices"
  USING ("companyId" IS NULL OR "companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId" IS NULL OR "companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');
