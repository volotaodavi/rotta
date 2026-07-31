/**
 * Tokens de movimento (microinteracoes) da Rotta — Dossie 11, Secao 8.
 *
 * Principio geral de duracao: toda animacao fica entre 100-250ms — rapido
 * o suficiente para parecer instantaneo (velocidade percebida, principio
 * Linear), longo o suficiente para ser perceptivel como feedback
 * intencional. Nenhuma animacao decorativa dura mais que 300ms.
 *
 * Toda animacao deve respeitar a preferencia de reducao de movimento do
 * sistema operacional (Dossie 10, Secao 10.2) — a implementacao de
 * `packages/ui` consome `prefersReducedMotion` e substitui transicoes por
 * mudancas instantaneas de estado quando essa preferencia estiver ativa.
 */

export const duration = {
  instant: 0,
  fast: 100,
  base: 150,
  moderate: 200,
  slow: 250,
  /** Reservado a casos excepcionais (ex. crossfade skeleton -> conteudo). */
  emphasis: 300,
} as const;

export const easing = {
  standard: "cubic-bezier(0.2, 0, 0, 1)",
  decelerate: "cubic-bezier(0, 0, 0, 1)",
  accelerate: "cubic-bezier(0.3, 0, 1, 1)",
} as const;

/**
 * Duracoes nomeadas por microinteracao especifica (Dossie 11, Secao 8) —
 * usar estas em vez de `duration.*` diretamente quando a interacao ja
 * estiver catalogada, para manter rastreabilidade com a especificacao.
 */
export const motionPatterns = {
  buttonPress: duration.fast,
  toastEnter: duration.moderate,
  toastExit: duration.moderate,
  skeletonCrossfade: duration.base,
  fieldErrorShake: duration.moderate,
  checklistItemConfirm: duration.base,
} as const;

export type DurationToken = keyof typeof duration;
export type EasingToken = keyof typeof easing;
