-- Pedido do usuário: "poderá gerar apenas um termo de ciência quando for
-- credenciar o transporte ao aluno? Para gerar a rota." — o credenciamento
-- pelo "código do transporte" (StudentCredentialedListener) já cria a
-- TransportRequest APROVADA automaticamente, mas nunca criava um Contract
-- — e RouteStudent.contractId exige um Contract de verdade, então o
-- aluno nunca podia ser posto numa Rota sem a Empresa negociar um
-- contrato comercial completo primeiro. `origem` marca quando o Contract
-- nasceu como esse "termo de ciência" automático (placeholder, sem
-- mensalidade/regras reais ainda) em vez do fluxo negociado de sempre.

-- CreateEnum
CREATE TYPE "ContractOrigin" AS ENUM ('NEGOCIADO', 'TERMO_CIENCIA_AUTOMATICO');

-- AlterTable
ALTER TABLE "contracts" ADD COLUMN "origem" "ContractOrigin" NOT NULL DEFAULT 'NEGOCIADO';
