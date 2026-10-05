-- Atribuição de campanha no pagamento pré-cadastro (05/10/2026).
--
-- Guarda os sinais do navegador que iniciou o checkout para que a
-- compra, confirmada depois por webhook da Asaas, possa ser devolvida
-- ao Meta pela API de Conversões com a campanha correta. Nenhum campo
-- aqui é dado pessoal declarado: são identificadores que o próprio
-- Meta cria no navegador.
--
-- Todos nullable: quem chega por fora de anúncio, recusa os cookies ou
-- usa bloqueador simplesmente não tem esses valores, e a venda fica
-- sem atribuição em vez de ganhar uma atribuição inventada.
ALTER TABLE "PendingSubscription"
  ADD COLUMN "metaFbp" TEXT,
  ADD COLUMN "metaFbc" TEXT,
  ADD COLUMN "metaUserAgent" TEXT,
  ADD COLUMN "metaIp" TEXT,
  ADD COLUMN "metaPurchaseEm" TIMESTAMP(3);
