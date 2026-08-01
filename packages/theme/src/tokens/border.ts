/**
 * Espessura de borda da Rotta — Dossie 24, Secao 4.6.
 *
 * Nao confundir com a cor de borda (`colors.ts`, tokens `border`/
 * `borderStrong`) — este arquivo define exclusivamente a espessura.
 */

export const borderWidth = {
  /** Divisores discretos, borda padrao de card. */
  hairline: 1,
  /** Borda padrao de input, borda de badge. */
  thin: 1,
  /** Anel de foco (acessibilidade), borda de estado ativo. */
  medium: 2,
  /** Barra lateral de alerta, indicador de selecao forte — uso raro e deliberado. */
  thick: 4,
} as const;

export type BorderWidthToken = keyof typeof borderWidth;
