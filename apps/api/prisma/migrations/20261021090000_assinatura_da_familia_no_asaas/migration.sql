-- A mensalidade da familia passa a poder ser uma ASSINATURA no Asaas.
--
-- Pedido do fundador em 21/10/2026: o transportador (ou o Admin Rotta
-- ajudando) cria a cobranca dos responsaveis que ja estao cadastrados na
-- Rotta, e o responsavel NAO precisa de conta -- ele paga por link.
--
-- Por que a assinatura mora no CONTRATO:
--   Um contrato e uma recorrencia (um aluno, um responsavel, um valor
--   mensal). A fatura e o documento de um mes. A coluna unica aqui e o
--   que impede a segunda assinatura para a mesma familia, que cobraria
--   em dobro e nao daria para desfazer do lado do pagador.
--
-- O que NAO muda:
--   A geracao mensal de faturas da propria Rotta continua existindo e
--   continua sendo o caminho que funciona sem a Asaas configurada. A
--   assinatura e aditiva: contrato sem `asaasSubscriptionId` segue
--   exatamente como hoje.
--
-- Tudo aditivo: nenhuma coluna sai, nenhuma linha muda, as tres novas
-- aceitam nulo.

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN     "asaasSubscriptionId" VARCHAR(64),
ADD COLUMN     "asaasSubscriptionStatus" VARCHAR(32),
ADD COLUMN     "assinaturaCriadaEm" TIMESTAMP(3);

-- CreateIndex
CREATE UNIQUE INDEX "contracts_asaasSubscriptionId_key" ON "contracts"("asaasSubscriptionId");
