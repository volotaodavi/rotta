-- CreateEnum
CREATE TYPE "StudentSex" AS ENUM ('MASCULINO', 'FEMININO', 'OUTRO');

-- CreateEnum
CREATE TYPE "TransportRequestStatus" AS ENUM ('RECEBIDA', 'EM_ANALISE', 'APROVADA', 'RECUSADA');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('AGUARDANDO_ASSINATURA', 'ATIVO', 'ENCERRADO');

-- CreateEnum
CREATE TYPE "RatingTargetType" AS ENUM ('MOTORISTA', 'EMPRESA', 'MONITOR', 'VEICULO');

-- CreateTable
CREATE TABLE "students" (
    "id" UUID NOT NULL,
    "responsavelId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "fotoUrl" TEXT,
    "dataNascimento" DATE NOT NULL,
    "sexo" "StudentSex" NOT NULL,
    "schoolId" UUID NOT NULL,
    "turno" "SchoolShift" NOT NULL,
    "embarqueCep" TEXT NOT NULL,
    "embarqueLogradouro" TEXT NOT NULL,
    "embarqueNumero" TEXT NOT NULL,
    "embarqueComplemento" TEXT,
    "embarqueBairro" TEXT NOT NULL,
    "embarqueCidade" TEXT NOT NULL,
    "embarqueEstado" TEXT NOT NULL,
    "embarqueLatitude" DECIMAL(9,6),
    "embarqueLongitude" DECIMAL(9,6),
    "desembarqueCep" TEXT NOT NULL,
    "desembarqueLogradouro" TEXT NOT NULL,
    "desembarqueNumero" TEXT NOT NULL,
    "desembarqueComplemento" TEXT,
    "desembarqueBairro" TEXT NOT NULL,
    "desembarqueCidade" TEXT NOT NULL,
    "desembarqueEstado" TEXT NOT NULL,
    "desembarqueLatitude" DECIMAL(9,6),
    "desembarqueLongitude" DECIMAL(9,6),
    "necessidadesEspeciais" TEXT,
    "medicamentos" TEXT,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_authorized_persons" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "telefone" TEXT,
    "parentesco" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_authorized_persons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transport_requests" (
    "id" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "responsavelId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "turno" "SchoolShift" NOT NULL,
    "status" "TransportRequestStatus" NOT NULL DEFAULT 'RECEBIDA',
    "motivoRecusa" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "transport_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contracts" (
    "id" UUID NOT NULL,
    "transportRequestId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "responsavelId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "vehicleId" UUID,
    "motoristaId" UUID,
    "monitorId" UUID,
    "valorMensalidadeCentavos" INTEGER NOT NULL,
    "planoDescricao" TEXT NOT NULL,
    "regras" TEXT NOT NULL,
    "vigenciaInicio" DATE NOT NULL,
    "vigenciaFim" DATE,
    "status" "ContractStatus" NOT NULL DEFAULT 'AGUARDANDO_ASSINATURA',
    "authentiqueDocumentId" TEXT,
    "assinadoResponsavelEm" TIMESTAMP(3),
    "assinadoEmpresaEm" TIMESTAMP(3),
    "ativadoEm" TIMESTAMP(3),
    "encerradoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ratings" (
    "id" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "responsavelId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "alvoTipo" "RatingTargetType" NOT NULL,
    "alvoId" UUID NOT NULL,
    "nota" INTEGER NOT NULL,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ratings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "students_responsavelId_deletedAt_idx" ON "students"("responsavelId", "deletedAt");

-- CreateIndex
CREATE INDEX "students_schoolId_idx" ON "students"("schoolId");

-- CreateIndex
CREATE INDEX "student_authorized_persons_studentId_idx" ON "student_authorized_persons"("studentId");

-- CreateIndex
CREATE INDEX "transport_requests_companyId_status_idx" ON "transport_requests"("companyId", "status");

-- CreateIndex
CREATE INDEX "transport_requests_responsavelId_idx" ON "transport_requests"("responsavelId");

-- CreateIndex
CREATE INDEX "transport_requests_studentId_idx" ON "transport_requests"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "contracts_transportRequestId_key" ON "contracts"("transportRequestId");

-- CreateIndex
CREATE INDEX "contracts_companyId_status_idx" ON "contracts"("companyId", "status");

-- CreateIndex
CREATE INDEX "contracts_responsavelId_idx" ON "contracts"("responsavelId");

-- CreateIndex
CREATE INDEX "contracts_studentId_idx" ON "contracts"("studentId");

-- CreateIndex
CREATE INDEX "ratings_companyId_idx" ON "ratings"("companyId");

-- CreateIndex
CREATE INDEX "ratings_alvoTipo_alvoId_idx" ON "ratings"("alvoTipo", "alvoId");

-- CreateIndex
CREATE UNIQUE INDEX "ratings_contractId_responsavelId_alvoTipo_alvoId_key" ON "ratings"("contractId", "responsavelId", "alvoTipo", "alvoId");

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_authorized_persons" ADD CONSTRAINT "student_authorized_persons_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_requests" ADD CONSTRAINT "transport_requests_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_requests" ADD CONSTRAINT "transport_requests_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_requests" ADD CONSTRAINT "transport_requests_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transport_requests" ADD CONSTRAINT "transport_requests_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_transportRequestId_fkey" FOREIGN KEY ("transportRequestId") REFERENCES "transport_requests"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_vehicleId_fkey" FOREIGN KEY ("vehicleId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ratings" ADD CONSTRAINT "ratings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- Row-Level Security (Dossie 8, Secao 15.2)
--
-- IMPORTANTE — "students" e "student_authorized_persons" NÃO recebem
-- RLS aqui, de propósito, mesmo padrão de "schools"/"school_access_points":
-- o Aluno pertence ao Responsável (User global), não a uma Empresa/tenant
-- — ver nota de arquitetura em `Student` no schema.prisma. Já
-- "transport_requests", "contracts" e "ratings" SÃO dado de tenant de
-- verdade (a intenção/relação comercial de UMA empresa específica com
-- um aluno), então recebem RLS por "companyId", mesma convenção de
-- "school_company_links"/"vehicles". O Responsável acessa as próprias
-- linhas nessas 3 tabelas via bypass explícito filtrado por
-- "responsavelId" na camada de aplicação (nunca uma policy de RLS por
-- responsavelId — ver nota em `TransportRequest` no schema.prisma).
-- =============================================================================
ALTER TABLE "transport_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "transport_requests" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "transport_requests"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "contracts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contracts" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "contracts"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "ratings" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ratings" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "ratings"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');
