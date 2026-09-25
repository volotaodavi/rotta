-- Natureza do servico: quem PAGA pelo transporte (pedido do usuario
-- 25/09/2026: "faca a distincao, por favor. Nao quero mistura").
--
-- O SISTEMA TINHA UMA SO VERTENTE, E ERA A PRIVADA. Todo o modelo
-- assume que quem paga e o responsavel: `Contract` exige
-- `responsavelId` e `valorMensalidadeCentavos`, `RouteStudent` exige um
-- `contractId`, e a carteira credita a empresa pela mensalidade de cada
-- contrato ativo.
--
-- No transporte publico licitado nada disso acontece: quem paga e a
-- prefeitura, o responsavel nunca e cobrado, e nao ha mensalidade a
-- negociar. Ate agora esse caso era emulado com um contrato de valor
-- zero — funcionava mecanicamente e mentia em tres lugares: o painel da
-- empresa somava R$ 0 de receita para sempre, o termo prometia uma
-- "mensalidade a definir pela transportadora" que nunca viria, e nada
-- no banco dizia que aquela empresa era licitada.
--
-- POR QUE UM CAMPO EM `companies`, E NAO INFERIR DA AREA DE ATUACAO:
-- `company_service_areas` responde ONDE a empresa pode se credenciar.
-- Quem paga e outra pergunta. Uma transportadora privada que atende so
-- uma cidade tem cerca de municipio e continua sendo privada — inferir
-- "tem cerca, logo e licitada" transformaria uma escolha operacional
-- dela em desligamento da cobranca.
--
-- ADITIVO POR CONSTRUCAO: o default e `PRIVADO`, entao toda empresa que
-- ja existe continua com exatamente o comportamento de hoje. Nenhuma
-- linha existente muda de significado.

CREATE TYPE "ServiceNature" AS ENUM ('PRIVADO', 'PUBLICO_LICITADO');

ALTER TABLE "companies"
  ADD COLUMN "naturezaServico" "ServiceNature" NOT NULL DEFAULT 'PRIVADO';

-- Origem propria para o contrato publico, em vez de reaproveitar
-- `TERMO_CIENCIA_AUTOMATICO` com valor zero. Os dois dizem coisas
-- opostas ao responsavel: o termo de ciencia promete uma mensalidade
-- futura; o publico licitado afirma que nao ha nenhuma. Misturar os
-- dois e o que se esta desfazendo aqui.
ALTER TYPE "ContractOrigin" ADD VALUE IF NOT EXISTS 'PUBLICO_LICITADO';
