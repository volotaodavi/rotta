-- CreateEnum
CREATE TYPE "CompanyType" AS ENUM ('AUTONOMO', 'MEI', 'LTDA', 'SLU', 'EIRELI', 'OUTRO');

-- CreateEnum
CREATE TYPE "CompanyStatus" AS ENUM ('TRIAL', 'ATIVO', 'SUSPENSO', 'CANCELADO', 'INADIMPLENTE');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ATIVO', 'INATIVO');

-- CreateEnum
CREATE TYPE "MembershipStatus" AS ENUM ('ATIVO', 'SUSPENSO', 'REMOVIDO');

-- CreateTable
CREATE TABLE "plans" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "priceCents" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "companies" (
    "id" UUID NOT NULL,
    "razaoSocial" TEXT NOT NULL,
    "nomeFantasia" TEXT NOT NULL,
    "cpfCnpj" TEXT NOT NULL,
    "tipo" "CompanyType" NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "cep" TEXT NOT NULL,
    "endereco" TEXT NOT NULL,
    "numero" TEXT NOT NULL,
    "complemento" TEXT,
    "bairro" TEXT NOT NULL,
    "cidade" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "latitude" DECIMAL(9,6),
    "longitude" DECIMAL(9,6),
    "logoUrl" TEXT,
    "fotoUrl" TEXT,
    "corPrimaria" TEXT NOT NULL DEFAULT '#3B6EF6',
    "idioma" TEXT NOT NULL DEFAULT 'pt-BR',
    "fusoHorario" TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    "status" "CompanyStatus" NOT NULL DEFAULT 'TRIAL',
    "planId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_settings" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "chave" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefone" TEXT NOT NULL,
    "cpf" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "status" "UserStatus" NOT NULL DEFAULT 'ATIVO',
    "avatarUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "role" TEXT NOT NULL,
    "status" "MembershipStatus" NOT NULL DEFAULT 'ATIVO',
    "convidadoPorId" UUID,
    "iniciadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "encerradoEm" TIMESTAMP(3),

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "entidadeTipo" TEXT NOT NULL,
    "entidadeId" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "atorUserId" UUID,
    "dadosAntes" JSONB,
    "dadosDepois" JSONB,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "plans_code_key" ON "plans"("code");

-- CreateIndex
CREATE UNIQUE INDEX "companies_cpfCnpj_key" ON "companies"("cpfCnpj");

-- CreateIndex
CREATE INDEX "companies_status_idx" ON "companies"("status");

-- CreateIndex
CREATE INDEX "companies_tipo_idx" ON "companies"("tipo");

-- CreateIndex
CREATE INDEX "companies_deletedAt_idx" ON "companies"("deletedAt");

-- CreateIndex
CREATE UNIQUE INDEX "company_settings_companyId_chave_key" ON "company_settings"("companyId", "chave");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_telefone_key" ON "users"("telefone");

-- CreateIndex
CREATE UNIQUE INDEX "users_cpf_key" ON "users"("cpf");

-- CreateIndex
CREATE INDEX "memberships_companyId_role_status_idx" ON "memberships"("companyId", "role", "status");

-- CreateIndex
CREATE INDEX "memberships_userId_status_idx" ON "memberships"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "memberships_userId_companyId_role_key" ON "memberships"("userId", "companyId", "role");

-- CreateIndex
CREATE INDEX "audit_logs_companyId_entidadeTipo_entidadeId_createdAt_idx" ON "audit_logs"("companyId", "entidadeTipo", "entidadeId", "createdAt");

-- AddForeignKey
ALTER TABLE "companies" ADD CONSTRAINT "companies_planId_fkey" FOREIGN KEY ("planId") REFERENCES "plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_settings" ADD CONSTRAINT "company_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_atorUserId_fkey" FOREIGN KEY ("atorUserId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- =============================================================================
-- Row-Level Security (Dossie 8, Secao 1.2 e Dossie 12, Secao 6.3)
--
-- Defesa em profundidade: mesmo que a camada de aplicacao esqueca de
-- filtrar por tenant em uma query, o proprio Postgres recusa a operacao.
-- `app.tenant_id` e `app.bypass_rls` sao variaveis de sessao setadas
-- exclusivamente pelo `TenantGuard` no inicio de cada requisicao
-- (`PrismaService.setTenantContext`/`setAdminBypassContext`) — nunca por
-- valor vindo do cliente.
--
-- `app.bypass_rls = 'on'` so e setado quando o papel do usuario
-- autenticado e `admin_rotta` (Administrador Rotta nao pertence a nenhum
-- tenant — Dossie 8, Secao 2 — logo precisa enxergar todas as empresas).
-- `FORCE ROW LEVEL SECURITY` garante que a policy vale ate para o dono
-- das tabelas (o role de conexao da aplicacao), unico jeito de a RLS ter
-- efeito real quando a mesma role cria e consulta as tabelas; apenas um
-- role com atributo SUPERUSER escaparia disso, e a role de conexao da
-- aplicacao nunca deve ter esse atributo (ver `docs/08`, Secao 1.2, e o
-- README de operacao deste pacote).
--
-- `users` e `plans` NAO tem RLS: `User` e identidade global, sem
-- tenant_id proprio (Dossie 8, Secao 2); `Plan` e catalogo publico
-- compartilhado por todos os tenants.
-- =============================================================================

ALTER TABLE "companies" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "companies" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "companies"
  USING ("id"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("id"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "company_settings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_settings" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "company_settings"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "memberships"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "audit_logs"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');
