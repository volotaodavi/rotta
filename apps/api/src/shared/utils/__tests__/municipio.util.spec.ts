import { normalizarMunicipio } from "../municipio.util";

/**
 * O contrato entre o TypeScript e o Postgres.
 *
 * `normalizarMunicipio()` aqui e a coluna gerada `cidadeNormalizada`
 * lá (migration `20260924210000_municipio_indexado`, que usa
 * `translate(lower(btrim(...)))`) TÊM de devolver a mesma string para a
 * mesma entrada. Se divergirem, o `where` indexado não acha nada e o
 * Admin vê "0 escolas encontradas" num município cheio de escolas — o
 * pior tipo de bug, porque parece dado faltando e não código errado.
 *
 * A tabela abaixo é a lista dos 24 diacríticos que o `translate` da
 * migration cobre, na mesma ordem. Mexeu num lado, mexe no outro.
 */
describe("normalizarMunicipio concorda com a coluna gerada do Postgres", () => {
  const casos: [entrada: string, esperado: string][] = [
    // O caso que motivou tudo: o Admin digita com acento, a planilha do
    // INEP gravou sem, em caixa alta.
    ["Maricá", "marica"],
    ["MARICA", "marica"],
    ["  Maricá  ", "marica"],

    // Os cinco "a", que é onde mais dói (São, Santana, Açu, Ubá).
    ["São Paulo", "sao paulo"],
    ["Santana do Livramento", "santana do livramento"],
    ["Açu", "acu"],

    ["Vitória", "vitoria"],
    ["Niterói", "niteroi"],
    ["Poções", "pocoes"],
    ["Ubá", "uba"],
    ["Ipuã", "ipua"],
    ["Icó", "ico"],
    ["Juçara", "jucara"],
    ["Muriaé", "muriae"],
    ["Três Corações", "tres coracoes"],
    ["Ibirité", "ibirite"],
    ["Guaíba", "guaiba"],
    ["Piauí", "piaui"],
    ["Iúna", "iuna"],
  ];

  it.each(casos)("%s → %s", (entrada, esperado) => {
    expect(normalizarMunicipio(entrada)).toBe(esperado);
  });

  it("nulo e vazio viram string vazia, nunca 'null'", () => {
    // Uma string "null" no `where` acharia zero escolas em silêncio.
    expect(normalizarMunicipio(null)).toBe("");
    expect(normalizarMunicipio(undefined)).toBe("");
    expect(normalizarMunicipio("   ")).toBe("");
  });

  it("é idempotente — normalizar o já normalizado não muda nada", () => {
    // Importa porque o valor volta do banco já normalizado e às vezes
    // passa pela função de novo (fallback do `listMunicipios`).
    const umaVez = normalizarMunicipio("Maricá");
    expect(normalizarMunicipio(umaVez)).toBe(umaVez);
  });
});
