-- Pré-cadastro de aluno + responsável feito pela transportadora (pedido do
-- usuário: "no painel do admin deverá ter essa opção de cadastrar alunos
-- por transporte + responsável"). `studentId` é uma FK crua (sem
-- constraint do Prisma Client, ver nota no schema) que ainda referencia
-- "students"(id) por integridade — mantida como coluna simples, nunca
-- gerenciada por um relacionamento Prisma formal.

CREATE TYPE "StudentPreRegistrationStatus" AS ENUM ('PENDENTE', 'RECLAMADO', 'CONCLUIDO', 'CANCELADO');

CREATE TABLE "student_pre_registrations" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "criadoPorId" UUID NOT NULL,
    "nomeAluno" TEXT NOT NULL,
    "nomeResponsavel" TEXT NOT NULL,
    "celularResponsavel" TEXT NOT NULL,
    "status" "StudentPreRegistrationStatus" NOT NULL DEFAULT 'PENDENTE',
    "reclamadoPorId" UUID,
    "reclamadoEm" TIMESTAMP(3),
    "studentId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "student_pre_registrations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "student_pre_registrations_companyId_status_idx" ON "student_pre_registrations"("companyId", "status");

CREATE INDEX "student_pre_registrations_celularResponsavel_idx" ON "student_pre_registrations"("celularResponsavel");

ALTER TABLE "student_pre_registrations" ADD CONSTRAINT "student_pre_registrations_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "student_pre_registrations" ADD CONSTRAINT "student_pre_registrations_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "student_pre_registrations" ADD CONSTRAINT "student_pre_registrations_reclamadoPorId_fkey" FOREIGN KEY ("reclamadoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "student_pre_registrations" ADD CONSTRAINT "student_pre_registrations_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RowLevelSecurity (Dossiê 8, Seção 15.2 — mesmo padrão de
-- "company_join_requests"): FORCE garante que a policy vale até para a
-- role dona da tabela; o Responsável que busca/reivindica pelo código da
-- empresa + celular ainda não tem tenant nenhum, então
-- `StudentPreRegistrationsService.lookup`/`claim` usam
-- `PrismaService.withBypass`, nunca contornam esta policy por fora.
ALTER TABLE "student_pre_registrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "student_pre_registrations" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "student_pre_registrations"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');
