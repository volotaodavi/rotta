-- Liga o checklist de veiculo a viagem, e corrige o nome de quem preenche.
--
-- POR QUE ISTO EXISTE
--
--   vehicle_checklists.viagem_id
--     Era um texto solto, sem chave estrangeira, de quando o modulo de
--     viagens ainda nao existia (o proprio comentario do schema dizia
--     isso). Sem a ligacao nao havia como responder a pergunta que o
--     app precisa fazer: "qual e o checklist DESTA viagem?". E sem essa
--     resposta nao existe a regra pedida -- a cada viagem finalizada o
--     checklist volta a zero e a viagem anterior fica como informativo.
--     Virando chave estrangeira de verdade, "voltar a zero" deixa de
--     ser uma limpeza e passa a ser consequencia: acabou a viagem
--     ativa, acabou o checklist atual.
--
--   vehicle_checklists.motorista_id -> preenchido_por_id
--     A coluna aceitava somente MOTORISTA porque so o motorista podia
--     chamar o endpoint. O monitor tambem confere o veiculo antes de
--     sair, e gravar o monitor numa coluna chamada motorista_id seria
--     registrar o papel errado no historico que depois e mostrado ao
--     responsavel.
--
-- SEGURANCA DOS DADOS
--
-- A conversao de viagem_id (text) para uuid com FK e feita em duas
-- etapas e NUNCA apaga uma linha de checklist: o valor antigo que nao
-- aponta para uma viagem existente vira NULL, que e exatamente o que
-- ele significava (referencia a nada). O checklist em si fica.

-- 1. Renomeia a coluna de autor, o indice e a constraint.
ALTER TABLE "vehicle_checklists" RENAME COLUMN "motoristaId" TO "preenchidoPorId";

DROP INDEX IF EXISTS "vehicle_checklists_companyId_motoristaId_idx";
CREATE INDEX "vehicle_checklists_companyId_preenchidoPorId_idx"
  ON "vehicle_checklists" ("companyId", "preenchidoPorId");

ALTER TABLE "vehicle_checklists"
  RENAME CONSTRAINT "vehicle_checklists_motoristaId_fkey"
  TO "vehicle_checklists_preenchidoPorId_fkey";

-- 2. viagemId (text, sem FK) -> tripId (uuid, com FK).
--
-- O valor so sobrevive se for um uuid valido E apontar para uma viagem
-- que existe. Qualquer outra coisa vira NULL -- nunca derruba a linha.
ALTER TABLE "vehicle_checklists" ADD COLUMN "tripId" UUID;

UPDATE "vehicle_checklists" AS vc
   SET "tripId" = t."id"
  FROM "trips" AS t
 WHERE vc."viagemId" IS NOT NULL
   AND vc."viagemId" ~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
   AND t."id" = vc."viagemId"::uuid;

ALTER TABLE "vehicle_checklists" DROP COLUMN "viagemId";

ALTER TABLE "vehicle_checklists"
  ADD CONSTRAINT "vehicle_checklists_tripId_fkey"
  FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "vehicle_checklists_tripId_idx" ON "vehicle_checklists" ("tripId");
