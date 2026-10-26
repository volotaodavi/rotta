-- O split da mensalidade da familia sai do Asaas e passa para a Lytex.
--
-- Decisao do fundador em 23/10/2026, depois da comparacao de cinco
-- provedoras registrada em `empresa/financeiro/`. O que decidiu:
--
--  1. Subconta SEM guardar chave de terceiro. A Lytex emite a cobranca
--     em nome da subconta pelo header `subRecipientId`, com a credencial
--     da propria plataforma. No desenho do Asaas, custodia exigia
--     guardar a chave de API da subconta aqui dentro, cifrada e
--     auditada: era o ponto mais delicado daquele desenho.
--  2. Split liberado sem periodo de avaliacao regulatoria com teto por
--     subconta.
--  3. Retencao real (`floatConfig`), confirmada pelo suporte em
--     22/10/2026: boleto D+2, Pix D+0.
--
-- O Asaas CONTINUA cobrando a assinatura da propria Rotta das
-- transportadoras. Esta migration nao toca em nada daquele fluxo.
--
-- As colunas `asaas*` do fluxo da familia ficam onde estao, e isso e
-- escolha, nao esquecimento: nenhuma subconta, cobranca de familia ou
-- assinatura de familia chegou a existir no Asaas em producao, entao
-- elas estao todas vazias. Deixa-las vazias e reversivel; apaga-las nao
-- e. A limpeza entra depois de a primeira transportadora estar rodando
-- na Lytex, com o banco confirmando que seguem vazias.

-- AlterTable: a subconta do transportador na Lytex
ALTER TABLE "company_payment_accounts"
    ADD COLUMN "lytexSubAccountId" VARCHAR(64),
    ADD COLUMN "lytexRecipientId" VARCHAR(64),
    ADD COLUMN "lytexSplitLiberado" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable: a cobranca da mensalidade e o cliente que paga
ALTER TABLE "contract_invoices"
    ADD COLUMN "lytexInvoiceId" VARCHAR(64),
    ADD COLUMN "lytexClientId" VARCHAR(64);

-- AlterTable: a recorrencia do contrato
ALTER TABLE "contracts"
    ADD COLUMN "lytexSubscriptionId" VARCHAR(64),
    ADD COLUMN "lytexSubscriptionStatus" VARCHAR(32);

-- CreateIndex: uma cobranca da Lytex pertence a uma fatura so. E esta
-- restricao que impede duas faturas apontarem para a mesma cobranca
-- quando o webhook reentrega fora de ordem.
CREATE UNIQUE INDEX "contract_invoices_lytexInvoiceId_key" ON "contract_invoices"("lytexInvoiceId");

-- CreateIndex: e esta que impede a segunda recorrencia no mesmo
-- contrato, que cobraria a familia duas vezes no mesmo mes.
CREATE UNIQUE INDEX "contracts_lytexSubscriptionId_key" ON "contracts"("lytexSubscriptionId");

-- CreateTable: idempotencia do webhook da Lytex.
--
-- Mesma ideia da tabela do Asaas, com uma diferenca que vale registrar:
-- a Lytex nao publica o esquema do corpo do webhook (nao ha `x-webhooks`
-- no OpenAPI dela, nem em sandbox nem em producao), entao nao ha
-- garantia de que venha um id de evento. Quando nao vem, a chave e o id
-- da fatura somado ao status (`<_id>:<status>`), que e o par que de fato
-- muda alguma coisa aqui dentro.
--
-- Sem RLS de proposito: nao e dado de transportadora nenhuma, e o
-- registro de entrega de um provedor para a plataforma. Quem le e o
-- proprio webhook, que nao tem ator nem tenant.
CREATE TABLE "lytex_webhook_events" (
    "id" VARCHAR(128) NOT NULL,
    "evento" VARCHAR(64) NOT NULL,
    "recursoId" VARCHAR(64),
    "processadoEm" TIMESTAMP(3),
    "recebidoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lytex_webhook_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "lytex_webhook_events_evento_recebidoEm_idx" ON "lytex_webhook_events"("evento", "recebidoEm");

-- CreateIndex
CREATE INDEX "lytex_webhook_events_recursoId_idx" ON "lytex_webhook_events"("recursoId");
