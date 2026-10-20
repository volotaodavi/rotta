-- Subconta Asaas por transportadora, split e custodia (conta escrow).
--
-- Decisoes do fundador em 20/10/2026:
--   1. Implementar os DOIS emissores de cobranca, com a chave por
--      transportadora, comecando sem custodia (que nao depende de
--      liberacao de ninguem) e virando a chave uma a uma quando o
--      comercial do Asaas liberar o white label.
--   2. Autorizada a guarda da chave de API de subconta de terceiro,
--      cifrada em repouso, nunca em log nem em resposta de API, com
--      auditoria em todo uso.
--   3. Taxa da Rotta por meio de pagamento, tabela do CFO de 18/10.
--
-- Tudo aditivo: nenhuma coluna sai, nenhuma linha muda. As colunas novas
-- ou aceitam nulo ou nascem com o valor que preserva o comportamento de
-- hoje (emissor ROTTA, custodia desligada, taxas em zero).

-- CreateEnum
CREATE TYPE "EmissorDaCobranca" AS ENUM ('ROTTA', 'SUBCONTA');

-- CreateEnum
CREATE TYPE "PagadorDaTarifaDeCustodia" AS ENUM ('CONTA_PRINCIPAL', 'SUBCONTA');

-- AlterEnum
ALTER TYPE "CompanyPaymentAccountStatus" ADD VALUE 'EM_ANALISE';

-- AlterTable
ALTER TABLE "company_payment_accounts" ADD COLUMN     "asaasAccountId" VARCHAR(64),
ADD COLUMN     "asaasApiKeyCifrada" TEXT,
ADD COLUMN     "asaasOnboardingUrl" TEXT,
ADD COLUMN     "custodiaAtiva" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "custodiaDiasParaLiberar" INTEGER,
ADD COLUMN     "custodiaTarifaPagaPor" "PagadorDaTarifaDeCustodia" NOT NULL DEFAULT 'CONTA_PRINCIPAL',
ADD COLUMN     "emissorDaCobranca" "EmissorDaCobranca" NOT NULL DEFAULT 'ROTTA',
ADD COLUMN     "taxaBoletoBps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "taxaCreditoParceladoBps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "taxaCreditoVistaBps" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "taxaPixBps" INTEGER NOT NULL DEFAULT 0;
