import { elevation, zIndex } from "@rotta/theme";

import type { Config } from "tailwindcss";

/**
 * Configuracao Tailwind — os valores de tema (cores, tipografia,
 * espacamento, raio) sao mapeados a partir de `@rotta/theme` via
 * variaveis CSS (ver `src/app/globals.css`), nunca redeclarados aqui
 * como valores literais (Dossie 22, Secao 5.2 / Dossie 23, Secao 5).
 *
 * `withOpacity` segue o padrao oficial do Tailwind para cor dinamica via
 * variavel CSS (https://tailwindcss.com/docs/customizing-colors —
 * "Using CSS variables"): as variaveis em `globals.css` guardam canais
 * `R G B` (nao hexadecimal) para que modificadores como `bg-primary/20`
 * (usados por `Badge`/`HeroVisual`) funcionem — sem isso, o Tailwind nao
 * consegue aplicar opacidade a uma cor que ja e uma string hexadecimal
 * opaca, e a classe correspondente simplesmente nao e gerada.
 */
function withOpacity(variableName: string): string {
  // O tipo oficial do Tailwind so aceita `string` para uma cor de tema,
  // mas em runtime ele tambem aceita esta funcao (formato documentado
  // "Using CSS variables") — cast necessario so por causa da limitacao
  // do `@types` do Tailwind, nao do proprio Tailwind.
  return (({ opacityValue }: { opacityValue?: string }) =>
    opacityValue === undefined
      ? `rgb(var(${variableName}))`
      : `rgb(var(${variableName}) / ${opacityValue})`) as unknown as string;
}

const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/web/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        background: withOpacity("--color-background"),
        surface: withOpacity("--color-surface"),
        "surface-elevated": withOpacity("--color-surface-elevated"),
        primary: {
          DEFAULT: withOpacity("--color-primary"),
          hover: withOpacity("--color-primary-hover"),
          muted: withOpacity("--color-primary-muted"),
        },
        secondary: withOpacity("--color-secondary"),
        success: withOpacity("--color-success"),
        warning: withOpacity("--color-warning"),
        danger: withOpacity("--color-danger"),
        info: withOpacity("--color-info"),
        /** Acento de papel do Monitor (Modo Ação) — ver `monitorAccent` em `packages/theme/src/tokens/colors.ts`. */
        monitorAccent: {
          DEFAULT: withOpacity("--color-monitor-accent"),
          muted: withOpacity("--color-monitor-accent-muted"),
        },
        card: withOpacity("--color-card"),
        muted: withOpacity("--color-muted"),
        placeholder: withOpacity("--color-placeholder"),
        border: {
          DEFAULT: withOpacity("--color-border"),
          strong: withOpacity("--color-border-strong"),
        },
        text: {
          DEFAULT: withOpacity("--color-text"),
          muted: withOpacity("--color-text-muted"),
          disabled: withOpacity("--color-text-disabled"),
        },
        disabled: {
          bg: withOpacity("--color-disabled-bg"),
          text: withOpacity("--color-text-disabled"),
        },
        /** Paleta editorial só da Landing Page (`.marketing-theme`, ver `globals.css`) — nunca usada fora de `(marketing)`. */
        marketing: {
          canvas: withOpacity("--marketing-canvas"),
          wash: withOpacity("--marketing-wash"),
          ink: withOpacity("--marketing-ink"),
          "ink-text": withOpacity("--marketing-ink-text"),
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
        xl: "var(--radius-xl)",
        full: "var(--radius-full)",
      },
      fontFamily: {
        sans: ["var(--font-family-base)"],
      },
      // Escala unica de z-index/sombra (Dossie 24 Secao 4.10, Dossie 36 —
      // Modal): direto de `@rotta/theme`, nunca um numero solto ad-hoc.
      zIndex: {
        dropdown: String(zIndex.dropdown),
        sticky: String(zIndex.sticky),
        overlay: String(zIndex.overlay),
        modal: String(zIndex.modal),
        popover: String(zIndex.popover),
        toast: String(zIndex.toast),
        tooltip: String(zIndex.tooltip),
      },
      boxShadow: {
        card: elevation.card.web,
        dropdown: elevation.dropdown.web,
        modal: elevation.modal.web,
      },
    },
  },
  plugins: [],
};

export default config;
