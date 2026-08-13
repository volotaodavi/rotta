-- =============================================================================
-- Frente M — codigo unico da transportadora (briefing "Marketplace"
-- "SOLICITAR TRANSPORTE"): um Responsavel que ja sabe qual empresa quer
-- contratar informa esse codigo em vez de precisar buscar por
-- proximidade/escola. Mesmo padrao de "schools_codigo_interno_seq"
-- (Dossie Escolas) - sequencia Postgres consumida via nextval(...) em
-- PrismaCompanyRepository.create().
-- =============================================================================
CREATE SEQUENCE IF NOT EXISTS "companies_codigo_interno_seq" START 1;

-- Coluna adicionada opcional primeiro (tabela ja tem linhas em producao) -
-- backfill abaixo, so depois vira NOT NULL + UNIQUE.
ALTER TABLE "companies" ADD COLUMN "codigoInterno" TEXT;

-- Backfill: cada empresa ja existente recebe um codigo novo, na ordem de
-- criacao (createdAt) - nunca reaproveita id/cpfCnpj, mesma logica que
-- PrismaCompanyRepository.create() vai usar dai em diante para empresas
-- novas.
UPDATE "companies"
SET "codigoInterno" = 'TRN-' || LPAD(nextval('companies_codigo_interno_seq')::text, 6, '0')
WHERE "codigoInterno" IS NULL;

ALTER TABLE "companies" ALTER COLUMN "codigoInterno" SET NOT NULL;

CREATE UNIQUE INDEX "companies_codigoInterno_key" ON "companies"("codigoInterno");
