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
--
-- O nome da tabela é `pending_subscriptions`, não `PendingSubscription`:
-- o model tem `@@map`. A primeira versão desta migração usou o nome do
-- model, falhou em produção com "relation does not exist" e travou todo
-- deploy seguinte com P3009 (o Prisma se recusa a seguir enquanto
-- houver migração marcada como falha). `IF NOT EXISTS` em cada coluna
-- para a migração poder ser reaplicada sem conflito depois do
-- `migrate resolve`.
ALTER TABLE "pending_subscriptions"
  ADD COLUMN IF NOT EXISTS "metaFbp" TEXT,
  ADD COLUMN IF NOT EXISTS "metaFbc" TEXT,
  ADD COLUMN IF NOT EXISTS "metaUserAgent" TEXT,
  ADD COLUMN IF NOT EXISTS "metaIp" TEXT,
  ADD COLUMN IF NOT EXISTS "metaPurchaseEm" TIMESTAMP(3);
