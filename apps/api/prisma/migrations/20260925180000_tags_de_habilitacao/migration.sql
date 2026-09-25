-- Tags de habilitacao da transportadora — pedido do usuario
-- (25/09/2026): "empresa licitada devera ter uma tag, para ter as
-- funcionalidades que somente a empresa licitada deve ter... toda e
-- qualquer empresa pode ter as duas tags, ai fica com todas as
-- funcionalidades existentes".
--
-- TAG, E NAO CLASSIFICACAO. Sao acumulativas, e essa e a regra inteira:
-- a mesma transportadora pode atender o contrato da prefeitura pela
-- manha e familias particulares a tarde. Um campo de valor unico
-- obrigaria a escolher uma das duas e, na pratica, obrigaria a cadastrar
-- a mesma empresa duas vezes — duas frotas, duas equipes, dois codigos,
-- para um carro que e o mesmo.
--
-- Por isso a coluna e um ARRAY. Ter as duas tags e um caso normal, nao
-- uma excecao: significa simplesmente acesso a tudo.
--
-- O QUE ESTA COLUNA NAO E: nao tem relacao com dinheiro. Quem paga a
-- Rotta e sempre a transportadora, nas duas tags, e a estrutura de
-- receita e a RottaPay, que o usuario vai desenhar. Aqui a tag habilita
-- FUNCIONALIDADE, nada mais.
--
-- ADITIVO POR CONSTRUCAO: o default e ARRAY['PRIVADA'], que e o que
-- toda empresa cadastrada ate hoje e — ela se inscreveu sozinha e
-- atende familias. Nenhuma linha existente muda de comportamento.
--
-- NADA E BLOQUEADO POR ESTA MIGRATION. Ela so cria a marcacao; quais
-- telas e endpoints passam a depender de qual tag e decisao do usuario,
-- e entra depois.

CREATE TYPE "ServiceTag" AS ENUM ('LICITADA', 'PRIVADA');

ALTER TABLE "companies"
  ADD COLUMN "tags" "ServiceTag"[] NOT NULL DEFAULT ARRAY['PRIVADA']::"ServiceTag"[];
