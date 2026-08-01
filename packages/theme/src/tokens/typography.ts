/**
 * Escala tipografica oficial da Rotta — Dossie 24, Secao 4.4 (substitui a
 * nomenclatura provisoria `h1/h2/h3/bodyLg/label` da fundacao do monorepo —
 * ver nota de migracao no Dossie 24, Secao 13.1).
 *
 * Familia unica (Inter) em toda a plataforma — web, painel e app mobile —
 * para que a marca pareca identica em iOS, Android e navegador (Secao 4.4.1).
 * Hierarquia visual e construida por peso/tamanho, nunca por cor
 * (Secao 4.4.2) — cor e reservada a significado semantico (ver colors.ts).
 */

export const fontFamily = {
  base: "Inter",
} as const;

export interface TypographyStyle {
  fontSize: number;
  lineHeight: number;
  fontWeight: 400 | 500 | 600 | 700;
  letterSpacing?: number;
  textTransform?: "uppercase";
  /** `font-variant-numeric: tabular-nums` (web) / equivalente nativo — dado tabular. */
  tabularNums?: boolean;
}

export interface TypographyTokens {
  display: TypographyStyle;
  displayMobile: TypographyStyle;
  headline: TypographyStyle;
  headlineMobile: TypographyStyle;
  title: TypographyStyle;
  subtitle: TypographyStyle;
  body: TypographyStyle;
  bodySmall: TypographyStyle;
  caption: TypographyStyle;
  overline: TypographyStyle;
  button: TypographyStyle;
  /** Utilitario fora da escala oficial de 8 — placas, CPF/CNPJ, horarios. */
  monoData: TypographyStyle;
}

export const typography: TypographyTokens = {
  display: { fontSize: 40, lineHeight: 48, fontWeight: 700 },
  displayMobile: { fontSize: 32, lineHeight: 40, fontWeight: 700 },
  headline: { fontSize: 32, lineHeight: 40, fontWeight: 700 },
  headlineMobile: { fontSize: 26, lineHeight: 32, fontWeight: 700 },
  title: { fontSize: 24, lineHeight: 32, fontWeight: 600 },
  subtitle: { fontSize: 20, lineHeight: 28, fontWeight: 600 },
  body: { fontSize: 16, lineHeight: 24, fontWeight: 400 },
  bodySmall: { fontSize: 14, lineHeight: 20, fontWeight: 400 },
  caption: { fontSize: 12, lineHeight: 16, fontWeight: 400 },
  overline: {
    fontSize: 11,
    lineHeight: 16,
    fontWeight: 600,
    letterSpacing: 0.6,
    textTransform: "uppercase",
  },
  button: { fontSize: 14, lineHeight: 20, fontWeight: 600, letterSpacing: 0.2 },
  monoData: { fontSize: 14, lineHeight: 20, fontWeight: 500, tabularNums: true },
};
