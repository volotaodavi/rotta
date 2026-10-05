-- Destrava uma migração que falhou SEM ter aplicado nada.
--
-- ## O problema
--
-- Quando uma migração falha, o Prisma deixa a linha dela em
-- `_prisma_migrations` com `finished_at` nulo, e a partir daí recusa
-- TODA migração nova com P3009 — inclusive as que não têm relação
-- nenhuma com a que quebrou. Um deploy fica travado até alguém rodar
-- `prisma migrate resolve` à mão, num shell com acesso ao banco.
--
-- Aconteceu em 05/10/2026: a migração de atribuição de campanha usou o
-- nome do model (`PendingSubscription`) em vez do nome da tabela
-- (`pending_subscriptions`, por causa do `@@map`). O shell do Render é
-- recurso pago e não estava disponível, então o destravamento precisava
-- caber no próprio boot.
--
-- ## Por que isto é seguro
--
-- `applied_steps_count = 0` é a guarda inteira, e ela é o ponto todo.
-- Esse contador sobe a cada instrução aplicada com sucesso: zero
-- significa que a PRIMEIRA instrução falhou e o banco não foi tocado.
-- Reverter o registro de algo que nunca aconteceu é só limpar o
-- cadastro, e a migração corrigida reaplica do zero no mesmo boot.
--
-- Uma migração com `applied_steps_count > 0` é outra história: parte do
-- SQL entrou, o banco está num estado intermediário que só uma pessoa
-- olhando sabe interpretar, e adivinhar aí seria pior que o deploy
-- travado. Essas este arquivo não toca de propósito: o P3009 continua,
-- e continua certo.
UPDATE "_prisma_migrations"
SET rolled_back_at = NOW()
WHERE finished_at IS NULL
  AND rolled_back_at IS NULL
  AND applied_steps_count = 0;
