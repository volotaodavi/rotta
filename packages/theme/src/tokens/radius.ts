/**
 * Raios de borda da Rotta — Dossie 10, Secao 5.
 */

export const radius = {
  sm: 6,
  md: 10,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export type RadiusToken = keyof typeof radius;
