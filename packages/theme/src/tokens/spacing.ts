/**
 * Escala de espacamento da Rotta — Dossie 10, Secao 2.4.
 * Unidade base de 4px; todo espacamento no produto e um multiplo desta
 * escala, nunca um valor arbitrario escolhido ad-hoc por tela.
 */

export const spacing = {
  0: 0,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  6: 24,
  8: 32,
  12: 48,
  16: 64,
  24: 96,
} as const;

export type SpacingToken = keyof typeof spacing;
