-- Rotta Geo Engine deixa de usar o Mapbox (Geocoding/Directions API) e
-- passa a usar OpenStreetMap (Nominatim para geocodificacao, OSRM para
-- rotas) — ver `GeoEngineService`. O enum `SchoolCoordinateSource`
-- refletia o provedor (`MAPBOX`), entao o valor precisa acompanhar a
-- troca para continuar honesto sobre a proveniencia de cada tentativa
-- de geocodificacao.
--
-- `ALTER TYPE ... RENAME VALUE` (Postgres 10+) e a unica forma segura:
-- preserva todas as linhas ja gravadas com `fonte = 'MAPBOX'` (viram
-- `'NOMINATIM'` automaticamente, sem precisar de um UPDATE em massa) e
-- nao exige recriar o tipo/tabela. O Prisma nao gera isso sozinho (o
-- diff dele trata renomear um valor de enum como remover+adicionar, o
-- que quebraria linhas existentes) — migration escrita a mao.
ALTER TYPE "SchoolCoordinateSource" RENAME VALUE 'MAPBOX' TO 'NOMINATIM';

-- O default da coluna precisa ser atualizado separadamente: o Postgres
-- nao propaga o rename de um valor de enum para o DEFAULT de uma
-- coluna que já usava o valor antigo.
ALTER TABLE "school_coordinates" ALTER COLUMN "fonte" SET DEFAULT 'NOMINATIM';
