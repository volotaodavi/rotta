-- Cobranca da familia: a mensalidade que o Responsavel paga a
-- TRANSPORTADORA, e para onde esse dinheiro vai.
--
-- POR QUE ISTO EXISTE
--
-- A tela de Pagamentos do responsavel existe no app desde 16/10/2026 e
-- nao mostra fatura nenhuma, porque nao havia onde guardar fatura: o
-- unico fluxo de dinheiro no banco era a Rotta cobrando a
-- transportadora pela plataforma (`pending_subscriptions`,
-- `companies.asaasSubscriptionId`). Este e o outro fluxo, com pagador,
-- recebedor e ciclo diferentes.
--
-- DUAS TABELAS, E POR QUE DUAS
--
--   contract_invoices
--     Uma linha por contrato por mes de competencia. O `@@unique`
--     (contractId, competencia) e o que torna a geracao mensal
--     idempotente: rodar o job duas vezes no mesmo mes nao cria fatura
--     dobrada para familia nenhuma. O valor e congelado na emissao --
--     reajuste de contrato nunca muda uma fatura ja emitida, que e o que
--     permite a familia conferir o que pagou.
--
--   company_payment_accounts
--     Para onde vai o dinheiro. Separado de `companies` porque
--     `companies` ja carrega os campos Asaas do OUTRO fluxo: dois
--     `asaasCustomerId` na mesma tabela, com significados opostos, e um
--     erro esperando acontecer. `asaasWalletId` e a peca que falta (a
--     subconta do transportador, pendente do comercial da Asaas): com
--     ela, a cobranca sai com split e o dinheiro cai direto na conta do
--     transportador; sem ela, cai na conta da Rotta e e creditado no
--     Rotta Pay dele, que e como funciona hoje.
--
-- RLS: as duas tem politica por companyId, a mesma de `routes`/`trips`.
-- A fatura e da transportadora; o responsavel chega nela por um caminho
-- com posse (comeca no proprio filho), nunca por tenant.

-- CreateEnum
CREATE TYPE "ContractInvoiceStatus" AS ENUM ('A_VENCER', 'PAGA', 'VENCIDA', 'CANCELADA', 'ESTORNADA');

-- CreateEnum
CREATE TYPE "InvoicePaymentMethod" AS ENUM ('PIX', 'BOLETO', 'CARTAO_CREDITO', 'CARTAO_DEBITO');

-- CreateEnum
CREATE TYPE "CompanyPaymentAccountStatus" AS ENUM ('PENDENTE', 'ATIVA', 'RECUSADA');

-- AlterTable
ALTER TABLE "wallet_transactions" ADD COLUMN     "contractInvoiceId" UUID;

-- CreateTable
CREATE TABLE "contract_invoices" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "contractId" UUID NOT NULL,
    "studentId" UUID NOT NULL,
    "responsavelId" UUID NOT NULL,
    "competencia" DATE NOT NULL,
    "vencimento" DATE NOT NULL,
    "valorCentavos" INTEGER NOT NULL,
    "status" "ContractInvoiceStatus" NOT NULL DEFAULT 'A_VENCER',
    "asaasPaymentId" VARCHAR(64),
    "asaasCustomerId" VARCHAR(64),
    "meioDePagamento" "InvoicePaymentMethod",
    "linkDaFatura" TEXT,
    "linhaDigitavel" TEXT,
    "pagoEm" TIMESTAMP(3),
    "valorPagoCentavos" INTEGER,
    "taxaDoProvedorCentavos" INTEGER,
    "repasseCentavos" INTEGER,
    "repasseDiretoAoTransportador" BOOLEAN NOT NULL DEFAULT false,
    "canceladaEm" TIMESTAMP(3),
    "motivoCancelamento" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_payment_accounts" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "status" "CompanyPaymentAccountStatus" NOT NULL DEFAULT 'PENDENTE',
    "asaasWalletId" VARCHAR(64),
    "chavePix" TEXT,
    "taxaDaPlataformaBps" INTEGER NOT NULL DEFAULT 0,
    "observacoes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_payment_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "contract_invoices_asaasPaymentId_key" ON "contract_invoices"("asaasPaymentId");

-- CreateIndex
CREATE INDEX "contract_invoices_companyId_status_vencimento_idx" ON "contract_invoices"("companyId", "status", "vencimento");

-- CreateIndex
CREATE INDEX "contract_invoices_responsavelId_status_idx" ON "contract_invoices"("responsavelId", "status");

-- CreateIndex
CREATE INDEX "contract_invoices_studentId_competencia_idx" ON "contract_invoices"("studentId", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "contract_invoices_contractId_competencia_key" ON "contract_invoices"("contractId", "competencia");

-- CreateIndex
CREATE UNIQUE INDEX "company_payment_accounts_companyId_key" ON "company_payment_accounts"("companyId");

-- AddForeignKey
ALTER TABLE "wallet_transactions" ADD CONSTRAINT "wallet_transactions_contractInvoiceId_fkey" FOREIGN KEY ("contractInvoiceId") REFERENCES "contract_invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_invoices" ADD CONSTRAINT "contract_invoices_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_invoices" ADD CONSTRAINT "contract_invoices_contractId_fkey" FOREIGN KEY ("contractId") REFERENCES "contracts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_invoices" ADD CONSTRAINT "contract_invoices_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_invoices" ADD CONSTRAINT "contract_invoices_responsavelId_fkey" FOREIGN KEY ("responsavelId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_payment_accounts" ADD CONSTRAINT "company_payment_accounts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- RLS por companyId, mesma politica (e mesma clausula de bypass) de
-- `routes`/`trips`/`wallets`.
ALTER TABLE "contract_invoices" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contract_invoices" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "contract_invoices"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');

ALTER TABLE "company_payment_accounts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "company_payment_accounts" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "company_payment_accounts"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');
