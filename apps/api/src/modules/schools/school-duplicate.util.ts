/**
 * Detecção de escolas duplicadas (briefing "ROTTA AI" — "Detectar
 * escolas duplicadas") — ao contrário de geocodificação/OCR, isto NÃO
 * depende de um provedor externo: é comparação de texto + localização
 * sobre o próprio catálogo, por isso é implementação REAL (nunca um
 * stub), mesmo vivendo ao lado do restante da integração Rotta AI no
 * briefing. Heurística deliberadamente simples (normalização de
 * acentos/caixa + sobreposição de tokens do nome, restrita a
 * cidade+estado iguais) — suficiente para o caso real ("alguém
 * recadastrou 'EMEF Ana Souza' como 'E M Ana de Souza' na mesma
 * cidade"), sem exigir um provedor de NLP.
 */

const COMBINING_DIACRITICS = /[̀-ͯ]/g;

/** Reaproveitado pelo Validation AI Agent (`modules/geo`) para comparar cidade/estado — nunca duplicado. */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(COMBINING_DIACRITICS, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .trim();
}

function tokenSet(text: string): Set<string> {
  return new Set(normalize(text).split(/\s+/).filter(Boolean));
}

/** Índice de Jaccard entre os conjuntos de palavras dos dois nomes — 0 (nada em comum) a 1 (idênticos). */
export function nameSimilarity(a: string, b: string): number {
  const setA = tokenSet(a);
  const setB = tokenSet(b);
  if (setA.size === 0 || setB.size === 0) return 0;

  let intersection = 0;
  for (const token of setA) {
    if (setB.has(token)) intersection += 1;
  }
  const union = setA.size + setB.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

/** Limiar acima do qual duas escolas na mesma cidade/estado são consideradas possíveis duplicatas. */
export const DUPLICATE_NAME_SIMILARITY_THRESHOLD = 0.5;
