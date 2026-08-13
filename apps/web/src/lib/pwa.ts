/**
 * Utilitário compartilhado de PWA — extraído de `install-app-prompt.tsx`
 * porque `use-app-mode.ts` (Frente G) também precisa saber se o app está
 * rodando instalado (standalone) para escolher um Modo Ação/Visão
 * completa inicial sensato. Uma função, um lugar — nenhum dos dois
 * componentes reimplementa a checagem.
 */
export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  return (
    // `matchMedia` não existe em todo ambiente (ex. jsdom sem polyfill nos testes) — checagem defensiva, não só browsers reais têm a API.
    (typeof window.matchMedia === "function" &&
      window.matchMedia("(display-mode: standalone)").matches) ||
    // Safari/iOS não dispara `beforeinstallprompt`, mas expõe esta flag quando já rodando como PWA instalado.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
