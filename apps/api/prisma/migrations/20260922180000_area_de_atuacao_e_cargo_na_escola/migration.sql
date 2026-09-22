-- Transporte PUBLICO — vertente cadastrada pelo Admin da Rotta
-- (pedido do usuario 22/09/2026: "irei cadastrar a transportadora e
-- colocar em qual municipio ela atuara ou quais escolas ela atuara...
-- ai a transportadora so podera se credenciar nas escolas daquele
-- municipio" + "para os diretores, coordenadores e ajudantes nas
-- escolas poderem acessar").
--
-- Esta migration e ADITIVA em todos os sentidos: uma coluna opcional,
-- um enum novo e uma tabela nova. Nenhuma linha existente e tocada e
-- nenhum comportamento atual muda — uma empresa SEM area de atuacao
-- continua podendo se credenciar em qualquer escola, exatamente como
-- hoje. Seguro de aplicar com a API no ar.

-- 1. Cargo dentro da escola. Existe por uma razao de AUTORIZACAO: so
--    DIRETOR abre acesso para os colegas da propria escola. Enum
--    fechado de proposito — decisao de autorizacao nunca deve depender
--    de texto livre digitado por alguem.
CREATE TYPE "SchoolStaffRole" AS ENUM ('DIRETOR', 'COORDENADOR', 'AJUDANTE');

ALTER TABLE "users" ADD COLUMN "escolaPapel" "SchoolStaffRole";

-- 2. Area de atuacao da transportadora. Cada linha e UMA das duas
--    formas: um municipio inteiro (cidade+estado) ou uma escola
--    especifica (schoolId). O "exatamente um dos dois" e validado no
--    servico; aqui fica o CHECK que impede o estado impossivel chegar
--    ao banco por qualquer outro caminho.
CREATE TABLE "company_service_areas" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "cidade" TEXT,
  "estado" TEXT,
  "schoolId" UUID,
  "dependencias" "SchoolAdministrativeDependency"[] DEFAULT ARRAY[]::"SchoolAdministrativeDependency"[],
  "criadoPorId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "company_service_areas_pkey" PRIMARY KEY ("id"),

  -- Ou municipio (cidade E estado), ou escola — nunca os dois, nunca
  -- nenhum. Uma linha sem nenhum dos dois seria uma cerca que nao cerca
  -- nada, e uma com os dois seria ambigua sobre qual vale.
  CONSTRAINT "company_service_areas_alvo_unico" CHECK (
    ("cidade" IS NOT NULL AND "estado" IS NOT NULL AND "schoolId" IS NULL)
    OR
    ("cidade" IS NULL AND "estado" IS NULL AND "schoolId" IS NOT NULL)
  )
);

ALTER TABLE "company_service_areas"
  ADD CONSTRAINT "company_service_areas_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "company_service_areas"
  ADD CONSTRAINT "company_service_areas_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "schools"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Apagar o Admin que cadastrou nao pode apagar a area de atuacao de uma
-- transportadora em operacao: SET NULL, mesma convencao de
-- `schools.criadoPorId`.
ALTER TABLE "company_service_areas"
  ADD CONSTRAINT "company_service_areas_criadoPorId_fkey"
  FOREIGN KEY ("criadoPorId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "company_service_areas_companyId_idx" ON "company_service_areas"("companyId");
CREATE INDEX "company_service_areas_cidade_estado_idx" ON "company_service_areas"("cidade", "estado");
CREATE INDEX "company_service_areas_schoolId_idx" ON "company_service_areas"("schoolId");

-- RLS: esta tabela e escrita SO pelo Admin da Rotta e lida pelo guard
-- de credenciamento (`SchoolsService.linkCompany`), que roda com o
-- `companyId` ja resolvido. Nao entra na politica por tenant porque a
-- leitura precisa responder "esta empresa pode entrar nesta escola?"
-- antes de existir vinculo nenhum entre as duas — a mesma razao pela
-- qual `schools` tambem fica fora.
