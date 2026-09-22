-- Portal da Escola (pedido do usuario 22/09/2026: "criar a categoria de
-- escolas, que ai vao poder ver quais alunos irao nos onibus e se eles
-- ja foram, para maior controle").
--
-- Duas colunas, as duas OPCIONAIS e sem default — nenhuma linha
-- existente precisa ser tocada, e nada muda de comportamento para quem
-- ja usa o sistema. Seguro de aplicar com a API no ar.
--
-- Por que `users.escolaId` e nao um `Membership`: uma escola NAO
-- pertence a uma transportadora. `schools` nao tem `companyId`
-- justamente porque a mesma escola costuma ser atendida por varias
-- transportadoras ao mesmo tempo — no transporte publico isso e a
-- regra. O escopo desta conta e a ESCOLA, e e por `escolaId` que o
-- portal filtra tudo.
--
-- `ON DELETE SET NULL` em `users`: apagar a escola nao pode apagar a
-- pessoa; ela so deixa de enxergar o portal.
-- `ON DELETE CASCADE` em `invites`: convite para uma escola que nao
-- existe mais nao serve para nada e nao deve poder ser resgatado.

ALTER TABLE "users" ADD COLUMN "escolaId" UUID;

ALTER TABLE "users"
  ADD CONSTRAINT "users_escolaId_fkey"
  FOREIGN KEY ("escolaId") REFERENCES "schools"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "invites" ADD COLUMN "schoolId" UUID;

ALTER TABLE "invites"
  ADD CONSTRAINT "invites_schoolId_fkey"
  FOREIGN KEY ("schoolId") REFERENCES "schools"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- Indice em `users.escolaId`: toda consulta do portal comeca por "quem
-- e esta pessoa e qual escola ela enxerga".
CREATE INDEX "users_escolaId_idx" ON "users"("escolaId");
