-- CreateEnum
CREATE TYPE "RouteStatus" AS ENUM ('ATIVA', 'PAUSADA');

-- CreateEnum
CREATE TYPE "RouteWeekday" AS ENUM ('SEGUNDA', 'TERCA', 'QUARTA', 'QUINTA', 'SEXTA', 'SABADO', 'DOMINGO');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('EM_ANDAMENTO', 'FINALIZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TripStudentEventType" AS ENUM ('EMBARCOU', 'AUSENTE', 'DESEMBARCOU');

-- NOTA: o `prisma migrate dev` gerado automaticamente propunha
-- `DROP INDEX "schools_ponto_geografico_gist_idx"` aqui — um artefato
-- conhecido do Prisma com colunas `Unsupported("geography...")`
-- (`School.pontoGeografico`): o índice foi criado via SQL raw numa
-- migration anterior (Rotta Geo Platform), e o Prisma não consegue
-- "ver" esse índice ao computar o diff, então acha que deveria
-- removê-lo a cada nova migration. Removido deliberadamente da
-- migration real (não é uma mudança do módulo Rotas/GPS e apagaria um
-- índice espacial legítimo em produção).

-- AlterTable — cast seguro em vez de DROP+ADD (o `prisma migrate dev`
-- propunha derrubar a coluna e recriá-la vazia, o que apagaria
-- qualquer "viagemAtualId" já gravado por `PATCH /vehicles/:id/location`
-- em produção; nenhuma escrita real usa Trips ainda, mas um cast
-- explícito é sempre mais seguro que um drop silencioso).
ALTER TABLE "vehicles" ALTER COLUMN "viagemAtualId" TYPE UUID USING "viagemAtualId"::uuid;

-- CreateTable
CREATE TABLE "routes" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "nome" TEXT NOT NULL,
    "turno" "SchoolShift" NOT NULL,
    "diasSemana" "RouteWeekday"[],
    "status" "RouteStatus" NOT NULL DEFAULT 'PAUSADA',
    "veiculoPadraoId" UUID,
    "motoristaPadraoId" UUID,
    "monitorPadraoId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "routes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_stops" (
    "id" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "ordem" INTEGER NOT NULL,
    "endereco" TEXT NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "horarioPrevisto" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_stops_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "route_students" (
    "id" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "paradaEmbarqueId" UUID NOT NULL,
    "paradaDesembarqueId" UUID NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "route_students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "routeId" UUID NOT NULL,
    "data" DATE NOT NULL,
    "status" "TripStatus" NOT NULL DEFAULT 'EM_ANDAMENTO',
    "veiculoId" UUID NOT NULL,
    "motoristaId" UUID NOT NULL,
    "monitorId" UUID,
    "iniciadaEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finalizadaEm" TIMESTAMP(3),
    "canceladaEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_positions" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "precisaoMetros" DECIMAL(6,2),
    "velocidadeKmh" DECIMAL(5,2),
    "capturadaEm" TIMESTAMP(3) NOT NULL,
    "simuladoSuspeito" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_positions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_student_events" (
    "id" UUID NOT NULL,
    "tripId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "routeStopId" UUID NOT NULL,
    "tipo" "TripStudentEventType" NOT NULL,
    "motivoAusencia" TEXT,
    "processadoPorId" UUID NOT NULL,
    "processadoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_student_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "routes_companyId_status_idx" ON "routes"("companyId", "status");

-- CreateIndex
CREATE INDEX "routes_companyId_deletedAt_idx" ON "routes"("companyId", "deletedAt");

-- CreateIndex
CREATE INDEX "route_stops_companyId_idx" ON "route_stops"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "route_stops_routeId_ordem_key" ON "route_stops"("routeId", "ordem");

-- CreateIndex
CREATE UNIQUE INDEX "route_students_contractId_key" ON "route_students"("contractId");

-- CreateIndex
CREATE INDEX "route_students_companyId_idx" ON "route_students"("companyId");

-- CreateIndex
CREATE INDEX "route_students_studentId_ativo_idx" ON "route_students"("studentId", "ativo");

-- CreateIndex
CREATE INDEX "trips_companyId_status_idx" ON "trips"("companyId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "trips_routeId_data_key" ON "trips"("routeId", "data");

-- CreateIndex
CREATE INDEX "trip_positions_tripId_capturadaEm_idx" ON "trip_positions"("tripId", "capturadaEm");

-- CreateIndex
CREATE INDEX "trip_positions_companyId_idx" ON "trip_positions"("companyId");

-- CreateIndex
CREATE INDEX "trip_student_events_tripId_idx" ON "trip_student_events"("tripId");

-- CreateIndex
CREATE INDEX "trip_student_events_studentId_idx" ON "trip_student_events"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_student_events_tripId_studentId_tipo_key" ON "trip_student_events"("tripId", "studentId", "tipo");

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_viagemAtualId_fkey" FOREIGN KEY ("viagemAtualId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_veiculoPadraoId_fkey" FOREIGN KEY ("veiculoPadraoId") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_motoristaPadraoId_fkey" FOREIGN KEY ("motoristaPadraoId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routes" ADD CONSTRAINT "routes_monitorPadraoId_fkey" FOREIGN KEY ("monitorPadraoId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_students" ADD CONSTRAINT "route_students_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_students" ADD CONSTRAINT "route_students_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_students" ADD CONSTRAINT "route_students_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_students" ADD CONSTRAINT "route_students_paradaEmbarqueId_fkey" FOREIGN KEY ("paradaEmbarqueId") REFERENCES "route_stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "route_students" ADD CONSTRAINT "route_students_paradaDesembarqueId_fkey" FOREIGN KEY ("paradaDesembarqueId") REFERENCES "route_stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_routeId_fkey" FOREIGN KEY ("routeId") REFERENCES "routes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_veiculoId_fkey" FOREIGN KEY ("veiculoId") REFERENCES "vehicles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_motoristaId_fkey" FOREIGN KEY ("motoristaId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_monitorId_fkey" FOREIGN KEY ("monitorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_positions" ADD CONSTRAINT "trip_positions_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_student_events" ADD CONSTRAINT "trip_student_events_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_student_events" ADD CONSTRAINT "trip_student_events_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_student_events" ADD CONSTRAINT "trip_student_events_routeStopId_fkey" FOREIGN KEY ("routeStopId") REFERENCES "route_stops"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_student_events" ADD CONSTRAINT "trip_student_events_processadoPorId_fkey" FOREIGN KEY ("processadoPorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- RLS por "companyId" (mesmo mecanismo de "vehicles"/"schools" — ver
-- comentário em "vehicles_module").
ALTER TABLE "routes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "routes" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "routes"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "route_stops" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "route_stops" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "route_stops"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "route_students" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "route_students" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "route_students"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "trips" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trips" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "trips"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "trip_positions" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trip_positions" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "trip_positions"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "trip_student_events" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "trip_student_events" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "trip_student_events"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');
