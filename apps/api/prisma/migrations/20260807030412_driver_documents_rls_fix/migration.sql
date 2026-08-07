-- Fix: "driver_documents" (migração 20260807023218_driver_documents_cnh_ear_cursos)
-- foi criada sem RLS por "companyId" — todas as demais tabelas de tenant
-- (incluindo "vehicle_documents", seu par direto) têm essa policy desde a
-- criação. `PrismaDriverDocumentRepository` sempre chama `withTenant(...)`
-- assumindo que o Postgres reforça o isolamento por tenant; sem esta policy
-- essa camada de defesa em profundidade (Dossiê 8, Seção 15) não existia —
-- a validação de posse em `DriversService` (`resolveCompanyContext` +
-- checagem de `document.userId` em `removeDocument`) permanecia como única
-- barreira. Fechado como parte da auditoria do Backoffice (Dossiê 29).
ALTER TABLE "driver_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "driver_documents" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "driver_documents"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');
