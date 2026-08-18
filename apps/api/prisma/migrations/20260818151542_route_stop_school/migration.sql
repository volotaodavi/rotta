-- Vínculo opcional de uma parada de rota com uma Escola do catálogo
-- compartilhado (pedido do usuário: "quando for criar uma rota, deverá
-- ser mediante a escola que foi importada, não deverá colocar o
-- endereço de fato"). Opcional e `SET NULL` porque uma parada de
-- embarque/desembarque na residência do aluno continua sendo endereço
-- livre — só a parada "na escola" referencia uma; `endereco`/
-- `latitude`/`longitude` continuam preenchidos (agora a partir da
-- própria School quando `schoolId` está presente), nunca removidos.

ALTER TABLE "route_stops" ADD COLUMN "schoolId" UUID;

CREATE INDEX "route_stops_schoolId_idx" ON "route_stops"("schoolId");

ALTER TABLE "route_stops" ADD CONSTRAINT "route_stops_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;
