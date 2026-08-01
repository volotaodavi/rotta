/**
 * Escala de z-index da Rotta — Dossie 24, Secao 4.10.
 *
 * Escala unica para toda sobreposicao visual — nenhum componente declara
 * um `z-index`/`zIndex` solto ("9999" ad-hoc), sempre um destes niveis.
 */

export const zIndex = {
  /** Conteudo normal de pagina. */
  base: 0,
  /** Menus suspensos, select expandido. */
  dropdown: 1000,
  /** Cabecalho/sidebar fixos ao rolar. */
  sticky: 1100,
  /** Scrim de fundo de modal/drawer. */
  overlay: 1200,
  /** Modal, dialog, drawer. */
  modal: 1300,
  /** Popover, date picker flutuante. */
  popover: 1400,
  /** Toast/snackbar. */
  toast: 1500,
  /** Tooltip — sempre o nivel mais alto, nunca coberto por nada. */
  tooltip: 1600,
} as const;

export type ZIndexToken = keyof typeof zIndex;
