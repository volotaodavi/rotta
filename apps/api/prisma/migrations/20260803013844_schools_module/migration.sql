-- CreateEnum
CREATE TYPE "SchoolType" AS ENUM ('CRECHE', 'PRE_ESCOLA', 'FUNDAMENTAL', 'MEDIO', 'EJA', 'TECNICO', 'UNIVERSIDADE', 'OUTRO');

-- CreateEnum
CREATE TYPE "SchoolAdministrativeDependency" AS ENUM ('FEDERAL', 'ESTADUAL', 'MUNICIPAL', 'PRIVADA', 'FILANTROPICA', 'COMUNITARIA');

-- CreateEnum
CREATE TYPE "SchoolShift" AS ENUM ('MANHA', 'TARDE', 'INTEGRAL', 'NOITE', 'PERSONALIZADO');

-- CreateEnum
CREATE TYPE "SchoolStatus" AS ENUM ('ATIVA', 'INATIVA', 'EM_ANALISE', 'ARQUIVADA');

-- CreateEnum
CREATE TYPE "SchoolAccessPointType" AS ENUM ('ENTRADA_PRINCIPAL', 'PONTO_EMBARQUE', 'PONTO_DESEMBARQUE', 'OUTRO');

-- AlterTable
ALTER TABLE "audit_logs" ALTER COLUMN "companyId" DROP NOT NULL;

-- CreateTable
CREATE TABLE "schools" (
    "id" UUID NOT NULL,
    "codigoInterno" TEXT NOT NULL,
    "codigoInep" TEXT,
    "nomeOficial" TEXT NOT NULL,
    "nomeFantasia" TEXT,
    "redeEnsino" TEXT,
    "dependenciaAdministrativa" "SchoolAdministrativeDependency" NOT NULL,
    "cnpj" TEXT,
    "telefone" TEXT,
    "whatsapp" TEXT,
    "email" TEXT,
    "website" TEXT,
    "cep" TEXT NOT NULL,
    "logradouro" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "pais" TEXT NOT NULL DEFAULT 'Brasil',
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "observacoesLocalizacao" TEXT,
    "tipos" "SchoolType"[],
    "turnosAtendidos" "SchoolShift"[],
    "status" "SchoolStatus" NOT NULL DEFAULT 'ATIVA',
    "origemCadastro" TEXT NOT NULL DEFAULT 'MANUAL',
    "criadoPorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_access_points" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "tipo" "SchoolAccessPointType" NOT NULL DEFAULT 'OUTRO',
    "nome" TEXT NOT NULL,
    "descricao" TEXT,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_access_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "school_company_links" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "vinculadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "desvinculadoEm" TIMESTAMP(3),
    "vinculadoPorId" UUID NOT NULL,
    "encerradoPorId" UUID,

    CONSTRAINT "school_company_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "schools_codigoInterno_key" ON "schools"("codigoInterno");

-- CreateIndex
CREATE UNIQUE INDEX "schools_codigoInep_key" ON "schools"("codigoInep");

-- CreateIndex
CREATE INDEX "schools_status_idx" ON "schools"("status");

-- CreateIndex
CREATE INDEX "schools_cidade_estado_idx" ON "schools"("cidade", "estado");

-- CreateIndex
CREATE INDEX "schools_dependenciaAdministrativa_idx" ON "schools"("dependenciaAdministrativa");

-- CreateIndex
CREATE INDEX "schools_deletedAt_idx" ON "schools"("deletedAt");

-- CreateIndex
CREATE INDEX "school_access_points_schoolId_tipo_idx" ON "school_access_points"("schoolId", "tipo");

-- CreateIndex
CREATE INDEX "school_company_links_companyId_schoolId_desvinculadoEm_idx" ON "school_company_links"("companyId", "schoolId", "desvinculadoEm");

-- CreateIndex
CREATE INDEX "school_company_links_schoolId_desvinculadoEm_idx" ON "school_company_links"("schoolId", "desvinculadoEm");

-- CreateIndex
CREATE INDEX "audit_logs_entidadeTipo_entidadeId_createdAt_idx" ON "audit_logs"("entidadeTipo", "entidadeId", "createdAt");

-- AddForeignKey
ALTER TABLE "schools" ADD CONSTRAINT "schools_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_access_points" ADD CONSTRAINT "school_access_points_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_company_links" ADD CONSTRAINT "school_company_links_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_company_links" ADD CONSTRAINT "school_company_links_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_company_links" ADD CONSTRAINT "school_company_links_vinculadoPorId_fkey" FOREIGN KEY ("vinculadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "school_company_links" ADD CONSTRAINT "school_company_links_encerradoPorId_fkey" FOREIGN KEY ("encerradoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- Sequência de "School.codigoInterno" (ESC-000001, ESC-000002, ...) — Prisma
-- não tem `sequence` nativa no schema.prisma, então esta sequência é
-- criada manualmente aqui, mesma convenção de "hand-append" já usada
-- para as políticas de RLS abaixo. Consumida via `nextval(...)` em
-- `PrismaSchoolRepository.create()`.
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS "schools_codigo_interno_seq" START 1;

-- =============================================================================
-- Row-Level Security (Dossie 8, Secao 15.2)
--
-- IMPORTANTE — diferente de todo módulo anterior: "schools" e
-- "school_access_points" NÃO recebem RLS aqui, de propósito. São
-- catálogo compartilhado entre tenants (mesmo padrão de "plans" —
-- nenhuma política de RLS naquela tabela também), já que uma mesma
-- Escola física é atendida por múltiplas Empresas concorrentes — ver
-- nota de arquitetura em `School` no schema.prisma. Só
-- "school_company_links" (o vínculo PRIVADO de cada Empresa com uma
-- Escola) é, de fato, dado de tenant.
-- =============================================================================
ALTER TABLE "school_company_links" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "school_company_links" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "school_company_links"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');
