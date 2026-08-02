-- CreateEnum
CREATE TYPE "VehicleType" AS ENUM ('AUTOMOVEL', 'SEDAN', 'SUV', 'MINIVAN', 'VAN', 'MICRO_ONIBUS', 'ONIBUS', 'OUTRO');

-- CreateEnum
CREATE TYPE "VehicleCategory" AS ENUM ('ESCOLAR', 'FRETAMENTO', 'PARTICULAR', 'OUTRO');

-- CreateEnum
CREATE TYPE "VehicleStatus" AS ENUM ('DISPONIVEL', 'EM_VIAGEM', 'MANUTENCAO', 'RESERVA', 'INATIVO', 'BLOQUEADO');

-- CreateEnum
CREATE TYPE "VehicleDocumentType" AS ENUM ('CRLV', 'LICENCIAMENTO', 'SEGURO', 'LAUDO', 'VISTORIA', 'FOTO', 'OUTRO');

-- CreateEnum
CREATE TYPE "VehicleDocumentAiStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REPROVADO', 'INDISPONIVEL');

-- CreateEnum
CREATE TYPE "VehicleMaintenanceType" AS ENUM ('TROCA_OLEO', 'PNEUS', 'FREIOS', 'REVISAO', 'VISTORIA', 'LIMPEZA', 'OUTRA');

-- CreateEnum
CREATE TYPE "VehicleReminderType" AS ENUM ('LICENCIAMENTO', 'SEGURO', 'REVISAO', 'TROCA_OLEO', 'MANUTENCAO_PREVENTIVA', 'VISTORIA');

-- CreateEnum
CREATE TYPE "VehicleReminderStatus" AS ENUM ('PENDENTE', 'CONCLUIDO', 'CANCELADO');

-- CreateEnum
CREATE TYPE "VehicleAssignmentRole" AS ENUM ('MOTORISTA', 'MONITOR');

-- CreateEnum
CREATE TYPE "VehicleOccurrenceSeverity" AS ENUM ('BAIXA', 'MEDIA', 'ALTA');

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "placa" TEXT NOT NULL,
    "modelo" TEXT NOT NULL,
    "marca" TEXT,
    "ano" INTEGER,
    "cor" TEXT,
    "renavam" TEXT,
    "chassi" TEXT,
    "capacidadePassageiros" INTEGER NOT NULL,
    "tipo" "VehicleType" NOT NULL,
    "categoria" "VehicleCategory" NOT NULL DEFAULT 'ESCOLAR',
    "observacoes" TEXT,
    "fotoUrl" TEXT,
    "status" "VehicleStatus" NOT NULL DEFAULT 'DISPONIVEL',
    "quilometragemAtual" INTEGER NOT NULL DEFAULT 0,
    "ultimaLatitude" DECIMAL(9,6),
    "ultimaLongitude" DECIMAL(9,6),
    "ultimaPosicaoEm" TIMESTAMP(3),
    "viagemAtualId" TEXT,
    "ultimoMotoristaId" UUID,
    "ultimoMonitorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_documents" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "maintenanceId" UUID,
    "tipo" "VehicleDocumentType" NOT NULL,
    "nomeOriginal" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "vencimentoEm" TIMESTAMP(3),
    "rottaAiStatus" "VehicleDocumentAiStatus" NOT NULL DEFAULT 'PENDENTE',
    "rottaAiQualidadeOk" BOOLEAN,
    "rottaAiLegivel" BOOLEAN,
    "rottaAiSuspeitaAdulteracao" BOOLEAN,
    "rottaAiObservacoes" TEXT,
    "rottaAiAnalisadoEm" TIMESTAMP(3),
    "uploadedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "vehicle_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_maintenances" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "tipo" "VehicleMaintenanceType" NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "quilometragem" INTEGER,
    "valorCentavos" INTEGER,
    "fornecedor" TEXT,
    "observacoes" TEXT,
    "registradoPorId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_maintenances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_reminders" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "tipo" "VehicleReminderType" NOT NULL,
    "dataAlvo" TIMESTAMP(3) NOT NULL,
    "quilometragemAlvo" INTEGER,
    "status" "VehicleReminderStatus" NOT NULL DEFAULT 'PENDENTE',
    "observacoes" TEXT,
    "origemDocumentoId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "concluidoEm" TIMESTAMP(3),

    CONSTRAINT "vehicle_reminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_assignments" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "papel" "VehicleAssignmentRole" NOT NULL,
    "userId" UUID NOT NULL,
    "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerradoEm" TIMESTAMP(3),
    "criadoPorId" UUID NOT NULL,

    CONSTRAINT "vehicle_assignments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_checklists" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "motoristaId" UUID NOT NULL,
    "viagemId" TEXT,
    "pneusOk" BOOLEAN NOT NULL DEFAULT true,
    "lucesOk" BOOLEAN NOT NULL DEFAULT true,
    "combustivelOk" BOOLEAN NOT NULL DEFAULT true,
    "limpezaOk" BOOLEAN NOT NULL DEFAULT true,
    "equipamentosObrigatoriosOk" BOOLEAN NOT NULL DEFAULT true,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_checklists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicle_occurrences" (
    "id" UUID NOT NULL,
    "vehicleId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "reportadoPorId" UUID NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "severidade" "VehicleOccurrenceSeverity" NOT NULL DEFAULT 'MEDIA',
    "fotoUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vehicle_occurrences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "vehicles_companyId_status_idx" ON "vehicles"("companyId", "status");

