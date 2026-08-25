import type { MapVehicle } from "@rotta/api-client";

/**
 * Busca da Central de Monitoramento do Admin (pedido do usuário:
 * "clicando no campo de pesquisa onde poderemos pesquisar a
 * transportadora e localidade... aparecendo sugestões e nomes
 * idênticos/parecidos/exatos" — mais tarde estendido, a pedido, também
 * a placa/motorista/CNPJ).
 *
 * Roda inteiramente no CLIENTE, sobre a lista que `useGpsMapNationwide`
 * já busca (o "Mapa Nacional de Veículos", todas as viagens
 * `EM_ANDAMENTO` agora, de todas as empresas) — diferente da busca de
 * escolas (`school-fuzzy-search.util.ts`, que precisa filtrar no banco
 * primeiro porque a tabela chega a ~200 mil linhas), aqui o "universo"
 * de candidatos já É pequeno por natureza: só transportes acontecendo
 * NESTE INSTANTE. Nunca faz sentido sugerir uma transportadora sem
 * viagem em curso — não haveria localização nenhuma pra mostrar.
 */

/** Acentos fora, caixa baixa — mesmo tratamento usado em todo o resto do repo pra comparação de texto (`school-duplicate.util.ts`). */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function onlyDigits(text: string): string {
  return text.replace(/\D/g, "");
}

/** Distância de edição clássica — mesmo algoritmo de `school-fuzzy-search.util.ts`, duplicado aqui porque é puro/sem dependências e o universo de candidatos é outro (viagens ativas, não escolas). */
function levenshteinDistance(a: string, b: string): number {
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

/** 1 = igual, 0 = completamente diferente. */
function stringSimilarity(a: string, b: string): number {
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}

/** Peso de cada campo de texto livre (nome/localidade pesam mais — são o que o usuário pediu primeiro; motorista é o extra menos provável de ser digitado). */
const TEXT_FIELD_WEIGHT = {
  empresa: 1,
  localidade: 0.9,
  motorista: 0.8,
} as const;

/** Abaixo disso a sugestão é descartada — string parecida demais com qualquer coisa não ajuda o admin a achar o transporte certo. */
const MIN_SCORE = 0.35;
const SUGGESTION_LIMIT = 8;

function bestTextScore(query: string, value: string | undefined, weight: number): number {
  if (!value) return 0;
  const candidate = normalize(value);
  if (!candidate) return 0;
  if (candidate.includes(query)) return weight; // substring exata — sempre o teto daquele campo
  return stringSimilarity(query, candidate) * weight * 0.6; // "parecido" nunca supera uma substring exata
}

/**
 * Filtra e ordena `vehicles` (o Mapa Nacional de Veículos já buscado)
 * pelos campos: nome da transportadora, cidade, bairro, motorista
 * (tolerante a erro de digitação/acento) e placa/CNPJ (substring exata
 * sobre os caracteres/dígitos, sem tolerância — não faz sentido
 * "aproximar" um documento). Nunca chama a API de novo — é só reordenar
 * o que já está em memória.
 */
export function searchMonitoringCandidates(query: string, vehicles: MapVehicle[]): MapVehicle[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) return [];

  const normalizedQuery = normalize(trimmed);
  const compactQuery = normalizedQuery.replace(/[\s-]/g, "");
  const digitsQuery = onlyDigits(trimmed);

  const scored = vehicles.map((vehicle) => {
    let score = Math.max(
      bestTextScore(normalizedQuery, vehicle.companyNome, TEXT_FIELD_WEIGHT.empresa),
      bestTextScore(normalizedQuery, vehicle.companyCidade, TEXT_FIELD_WEIGHT.localidade),
      bestTextScore(normalizedQuery, vehicle.companyBairro, TEXT_FIELD_WEIGHT.localidade),
      bestTextScore(normalizedQuery, vehicle.motoristaNome, TEXT_FIELD_WEIGHT.motorista),
    );

    if (compactQuery.length >= 2) {
      const compactPlaca = normalize(vehicle.placa).replace(/[\s-]/g, "");
      if (compactPlaca.includes(compactQuery)) score = Math.max(score, 1);
    }

    if (digitsQuery.length >= 3 && vehicle.companyCpfCnpj) {
      if (onlyDigits(vehicle.companyCpfCnpj).includes(digitsQuery)) score = Math.max(score, 1);
    }

    return { vehicle, score };
  });

  return scored
    .filter((entry) => entry.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, SUGGESTION_LIMIT)
    .map((entry) => entry.vehicle);
}
