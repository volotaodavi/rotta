/**
 * Ponto de entrada de `@rotta/theme` — fonte unica de verdade dos tokens
 * de design consumidos por `@rotta/ui/web` (variaveis CSS) e
 * `@rotta/ui/native` (ThemeProvider via Context API — Dossie 23, Secao 5).
 *
 * As onze categorias de token (Dossie 24, Secao 3) sao compostas aqui em
 * um unico objeto `Theme` por tema. Nenhum app importa `colors.ts`/
 * `typography.ts` etc. individualmente em codigo de produto — sempre
 * atraves de `darkTheme`/`lightTheme` daqui, para que os dois temas
 * continuem completos e em paridade estrutural.
 */

import { borderWidth } from "./tokens/border";
import { breakpoints } from "./tokens/breakpoints";
import { darkColors, lightColors, type ColorTokens } from "./tokens/colors";
import { elevation } from "./tokens/elevation";
import { motionPatterns, duration, easing } from "./tokens/motion";
import { opacity } from "./tokens/opacity";
import { radius } from "./tokens/radius";
import { spacing } from "./tokens/spacing";
import { transitions } from "./tokens/transitions";
import { fontFamily, typography } from "./tokens/typography";
import { zIndex } from "./tokens/z-index";

export interface Theme {
  name: "dark" | "light";
  colors: ColorTokens;
  typography: typeof typography;
  fontFamily: typeof fontFamily;
  spacing: typeof spacing;
  radius: typeof radius;
  elevation: typeof elevation;
  motion: {
    duration: typeof duration;
    easing: typeof easing;
    patterns: typeof motionPatterns;
  };
  borderWidth: typeof borderWidth;
  opacity: typeof opacity;
  breakpoints: typeof breakpoints;
  zIndex: typeof zIndex;
  transitions: typeof transitions;
}

const motion = { duration, easing, patterns: motionPatterns };

/** Tema escuro — padrao de toda a plataforma (Dossie 24, Secao 5). */
export const darkTheme: Theme = {
  name: "dark",
  colors: darkColors,
  typography,
  fontFamily,
  spacing,
  radius,
  elevation,
  motion,
  borderWidth,
  opacity,
  breakpoints,
  zIndex,
  transitions,
};

/** Tema claro — preferencia explicita do usuario (Dossie 24, Secao 5). */
export const lightTheme: Theme = {
  name: "light",
  colors: lightColors,
  typography,
  fontFamily,
  spacing,
  radius,
  elevation,
  motion,
  borderWidth,
  opacity,
  breakpoints,
  zIndex,
  transitions,
};

export const themes = { dark: darkTheme, light: lightTheme } as const;
export type ThemeName = keyof typeof themes;

export * from "./tokens/border";
export * from "./tokens/breakpoints";
export * from "./tokens/colors";
export * from "./tokens/elevation";
export * from "./tokens/motion";
export * from "./tokens/opacity";
export * from "./tokens/radius";
export * from "./tokens/spacing";
export * from "./tokens/transitions";
export * from "./tokens/typography";
export * from "./tokens/z-index";
