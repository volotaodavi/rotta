-- Reforço de segurança (achado real em produção, testado com conta de
-- QA de ponta a ponta): "GET /routes" e "GET /vehicles" devolveram
-- linhas de OUTRAS empresas para uma Empresa recém-criada, sem nenhuma
-- rota/veículo próprio ainda. `TenantGuard` + `PrismaService.withTenant`
-- (ver notas de implementação nesses dois arquivos) resolvem o contexto
-- de tenant corretamente e SEMPRE chamam a query dentro da mesma
-- transação que seta `app.tenant_id`/`app.bypass_rls` — auditados de
-- novo agora e continuam corretos. A causa real está no banco: pelo
-- menos as políticas de Row Level Security de "routes" e "vehicles" (as
-- duas testadas ao vivo) não estavam de fato em vigor em produção,
-- mesmo com `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` +
-- `CREATE POLICY "tenant_isolation"` presentes nos arquivos de migração
-- originais — sinal de que a política nunca foi realmente aplicada
-- nesta base (drift entre o histórico de migrações e o estado real do
-- banco, provavelmente de um baseline/`db push` anterior à adoção do
-- fluxo de migrações).
--
-- Correção: reafirma, de forma idempotente, RLS + a policy
-- "tenant_isolation" em TODAS as tabelas de tenant já mapeadas nas
-- migrações anteriores (não só as duas testadas) — `DROP POLICY IF
-- EXISTS` antes de recriar evita erro de política duplicada onde ela já
-- existia de verdade; `ENABLE`/`FORCE ROW LEVEL SECURITY` são
-- idempotentes por natureza no Postgres.


ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "companies" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "companies";
CREATE POLICY "tenant_isolation" ON "companies"
  USING ("id"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("id"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "audit_logs";
CREATE POLICY "tenant_isolation" ON "audit_logs"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "company_join_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_join_requests" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "company_join_requests";
CREATE POLICY "tenant_isolation" ON "company_join_requests"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "company_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_settings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "company_settings";
CREATE POLICY "tenant_isolation" ON "company_settings"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "contracts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contracts" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "contracts";
CREATE POLICY "tenant_isolation" ON "contracts"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "driver_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "driver_documents" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "driver_documents";
CREATE POLICY "tenant_isolation" ON "driver_documents"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "eventos_agenda" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "eventos_agenda" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "eventos_agenda";
CREATE POLICY "tenant_isolation" ON "eventos_agenda"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "invites" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "invites" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "invites";
CREATE POLICY "tenant_isolation" ON "invites"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "memberships";
CREATE POLICY "tenant_isolation" ON "memberships"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "notifications";
CREATE POLICY "tenant_isolation" ON "notifications"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "ratings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ratings" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "ratings";
CREATE POLICY "tenant_isolation" ON "ratings"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "route_stops" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "route_stops" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "route_stops";
CREATE POLICY "tenant_isolation" ON "route_stops"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "route_students" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "route_students" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "route_students";
CREATE POLICY "tenant_isolation" ON "route_students"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "routes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "routes" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "routes";
CREATE POLICY "tenant_isolation" ON "routes"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "school_company_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "school_company_links" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "school_company_links";
CREATE POLICY "tenant_isolation" ON "school_company_links"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "student_pre_registrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_pre_registrations" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "student_pre_registrations";
CREATE POLICY "tenant_isolation" ON "student_pre_registrations"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "support_messages" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "support_messages" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "support_messages";
CREATE POLICY "tenant_isolation" ON "support_messages"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "support_tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "support_tickets" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "support_tickets";
CREATE POLICY "tenant_isolation" ON "support_tickets"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "transport_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transport_requests" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "transport_requests";
CREATE POLICY "tenant_isolation" ON "transport_requests"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "trip_positions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trip_positions" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "trip_positions";
CREATE POLICY "tenant_isolation" ON "trip_positions"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "trip_student_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trip_student_events" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "trip_student_events";
CREATE POLICY "tenant_isolation" ON "trip_student_events"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "trips" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trips" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "trips";
CREATE POLICY "tenant_isolation" ON "trips"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "vehicle_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicle_assignments" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "vehicle_assignments";
CREATE POLICY "tenant_isolation" ON "vehicle_assignments"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "vehicle_checklists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicle_checklists" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "vehicle_checklists";
CREATE POLICY "tenant_isolation" ON "vehicle_checklists"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "vehicle_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicle_documents" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "vehicle_documents";
CREATE POLICY "tenant_isolation" ON "vehicle_documents"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "vehicle_maintenances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicle_maintenances" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "vehicle_maintenances";
CREATE POLICY "tenant_isolation" ON "vehicle_maintenances"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "vehicle_occurrences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicle_occurrences" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "vehicle_occurrences";
CREATE POLICY "tenant_isolation" ON "vehicle_occurrences"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "vehicle_reminders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicle_reminders" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "vehicle_reminders";
CREATE POLICY "tenant_isolation" ON "vehicle_reminders"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "vehicles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicles" FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation" ON "vehicles";
CREATE POLICY "tenant_isolation" ON "vehicles"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');
