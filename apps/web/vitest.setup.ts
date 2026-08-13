import "@testing-library/jest-dom/vitest";

/**
 * jsdom não implementa `window.matchMedia` (gap conhecido) — mock
 * mínimo pra qualquer teste que dependa dele (ex. `isStandalone()` em
 * `src/lib/pwa.ts`). `matches: false` por padrão; testes que precisam
 * simular "rodando instalado" sobrescrevem com `vi.stubGlobal`.
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
