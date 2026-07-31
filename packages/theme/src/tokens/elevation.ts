/**
 * Elevacao (profundidade visual) da Rotta.
 *
 * Principio (Dossie 10, Secao 9.3): a plataforma cria profundidade
 * primariamente pela diferenca de tom entre `background` -> `surface` ->
 * `surfaceElevated` (ver colors.ts), nunca por sombra pesada/dramatica —
 * "nunca cards exagerados" e um requisito explicito de marca. Sombra e
 * usada apenas como reforco sutil sobre camadas realmente flutuantes
 * (modais, dropdowns, popovers), nunca em cards no estado padrao.
 *
 * `web` usa valores de `box-shadow`; `native` usa a API de sombra do
 * React Native (shadowColor/shadowOffset/shadowOpacity/shadowRadius no
 * iOS, `elevation` no Android) — ambas derivadas da mesma escala logica.
 */

export interface ElevationLevel {
  /** Nivel semantico, usado para escolher a elevacao certa por componente. */
  level: 0 | 1 | 2 | 3;
  web: string;
  native: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
}

export const elevation: Record<"none" | "card" | "dropdown" | "modal", ElevationLevel> = {
  // Cards no estado padrao nao usam sombra — a separacao vem do tom de superficie.
  none: {
    level: 0,
    web: "none",
    native: {
      shadowColor: "transparent",
      shadowOffset: { width: 0, height: 0 },
      shadowOpacity: 0,
      shadowRadius: 0,
      elevation: 0,
    },
  },
  // Reforco sutil opcional (ex. card sobre outro card em um layout de detalhe).
  card: {
    level: 1,
    web: "0 1px 2px 0 rgba(0, 0, 0, 0.24)",
    native: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.24,
      shadowRadius: 2,
      elevation: 1,
    },
  },
  dropdown: {
    level: 2,
    web: "0 4px 12px 0 rgba(0, 0, 0, 0.32)",
    native: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.32,
      shadowRadius: 12,
      elevation: 4,
    },
  },
  modal: {
    level: 3,
    web: "0 8px 24px 0 rgba(0, 0, 0, 0.4)",
    native: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 24,
      elevation: 8,
    },
  },
};
