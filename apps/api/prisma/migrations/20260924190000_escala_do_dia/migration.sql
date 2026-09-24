-- Escala do dia (pedido do usuario 24/09/2026: "a cada dia que for
-- trabalhar, o despachante podera designar os veiculos para rotas... se
-- quiser colocar motorista rotativo ou trocar sempre de rota, tambem
-- podera").
--
-- Tabela nova, nada existente e tocado. Segura com a API no ar.
--
-- POR QUE UMA TABELA, E NAO UM `TripStatus.AGENDADA`: `Trip` e o
-- registro do que ACONTECEU — tem codigo, hora de inicio, posicoes,
-- eventos de embarque. Uma viagem "agendada" seria uma Trip sem nada
-- disso, e cada consulta que hoje lista viagens teria de aprender a
-- ignora-la; sao dezenas de lugares, cada um uma chance de esquecer e
-- mostrar ao responsavel uma viagem que nunca saiu.
--
-- A escala e uma INTENCAO e vive antes da viagem existir. Quando a
-- ignicao liga, a escala vira uma Trip de verdade.

CREATE TABLE "route_assignments" (
  "id" UUID NOT NULL,
  "companyId" UUID NOT NULL,
  "routeId" UUID NOT NULL,
  "data" DATE NOT NULL,
  "veiculoId" UUID NOT NULL,
  "motoristaId" UUID NOT NULL,
  "monitorId" UUID,
  "observacao" TEXT,
  "criadoPorId" UUID,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "route_assignments_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "route_assignments"
  ADD CONSTRAINT "route_assignments_companyId_fkey"
  FOREIGN KEY ("companyId") REFERENCES "companies"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "route_assignments"
  ADD CONSTRAINT "route_assignments_routeId_fkey"
  FOREIGN KEY ("routeId") REFERENCES "routes"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- RESTRICT no veiculo e no motorista: apagar um onibus ou uma pessoa
-- que esta escalada para amanha tem de falhar alto, nunca sumir com a
-- escala em silencio e deixar a rota sem ninguem no dia.
ALTER TABLE "route_assignments"
  ADD CONSTRAINT "route_assignments_veiculoId_fkey"
  FOREIGN KEY ("veiculoId") REFERENCES "vehicles"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "route_assignments"
  ADD CONSTRAINT "route_assignments_motoristaId_fkey"
  FOREIGN KEY ("motoristaId") REFERENCES "users"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- Monitor e opcional na operacao, entao SET NULL: a escala continua
-- valendo sem ele.
ALTER TABLE "route_assignments"
  ADD CONSTRAINT "route_assignments_monitorId_fkey"
  FOREIGN KEY ("monitorId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "route_assignments"
  ADD CONSTRAINT "route_assignments_criadoPorId_fkey"
  FOREIGN KEY ("criadoPorId") REFERENCES "users"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Uma escala por rota por dia. Regravar a mesma rota no mesmo dia e
-- EDITAR a escala, nunca criar uma segunda — e assim que o despachante
-- troca o motorista de ultima hora.
CREATE UNIQUE INDEX "route_assignments_routeId_data_key"
  ON "route_assignments"("routeId", "data");

-- A consulta do rastreador: "que escala este onibus tem hoje?". NAO e
-- unique: o mesmo onibus faz a rota da manha e a da tarde.
CREATE INDEX "route_assignments_companyId_data_veiculoId_idx"
  ON "route_assignments"("companyId", "data", "veiculoId");

-- "Qual a minha escala de amanha?", do lado do motorista.
CREATE INDEX "route_assignments_motoristaId_data_idx"
  ON "route_assignments"("motoristaId", "data");

-- RLS por companyId, MESMA politica de `routes`/`trips` — inclusive a
-- clausula de bypass, que e o que permite o modulo de rastreadores ler
-- a escala sem ator (quem fala la e um aparelho, e o tenant so e
-- descoberto depois de achar o onibus pelo IMEI).
ALTER TABLE "route_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "route_assignments" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "route_assignments"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');
