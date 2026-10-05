-- Régua de cobrança do financeiro (05/10/2026).
--
-- Guarda quando a última cobrança saiu para cada empresa, para o mesmo
-- aviso não ser enviado duas vezes. Uma régua que repete vira spam, e
-- spam de cobrança é o jeito mais rápido de perder um cliente que só
-- esqueceu de pagar.
--
-- A tabela é `companies`: o model tem @@map. Isto é exatamente o erro
-- que travou o deploy de 05/10/2026 com P3009, e por isso o nome aqui
-- foi conferido no schema antes de escrever, não deduzido do model.
ALTER TABLE "companies"
  ADD COLUMN IF NOT EXISTS "ultimaCobrancaEm" TIMESTAMP(3);
