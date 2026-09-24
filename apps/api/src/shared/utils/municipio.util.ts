/**
 * Normalização de nome de município — o par TypeScript da coluna
 * gerada `schools.cidade_normalizada`.
 *
 * ## Por que existe
 *
 * "Maricá" digitado por uma pessoa tem de casar com "MARICA" vindo da
 * planilha do INEP. O Postgres só faria isso sozinho com a extensão
 * `unaccent`, que além de exigir instalação no banco é `STABLE` (não
 * `IMMUTABLE`) — ou seja, não pode entrar numa coluna gerada nem num
 * índice. Por isso a migration `20260924210000_municipio_indexado` usa
 * `translate(lower(...))`, que é imutável, e esta função reproduz
 * exatamente o mesmo resultado do lado da aplicação.
 *
 * ## O contrato que não pode quebrar
 *
 * `normalizarMunicipio(x)` em TypeScript e `cidade_normalizada` no
 * Postgres precisam devolver a MESMA string para o mesmo `x`. Se
 * divergirem, o `where` indexado não acha nada e o Admin vê "0 escolas
 * encontradas" num município cheio de escolas — o pior tipo de bug,
 * porque parece dado faltando e não código errado.
 *
 * A decomposição NFD + remoção de diacríticos daqui e o `translate` de
 * lá concordam em todos os acentos do português (á à â ã ä é è ê ë í ì
 * î ï ó ò ô õ ö ú ù û ü ç ñ). O teste
 * `municipio.util.spec.ts` guarda essa tabela.
 */
export function normalizarMunicipio(valor: string | null | undefined): string {
  if (!valor) return "";
  return valor.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}
