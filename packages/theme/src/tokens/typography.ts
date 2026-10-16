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
 * `base` (Inter) é a fonte da Web e do Painel Admin.
 *
 * ## O app nativo passou a ter letra própria em 16/10/2026
 *
 * Até aqui `native` era `undefined` de propósito: sem declarar
 * `fontFamily`, o React Native usa a fonte do SISTEMA (SF Pro no iOS,
 * Roboto no Android). Era uma escolha registrada, feita em 15/09/2026.
 *
 * O fundador olhou o app depois de duas levas de redesenho e disse que
 * ele continuava "com cara de IA". Tinha razão, e esta era a maior
 * causa que restava: um app inteiro escrito na fonte padrão do sistema
 * se parece com todo aplicativo que nunca escolheu uma letra. A
 * tipografia é a camada que mais carrega identidade, e a Rotta não
 * tinha nenhuma.
 *
 * `Plus Jakarta Sans` é a resposta: geométrica de esqueleto humanista,
 * altura de x grande, 'a' de dois andares e bojo levemente quadrado —
 * é a letra que o conceito visual do fundador desenha. Licença SIL
 * Open Font, então pode ser embutida no produto, diferente da SF Pro
 * da Apple, que a licença proíbe embutir.
 *
 * ## Por que um peso por família, e não `fontWeight`
 *
 * Porque no React Native com fonte própria, `fontWeight` não escolhe o
 * arquivo: cada peso É uma família registrada. Pedir peso 700 numa
 * família que só tem o regular faz o Android desenhar um negrito
 * sintético, engrossado por software, que é exatamente o borrão que
 * denuncia app mal feito. Quem precisa de peso usa `fonteNativa(700)`.
 */
export const fontFamily = {
  /** Web/Admin — fonte da marca, carregada pelo próprio app. */
  base: "Inter",
  /** Mobile — uma família registrada por peso (ver `fonteNativa`). */
  native: {
    400: "PlusJakartaSans_400Regular",
    500: "PlusJakartaSans_500Medium",
    600: "PlusJakartaSans_600SemiBold",
    700: "PlusJakartaSans_700Bold",
    800: "PlusJakartaSans_800ExtraBold",
  },
} as const;

/** Peso tipográfico válido no app nativo. */
export type PesoNativo = keyof typeof fontFamily.native;

/**
 * A família certa para um peso no app nativo.
 *
 * Aceita qualquer `fontWeight` do React Native, inclusive os nomes
 * ("bold", "medium") e os pesos que a Rotta não carrega (100, 900).
 * Peso que não existe cai no mais próximo que existe, em vez de cair
 * no regular: pedir 900 e receber texto fino seria pior do que
 * receber o extrabold.
 */
export function fonteNativa(peso: PesoNativo | string | number | undefined | null): string {
  const porNome: Record<string, PesoNativo> = {
    normal: 400,
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
    heavy: 800,
    black: 800,
    ultralight: 400,
    thin: 400,
    light: 400,
    condensed: 400,
    condensedBold: 700,
  };

  if (peso === undefined || peso === null) return fontFamily.native[400];

  const numero = typeof peso === "number" ? peso : Number(peso);
  if (Number.isNaN(numero)) {
    const mapeado = porNome[String(peso)] ?? 400;
    return fontFamily.native[mapeado];
  }

  const disponiveis: PesoNativo[] = [400, 500, 600, 700, 800];
  const maisProximo = disponiveis.reduce((melhor, atual) =>
    Math.abs(atual - numero) < Math.abs(melhor - numero) ? atual : melhor,
  );
  return fontFamily.native[maisProximo];
}

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
