/**
 * Escala tipografica oficial da Rotta — Dossie 24, Secao 4.4 (substitui a
 * nomenclatura provisoria `h1/h2/h3/bodyLg/label` da fundacao do monorepo —
 * ver nota de migracao no Dossie 24, Secao 13.1).
 *
 * Familia por PLATAFORMA (revisado 15/09/2026, pedido do usuario "quero
 * usar os recursos de design da Apple"): Inter na Web/Admin, fonte do
 * sistema no app (SF Pro no iOS, Roboto no Android) — ver `fontFamily`
 * abaixo. O texto anterior desta nota dizia "familia unica (Inter) em
 * toda a plataforma", o que nunca foi verdade no mobile: o app jamais
 * carregou Inter.
 * Hierarquia visual e construida por peso/tamanho, nunca por cor
 * (Secao 4.4.2) — cor e reservada a significado semantico (ver colors.ts).
 */

/**
 * Família tipográfica por plataforma.
 *
 * `base` (Inter) continua sendo a fonte da MARCA — é o que a Web e o
 * Painel Admin carregam, e o que aparece em material impresso.
 *
 * `native` é `undefined` de propósito: em React Native, não declarar
 * `fontFamily` faz o texto usar a fonte do SISTEMA. No iOS isso é o
 * **SF Pro**; no Android, o Roboto. Foi assim que o app sempre se
 * comportou (nenhuma fonte jamais foi carregada com `expo-font`) —
 * o que muda aqui é a intenção: passa a ser uma escolha registrada, e
 * não um acidente que o comentário antigo desta seção contradizia ao
 * afirmar "família única (Inter) em toda a plataforma".
 *
 * Usar o SF Pro por este caminho é o ÚNICO legítimo (pedido do usuário
 * 15/09/2026): a fonte vem do próprio aparelho, nunca do repositório.
 * Baixar SF Pro do Apple Design Resources e embutir no app violaria a
 * licença dela, que permite só mock-up de interface para plataformas
 * Apple e proíbe embutir em produto — e valeria tanto para o Android
 * quanto para o iOS.
 */
export const fontFamily = {
  /** Web/Admin — fonte da marca, carregada pelo próprio app. */
  base: "Inter",
  /** Mobile — fonte do sistema (SF Pro no iOS, Roboto no Android). Nunca declarar. */
  native: undefined,
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
