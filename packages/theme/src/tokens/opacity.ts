/**
 * Tokens de opacidade da Rotta — Dossie 24, Secao 4.8.
 */

export const opacity = {
  /** Componente desabilitado. */
  disabled: 0.4,
  /** Overlay branco/preto sobre um elemento em hover. */
  hoverOverlay: 0.08,
  /** Overlay em estado pressed. */
  pressedOverlay: 0.12,
  /** Fundo quase imperceptivel (ex. faixa zebrada muito sutil). */
  subtle: 0.06,
  /** Overlay escuro atras de modal/drawer. */
  scrim: 0.6,
  /** Texto de alto contraste sobre imagem/mapa. */
  strong: 0.87,
} as const;

export type OpacityToken = keyof typeof opacity;
