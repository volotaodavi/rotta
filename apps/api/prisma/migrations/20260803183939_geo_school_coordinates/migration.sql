-- Rotta Geo Platform (Dossie 8, Secao 22): a extensao PostGIS (usada
-- pelo indice espacial GiST do Map Intelligence Agent, mais adiante)
-- NAO e habilitada por uma migration comum: `CREATE EXTENSION` exige
-- privilegio SUPERUSER, atributo que a role de conexao da aplicacao
-- nunca pode ter (quebraria a FORCE ROW LEVEL SECURITY do isolamento
-- multi-tenant — ver o comentario na migration
-- `20260801220502_init_companies_users_audit`). A extensao e
-- provisionada uma unica vez, fora do fluxo de migrations do Prisma,
-- por quem administra o banco (`CREATE EXTENSION IF NOT EXISTS
-- postgis;` como superuser) — a imagem `postgis/postgis` usada em
-- `docker-compose.yml`/CI ja faz isso automaticamente na criacao do
-- banco.

-- CreateEnum
CREATE TYPE "SchoolCoordinateStatus" AS ENUM ('PENDENTE', 'VALIDADO', 'REPROCESSAR', 'REVISAO_MANUAL');

-- CreateEnum
CREATE TYPE "SchoolCoordinateSource" AS ENUM ('MAPBOX', 'MANUAL');

-- CreateTable
CREATE TABLE "school_coordinates" (
    "id" UUID NOT NULL,
    "schoolId" UUID NOT NULL,
    "latitude" DECIMAL(9,6) NOT NULL,
    "longitude" DECIMAL(9,6) NOT NULL,
    "precisao" TEXT,
    "fonte" "SchoolCoordinateSource" NOT NULL DEFAULT 'MAPBOX',
    "status" "SchoolCoordinateStatus" NOT NULL DEFAULT 'PENDENTE',
    "tentativa" INTEGER NOT NULL DEFAULT 1,
    "validadoPorIa" BOOLEAN NOT NULL DEFAULT false,
    "motivoRevisao" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "school_coordinates_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "school_coordinates_schoolId_status_idx" ON "school_coordinates"("schoolId", "status");

-- CreateIndex
CREATE INDEX "school_coordinates_status_idx" ON "school_coordinates"("status");

-- AddForeignKey
ALTER TABLE "school_coordinates" ADD CONSTRAINT "school_coordinates_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE CASCADE ON UPDATE CASCADE;
