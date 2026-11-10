-- Integração com o SETE (FNDE) — `docs/52-integracao-sete.md`.
--
-- Dois grupos de campos que o SETE exige e a Rotta não tinha. Nenhum
-- campo é obrigatório sem default, então a migração roda num banco com
-- dados sem pedir backfill.

-- 1. Origem do veículo na frota (`sete_veiculos.origem`: 1 Próprio,
--    2 Terceirizado). Opcional de propósito: nulo é "ninguém informou
--    ainda" e vira pendência na exportação — um default mentiria.
CREATE TYPE "VehicleOwnership" AS ENUM ('PROPRIO_MUNICIPIO', 'TERCEIRIZADO');

ALTER TABLE "vehicles" ADD COLUMN "origemFrota" "VehicleOwnership";

-- 2. Condições de acesso de zona rural da rota (`sete_rotas.da_porteira`
--    e irmãos). O PNATE é programa de área rural (Lei 10.880/2004,
--    art. 2º), e o SETE pergunta se a rota atravessa porteira,
--    mata-burro, colchete, atoleiro ou ponte rústica.
--
--    `false` é o mesmo default do SETE, que grava `char(1)` 'N'.
ALTER TABLE "routes" ADD COLUMN "acessoPorteira"     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "routes" ADD COLUMN "acessoMataBurro"    BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "routes" ADD COLUMN "acessoColchete"     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "routes" ADD COLUMN "acessoAtoleiro"     BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "routes" ADD COLUMN "acessoPonteRustica" BOOLEAN NOT NULL DEFAULT false;
