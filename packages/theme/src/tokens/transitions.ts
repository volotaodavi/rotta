/**
 * Presets compostos de transicao da Rotta — Dossie 24, Secao 4.11.
 *
 * Combinacoes prontas de propriedade + duracao + curva para os padroes
 * mais recorrentes — nenhum componente declara `transition` (web) ou
 * `Animated.timing` (native) com valores soltos, sempre um destes presets.
 */

import { duration, easing } from "./motion";

export interface TransitionPreset {
  /** Propriedades CSS afetadas (uso web) — apenas documentacao no native. */
  properties: string[];
  duration: number;
  easing: string;
}

export const transitions: Record<
  "color" | "transform" | "opacity" | "shadow" | "allFast",
  TransitionPreset
> = {
  /** Hover de botao, mudanca de estado de campo. */
  color: {
    properties: ["color", "background-color", "border-color"],
    duration: duration.base,
    easing: easing.standard,
  },
  /** Escala de press, expansao de accordion. */
  transform: {
    properties: ["transform"],
    duration: duration.base,
    easing: easing.standard,
  },
  /** Fade de toast, skeleton -> conteudo. */
  opacity: {
    properties: ["opacity"],
    duration: duration.moderate,
    easing: easing.standard,
  },
  /** Elevacao ao abrir menu/popover. */
  shadow: {
    properties: ["box-shadow"],
    duration: duration.base,
    easing: easing.standard,
  },
  /**
   * Reservado a casos onde multiplas propriedades mudam juntas de forma
   * simples (ex. badge de contagem) — uso deliberadamente raro, `all` e
   * evitado por padrao por custo de performance.
   */
  allFast: {
    properties: ["all"],
    duration: duration.fast,
    easing: easing.standard,
  },
};

/** Serializa um preset para a sintaxe `transition` do CSS (uso web). */
export function toCssTransition(preset: TransitionPreset): string {
  return preset.properties
    .map((property) => `${property} ${preset.duration}ms ${preset.easing}`)
    .join(", ");
}

export type TransitionToken = keyof typeof transitions;
