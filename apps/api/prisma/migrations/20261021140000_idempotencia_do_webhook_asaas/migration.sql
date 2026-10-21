-- Idempotencia do webhook do Asaas pelo `id` do evento.
--
-- A documentacao deles diz que a entrega e **at least once** e recomenda
-- guardar o `id` do evento com restricao de unicidade, respondendo 200
-- so depois de persistir. Sem isso, um evento reentregue passa de novo
-- por todo o processamento.
--
-- O risco que isso fecha nao e so o de processar duas vezes. A fila de
-- uma configuracao de webhook e **interrompida apos 15 falhas
-- consecutivas**, e so HTTP 200 conta como entrega (201, 204, 3xx, 4xx,
-- 5xx, timeout e falha de conexao sao falha). Enquanto pausada, os
-- eventos continuam sendo gerados e guardados, mas nada e entregue -- e
-- evento guardado por mais de 14 dias e APAGADO para sempre. A fila e
-- uma so: um defeito num caminho pausaria tambem a confirmacao de
-- pagamento da assinatura da propria Rotta.
--
-- Sem RLS de proposito: nao e dado de transportadora nenhuma, e o
-- registro de entrega de um provedor para a plataforma. Quem le e o
-- proprio webhook, que nao tem ator nem tenant.

-- CreateTable
CREATE TABLE "asaas_webhook_events" (
    "id" VARCHAR(128) NOT NULL,
    "evento" VARCHAR(64) NOT NULL,
    "recursoId" VARCHAR(64),
    "processadoEm" TIMESTAMP(3),
    "recebidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "asaas_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "asaas_webhook_events_evento_recebidoEm_idx" ON "asaas_webhook_events"("evento", "recebidoEm");

-- CreateIndex
CREATE INDEX "asaas_webhook_events_recursoId_idx" ON "asaas_webhook_events"("recursoId");
