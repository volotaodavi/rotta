/**
 * Breakpoints responsivos da Rotta — Dossie 24, Secao 4.9.
 */

export const breakpoints = {
  /** Celulares compactos. */
  xs: 0,
  /** Celulares padrao. */
  sm: 480,
  /** Tablets (retrato). */
  md: 768,
  /** Tablets (paisagem), notebooks. */
  lg: 1024,
  /** Desktops e monitores grandes. */
  xl: 1440,
} as const;

export type BreakpointToken = keyof typeof breakpoints;
