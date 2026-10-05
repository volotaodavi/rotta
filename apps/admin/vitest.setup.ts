import "@testing-library/jest-dom/vitest";

/**
 * jsdom não implementa `matchMedia`, e o tema do Admin lê isso no
 * primeiro render. Sem este mínimo, qualquer teste que monte uma tela
 * inteira quebra antes de chegar no que está sendo verificado.
 */
if (typeof window !== "undefined" && !window.matchMedia) {
  window.matchMedia = (query: string) =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList;
}
