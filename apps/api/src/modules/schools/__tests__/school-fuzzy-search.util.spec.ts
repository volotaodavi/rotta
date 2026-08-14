import {
  combinedScore,
  fuzzyNameSimilarity,
  levenshteinDistance,
  proximityScore,
  stringSimilarity,
  tokenize,
} from "../school-fuzzy-search.util";

describe("school-fuzzy-search.util", () => {
  describe("levenshteinDistance", () => {
    it("é 0 para strings idênticas", () => {
      expect(levenshteinDistance("escola", "escola")).toBe(0);
    });

    it("conta as edições mínimas", () => {
      expect(levenshteinDistance("esola", "escola")).toBe(1);
    });
  });

  describe("stringSimilarity", () => {
    it("é 1 para strings idênticas", () => {
      expect(stringSimilarity("escola", "escola")).toBe(1);
    });

    it("cai suavemente com pequenos erros de digitação", () => {
      const score = stringSimilarity("esola", "escola");
      expect(score).toBeGreaterThan(0.7);
      expect(score).toBeLessThan(1);
    });
  });

  describe("tokenize", () => {
    it("normaliza acento/caixa e descarta tokens de 1 caractere", () => {
      expect(tokenize("Escola Municipal João da Silva")).toEqual([
        "escola",
        "municipal",
        "joao",
        "da",
        "silva",
      ]);
    });
  });

  describe("fuzzyNameSimilarity", () => {
    it("pontua alto mesmo com erro de digitação em um token", () => {
      const score = fuzzyNameSimilarity("esola municipal joao", "Escola Municipal João da Silva");
      expect(score).toBeGreaterThan(0.85);
    });

    it("pontua baixo para nomes sem relação nenhuma", () => {
      const score = fuzzyNameSimilarity("clube recreativo", "Escola Municipal João da Silva");
      expect(score).toBeLessThan(0.5);
    });

    it("é tolerante à ordem das palavras (busca parcial por sobrenome)", () => {
      const score = fuzzyNameSimilarity("joao silva", "Escola Municipal João da Silva");
      expect(score).toBeGreaterThan(0.8);
    });

    it("é 0 quando a busca é vazia", () => {
      expect(fuzzyNameSimilarity("", "Escola Municipal João da Silva")).toBe(0);
    });
  });

  describe("proximityScore", () => {
    it("é 1 na mesma coordenada (distância 0)", () => {
      expect(proximityScore(0)).toBe(1);
    });

    it("cai pela metade no raio de decaimento", () => {
      expect(proximityScore(5, 5)).toBeCloseTo(0.5);
    });

    it("nunca é negativo, mesmo com distância enorme", () => {
      expect(proximityScore(10000)).toBeGreaterThan(0);
    });
  });

  describe("combinedScore", () => {
    it("ignora proximidade quando não informada", () => {
      expect(combinedScore(0.9, null)).toBe(0.9);
    });

    it("pesa nome mais que proximidade", () => {
      const comNomeAlto = combinedScore(0.9, 0.1);
      const comNomeBaixo = combinedScore(0.3, 1);
      expect(comNomeAlto).toBeGreaterThan(comNomeBaixo);
    });
  });
});
