/**
 * Escala tipografica da Rotta — Dossie 10, Secao 3.
 *
 * Familia unica (Inter) em toda a plataforma — web, painel e app mobile —
 * para que a marca pareca identica em iOS, Android e navegador (Secao 3.1).
 * Hierarquia visual e construida por peso/tamanho, nunca por cor
 * (Secao 3.3) — cor e reservada a significado semantico (ver colors.ts).
 */

export const fontFamily = {
  base: "Inter",
} as const;

export interface TypographyStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: 400 | 500 | 600 | 700;
  letterSpacing?: number;
}

export interface TypographyTokens {
  display: TypographyStyle;
  displayMobile: TypographyStyle;
  h1: TypographyStyle;
  h1Mobile: TypographyStyle;
  h2: TypographyStyle;
  h3: TypographyStyle;
  bodyLg: TypographyStyle;
  body: TypographyStyle;
  caption: TypographyStyle;
  label: TypographyStyle;
  monoData: TypographyStyle;
}

export const typography: TypographyTokens = {
  display: { fontSize: 40, lineHeight: 48, fontWeight: 700 },
  displayMobile: { fontSize: 32, lineHeight: 40, fontWeight: 700 },
  h1: { fontSize: 32, lineHeight: 40, fontWeight: 700 },
  h1Mobile: { fontSize: 26, lineHeight: 32, fontWeight: 700 },
  h2: { fontSize: 24, lineHeight: 32, fontWeight: 600 },
  h3: { fontSize: 20, lineHeight: 28, fontWeight: 600 },
  bodyLg: { fontSize: 16, lineHeight: 24, fontWeight: 400 },
  body: { fontSize: 14, lineHeight: 20, fontWeight: 400 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: 400 },
  label: { fontSize: 13, lineHeight: 16, fontWeight: 600, letterSpacing: 0.2 },
  monoData: { fontSize: 14, lineHeight: 20, fontWeight: 500 },
};
