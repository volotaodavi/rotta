-- Numero do onibus + credenciamento do rastreador (pedido do usuario
-- 22/09/2026: "os onibus serao cadastrados atraves da numeracao do
-- onibus... ai o despachante vai credenciar atraves disso" +
-- "o credenciamento inicial (configuracao do rastreador) devera partir
-- daqui + admin").
--
-- Tres colunas opcionais. Nenhuma linha existente e tocada, nenhum
-- comportamento muda para a frota ja cadastrada. Segura com a API no ar.

-- Numero de frota: e ESTE numero que todo mundo usa no transporte
-- publico ("o 412 quebrou"). Placa ninguem decora.
ALTER TABLE "vehicles" ADD COLUMN "numeroFrota" TEXT;

-- IMEI do rastreador: e o que o aparelho manda no primeiro pacote, e e
-- por ele que a posicao recebida vira "onibus 412".
ALTER TABLE "vehicles" ADD COLUMN "rastreadorImei" TEXT;
ALTER TABLE "vehicles" ADD COLUMN "rastreadorVinculadoEm" TIMESTAMP(3);

-- Unico DENTRO da empresa: duas transportadoras podem ter, cada uma, o
-- seu "412". `NULL` nao colide com `NULL` no Postgres, entao a frota
-- privada (que nao usa numeracao) segue sem restricao nenhuma.
CREATE UNIQUE INDEX "vehicles_companyId_numeroFrota_key"
  ON "vehicles"("companyId", "numeroFrota");

-- IMEI e unico GLOBAL: o mesmo aparelho nao pode estar em dois onibus.
CREATE UNIQUE INDEX "vehicles_rastreadorImei_key"
  ON "vehicles"("rastreadorImei");