-- CreateIndex
CREATE INDEX "vehicles_companyId_tipo_idx" ON "vehicles"("companyId", "tipo");

-- CreateIndex
CREATE INDEX "vehicles_companyId_deletedAt_idx" ON "vehicles"("companyId", "deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_placa_key" ON "vehicles"("placa");

-- CreateIndex
CREATE INDEX "vehicle_documents_companyId_vehicleId_tipo_idx" ON "vehicle_documents"("companyId", "vehicleId", "tipo");

-- CreateIndex
CREATE INDEX "vehicle_documents_companyId_vencimentoEm_idx" ON "vehicle_documents"("companyId", "vencimentoEm");

-- CreateIndex
CREATE INDEX "vehicle_maintenances_companyId_vehicleId_tipo_idx" ON "vehicle_maintenances"("companyId", "vehicleId", "tipo");

-- CreateIndex
CREATE INDEX "vehicle_maintenances_companyId_data_idx" ON "vehicle_maintenances"("companyId", "data");

-- CreateIndex
CREATE INDEX "vehicle_reminders_companyId_vehicleId_status_idx" ON "vehicle_reminders"("companyId", "vehicleId", "status");

-- CreateIndex
CREATE INDEX "vehicle_reminders_companyId_dataAlvo_idx" ON "vehicle_reminders"("companyId", "dataAlvo");

-- CreateIndex
CREATE INDEX "vehicle_assignments_companyId_vehicleId_papel_encerradoEm_idx" ON "vehicle_assignments"("companyId", "vehicleId", "papel", "encerradoEm");

-- CreateIndex
CREATE INDEX "vehicle_assignments_companyId_userId_idx" ON "vehicle_assignments"("companyId", "userId");

-- CreateIndex
CREATE INDEX "vehicle_checklists_companyId_vehicleId_createdAt_idx" ON "vehicle_checklists"("companyId", "vehicleId", "createdAt");

-- CreateIndex
CREATE INDEX "vehicle_checklists_companyId_motoristaId_idx" ON "vehicle_checklists"("companyId", "motoristaId");

-- CreateIndex
CREATE INDEX "vehicle_occurrences_companyId_vehicleId_createdAt_idx" ON "vehicle_occurrences"("companyId", "vehicleId", "createdAt");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_ultimoMotoristaId_fkey" FOREIGN KEY ("ultimoMotoristaId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_ultimoMonitorId_fkey" FOREIGN KEY ("ultimoMonitorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_maintenanceId_fkey" FOREIGN KEY ("maintenanceId") REFERENCES "vehicle_maintenances"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_documents" ADD CONSTRAINT "vehicle_documents_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_maintenances" ADD CONSTRAINT "vehicle_maintenances_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_maintenances" ADD CONSTRAINT "vehicle_maintenances_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_reminders" ADD CONSTRAINT "vehicle_reminders_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_assignments" ADD CONSTRAINT "vehicle_assignments_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_assignments" ADD CONSTRAINT "vehicle_assignments_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_assignments" ADD CONSTRAINT "vehicle_assignments_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_checklists" ADD CONSTRAINT "vehicle_checklists_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_checklists" ADD CONSTRAINT "vehicle_checklists_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_occurrences" ADD CONSTRAINT "vehicle_occurrences_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicle_occurrences" ADD CONSTRAINT "vehicle_occurrences_reportadoPorId_fkey" FOREIGN KEY ("reportadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RowLevelSecurity (Dossie 8, Secao 1.2 / Secao 15.2) — mesmo padrao de
-- "companies"/"memberships"/"audit_logs"/"invites": isolamento por
-- "companyId", nunca por "id" proprio (exceto a propria "companies").
ALTER TABLE "vehicles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicles" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "vehicles"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "vehicle_documents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicle_documents" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "vehicle_documents"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "vehicle_maintenances" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicle_maintenances" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "vehicle_maintenances"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "vehicle_reminders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicle_reminders" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "vehicle_reminders"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "vehicle_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicle_assignments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "vehicle_assignments"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "vehicle_checklists" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicle_checklists" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "vehicle_checklists"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "vehicle_occurrences" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vehicle_occurrences" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "vehicle_occurrences"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');
