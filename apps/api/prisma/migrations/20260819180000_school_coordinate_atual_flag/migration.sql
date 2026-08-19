-- Achado real em produção investigando a Fila de Revisão Manual (pedido
-- do usuário: "investigue e faça as IAs trabalharem"). `school_coordinates`
-- é um log append-only (cada nova tentativa grava uma linha nova, nunca
-- sobrescreve a anterior), mas nenhuma linha antiga era desativada quando
-- uma tentativa melhor a sucedia — `GET /geo/revisao-manual` devolvia
-- toda linha que já passou por REVISAO_MANUAL algum dia, inclusive
-- escolas já resolvidas depois, fila só crescendo, nunca esvaziando.

-- AlterTable
ALTER TABLE "school_coordinates" ADD COLUMN "atual" BOOLEAN NOT NULL DEFAULT true;

-- Backfill: o DEFAULT true acima marca TODA linha existente como atual,
-- inclusive tentativas antigas já superadas por uma linha mais nova da
-- mesma escola (histórico anterior a esta coluna existir nunca desligava
-- a anterior). Corrige pra só a linha mais recente por escola ficar
-- atual — mesmo critério que `PrismaSchoolCoordinateRepository.create`
-- passa a aplicar dali em diante em toda nova tentativa.
UPDATE "school_coordinates" sc
SET "atual" = false
WHERE sc."id" NOT IN (
  SELECT DISTINCT ON ("schoolId") "id"
  FROM "school_coordinates"
  ORDER BY "schoolId", "createdAt" DESC
);

-- DropIndex (substituído por um índice composto — a única consulta por
-- `status` agora sempre filtra junto por `atual`)
DROP INDEX "school_coordinates_status_idx";

-- CreateIndex
CREATE INDEX "school_coordinates_status_atual_idx" ON "school_coordinates"("status", "atual");
