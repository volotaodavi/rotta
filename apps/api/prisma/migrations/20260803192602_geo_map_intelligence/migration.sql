-- Map Intelligence Agent (Rotta Geo Platform, briefing "AGENTES DE IA"
-- — agente 4/5): índice espacial GiST sobre um ponto PostGIS derivado
-- de `School.latitude`/`longitude`, para os marcadores do mapa
-- responderem por bounding box/raio em escala nacional sem um
-- `Haversine` calculado linha a linha em memória (ver
-- `marketplace/geo.util.ts`, que já documentava essa migração futura).
--
-- `CREATE EXTENSION IF NOT EXISTS postgis` é seguro aqui porque a
-- extensão já existe no banco desta aplicação (provisionada uma única
-- vez fora do fluxo de migrations, ver comentário na migration
-- `20260803183939_geo_school_coordinates`, ou automaticamente pela
-- imagem `postgis/postgis` em `docker-compose.yml`/CI): quando a
-- extensão já existe, o Postgres nem chega a checar o privilégio
-- SUPERUSER — só falharia se a extensão realmente precisasse ser
-- criada agora, o que nunca deve acontecer via migration da aplicação.
CREATE EXTENSION IF NOT EXISTS postgis;

-- AlterTable
ALTER TABLE "schools" ADD COLUMN "pontoGeografico" geography(Point, 4326);

-- Backfill: escolas que já tinham latitude/longitude antes desta migration.
UPDATE "schools"
SET "pontoGeografico" = ST_SetSRID(ST_MakePoint(longitude::double precision, latitude::double precision), 4326)::geography
WHERE latitude IS NOT NULL AND longitude IS NOT NULL;

-- `pontoGeografico` nunca é gravado pela aplicação (campo `Unsupported`
-- no Prisma Client) — este trigger é a ÚNICA fonte de verdade que o
-- mantém sincronizado com `latitude`/`longitude`, inclusive para
-- escritas em lote/SQL direto que não passem pelo `SchoolRepository`.
CREATE OR REPLACE FUNCTION schools_sync_ponto_geografico() RETURNS trigger AS $$
BEGIN
  IF NEW.latitude IS NOT NULL AND NEW.longitude IS NOT NULL THEN
    NEW."pontoGeografico" := ST_SetSRID(ST_MakePoint(NEW.longitude::double precision, NEW.latitude::double precision), 4326)::geography;
  ELSE
    NEW."pontoGeografico" := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER schools_ponto_geografico_sync
BEFORE INSERT OR UPDATE OF latitude, longitude ON "schools"
FOR EACH ROW EXECUTE FUNCTION schools_sync_ponto_geografico();

-- CreateIndex
CREATE INDEX "schools_ponto_geografico_gist_idx" ON "schools" USING GIST ("pontoGeografico");
