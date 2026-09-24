-- Municipio indexado (pedido do usuario 24/09/2026: "quando selecionar
-- o municipio (qualquer um) ele vai buscar todas as escolas ja
-- existentes no app. Sao mais de 100 mil, nao e possivel que o sistema
-- nao aguenta").
--
-- O usuario esta certo, e o codigo anterior estava errado:
-- `credenciarMunicipio` carregava TODAS as escolas da UF em memoria e
-- comparava o nome do municipio em JavaScript. Em SP isso e ~50 mil
-- linhas por clique. O motivo era real (precisava ignorar acento:
-- "Marica" da planilha do INEP tem de casar com "Marica" digitado),
-- mas a solucao era a errada.
--
-- POR QUE NAO `unaccent`: a extensao existe, mas `unaccent()` e
-- STABLE, nao IMMUTABLE (depende de um dicionario que pode mudar). O
-- Postgres recusa funcao STABLE em coluna gerada e em indice. Ou seja,
-- `unaccent` resolveria a comparacao e NAO resolveria o indice — que e
-- exatamente o problema aqui.
--
-- POR QUE `translate(lower(...))`: `lower` e `translate` sao as duas
-- IMMUTABLE, entao a coluna pode ser GERADA e o indice pode existir.
-- Cobre os 24 diacriticos do portugues, que e todo o alfabeto que
-- aparece em nome de municipio brasileiro.
--
-- POR QUE COLUNA GERADA, E NAO MANTIDA PELA APLICACAO: uma coluna que
-- a aplicacao preenche depende de TODO caminho de escrita lembrar de
-- preenche-la (cadastro manual, importacao de planilha, sync do INEP,
-- correcao pontual). Um esquecimento nao da erro — so faz o municipio
-- sumir da busca, que e indistinguivel de "a planilha nao tinha essa
-- escola". Coluna gerada nao pode ser esquecida: o proprio banco
-- recalcula a cada mudanca em `cidade`.
--
-- CUSTO DE APLICAR: adicionar coluna STORED reescreve a tabela com
-- lock exclusivo. Em 100 mil linhas sao poucos segundos; o catalogo de
-- escolas nao esta em caminho critico de viagem em andamento.

ALTER TABLE "schools"
  ADD COLUMN "cidadeNormalizada" TEXT
  GENERATED ALWAYS AS (
    translate(
      lower(btrim("cidade")),
      'áàâãäéèêëíìîïóòôõöúùûüçñ',
      'aaaaaeeeeiiiiooooouuuucn'
    )
  ) STORED;

-- O indice que sustenta "credenciar o municipio inteiro". `estado`
-- primeiro porque nunca se busca municipio sem UF — ha "Bom Jesus" em
-- nove estados diferentes.
CREATE INDEX "schools_estado_cidadeNormalizada_idx"
  ON "schools" ("estado", "cidadeNormalizada");
