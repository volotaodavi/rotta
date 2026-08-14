import { normalize } from "./school-duplicate.util";

/**
 * Busca tolerante a erro de digitação para o autocomplete de escola do
 * Responsável (pedido do usuário: "mesmo escrevendo errado... vai dar
 * uma sugestão de escola baseada no nome e localização"). A tabela
 * `schools` chega a ~200 mil linhas em escala nacional (Censo Escolar
 * completo, `InepSyncService`) — comparar a distância de edição contra
 * TODA a tabela em memória não escala. A estratégia em duas fases:
 *
 *  1. `SchoolRepository.searchCandidates` já filtra no banco por um
 *     conjunto AMPLO de candidatos (qualquer TOKEN da busca aparecendo
 *     como substring do nome — nunca a string inteira, que é o que
 *     falhava antes: "Esola" não é substring de "Escola").
 *  2. Este util REORDENA esses poucos candidatos (a `SEARCH_CANDIDATE_LIMIT`
 *     de `schools.service.ts`) por similaridade de verdade (distância de
 *     Levenshtein normalizada) e, se a localização aproximada do
 *     Responsável estiver disponível, por proximidade — nunca ambas
 *     escaneando a base inteira.
 *
 * `normalize` (acentos + caixa) vem de `school-duplicate.util.ts`, o
 * mesmo usado pela detecção de duplicatas — nunca duas normalizações de
 * texto divergentes convivendo no mesmo módulo. O que este arquivo
 * adiciona é a TOLERÂNCIA a erro de digitação em si: `nameSimilarity` de
 * `school-duplicate.util.ts` é Jaccard de tokens (exige token IDÊNTICO
 * em ambos os nomes — "esola" nunca bate com "escola"), suficiente pra
 * achar duplicata mas não pra sugerir com o nome digitado errado.
 *
 * Sem `pg_trgm` no Postgres (não confirmado disponível no Supabase da
 * Rotta neste momento — nenhuma extensão nova foi habilitada sem poder
 * validar contra o banco real): a tolerância a erro de digitação é toda
 * calculada aqui em JS, sobre o conjunto (pequeno) de candidatos já
 * filtrado pelo banco.
 */

/** Tokens com 2+ caracteres — descarta preposições curtas ("de", "da") que não ajudam a filtrar candidatos. */
export function tokenize(text: string): string[] {
  return normalize(text)
    .split(/\s+/)
    .filter((token) => token.length >= 2);
}

/** Distância de edição clássica (inserção/remoção/substituição), matriz O(n*m) — nomes de escola nunca são longos o bastante pra isso pesar. */
export function levenshteinDistance(a: string, b: string): number {
  const rows = a.length + 1;
  const cols = b.length + 1;
  const matrix: number[][] = Array.from({ length: rows }, () => new Array<number>(cols).fill(0));
  for (let i = 0; i < rows; i += 1) matrix[i]![0] = i;
  for (let j = 0; j < cols; j += 1) matrix[0]![j] = j;

  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const custo = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i]![j] = Math.min(
        matrix[i - 1]![j]! + 1,
        matrix[i]![j - 1]! + 1,
        matrix[i - 1]![j - 1]! + custo,
      );
    }
  }
  return matrix[rows - 1]![cols - 1]!;
}

/** 1 = igual, 0 = completamente diferente — normalizado pelo tamanho do maior texto (ambos já normalizados por quem chama). */
export function stringSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/**
 * Similaridade nome-a-nome tolerante a erro de digitação: melhor
 * casamento de CADA token da busca contra os tokens do nome candidato,
 * com bônus por substring exata — assim "esola municip joao" ainda
 * pontua alto contra "Escola Municipal João da Silva" mesmo com token
 * faltando/errado.
 */
export function fuzzyNameSimilarity(query: string, candidateName: string): number {
  const queryTokens = tokenize(query);
  const candidateTokens = tokenize(candidateName);
  if (queryTokens.length === 0 || candidateTokens.length === 0) return 0;

  const scores = queryTokens.map((queryToken) => {
    const melhor = Math.max(
      ...candidateTokens.map((candidateToken) => {
        const substringBonus =
          candidateToken.includes(queryToken) || queryToken.includes(candidateToken) ? 0.15 : 0;
        return Math.min(1, stringSimilarity(queryToken, candidateToken) + substringBonus);
      }),
    );
    return melhor;
  });
  return scores.reduce((sum, score) => sum + score, 0) / scores.length;
}

/**
 * Score de proximidade 0-1 (1 = mesma coordenada, decai suavemente com
 * a distância) — nunca um corte rígido: uma escola um pouco mais longe
 * mas com nome muito mais parecido ainda pode vencer no `combinedScore`
 * abaixo. `raioDecaimentoKm` = distância na qual o score cai pela
 * metade (padrão 5 km, ajustável por quem chama).
 */
export function proximityScore(distanciaKm: number, raioDecaimentoKm = 5): number {
  return raioDecaimentoKm / (raioDecaimentoKm + Math.max(0, distanciaKm));
}

/**
 * Score final de uma sugestão — nome pesa mais que localização (uma
 * escola com nome bem diferente não deveria aparecer só por estar perto),
 * mas localização desempata e ajuda a priorizar entre nomes parecidos
 * (ex.: duas escolas "Municipal Dom Pedro" em cidades diferentes).
 */
export function combinedScore(nomeScore: number, proximidadeScore: number | null): number {
  if (proximidadeScore === null) return nomeScore;
  return nomeScore * 0.75 + proximidadeScore * 0.25;
}
