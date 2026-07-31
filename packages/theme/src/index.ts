/**
 * Ponto de entrada de `@rotta/theme` — fonte unica de verdade dos tokens
 * de design consumidos por `@rotta/ui/web` (variaveis CSS) e
 * `@rotta/ui/native` (ThemeProvider via Context API — Dossie 23, Secao 5).
 *
 * Nenhum app importa `colors.ts`/`typography.ts` etc. individualmente em
 * codigo de produto — sempre a traves de `darkTheme`/`lightTheme` daqui,
 * para que os dois temas continuem completos e em paridade estrutural.
 */

import { darkColors, lightColors, type ColorTokens } from "./tokens/colors";
import { elevation } from "./tokens/elevation";
import { motionPatterns, duration, easing } from "./tokens/motion";
import { radius } from "./tokens/radius";
import { spacing } from "./tokens/spacing";
import { fontFamily, typography } from "./tokens/typography";

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
}

const motion = { duration, easing, patterns: motionPatterns };

/** Tema escuro — padrao de toda a plataforma (Dossie 10, Secao 7.1). */
export const darkTheme: Theme = {
  name: "dark",
  colors: darkColors,
  typography,
  fontFamily,
  spacing,
  radius,
  elevation,
  motion,
};

/** Tema claro — preferencia opcional do usuario (Dossie 10, Secao 7.1). */
export const lightTheme: Theme = {
  name: "light",
  colors: lightColors,
  typography,
  fontFamily,
  spacing,
  radius,
  elevation,
  motion,
};

export const themes = { dark: darkTheme, light: lightTheme } as const;
export type ThemeName = keyof typeof themes;

export * from "./tokens/colors";
export * from "./tokens/typography";
export * from "./tokens/spacing";
export * from "./tokens/radius";
export * from "./tokens/elevation";
export * from "./tokens/motion";
