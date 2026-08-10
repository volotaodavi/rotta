import { elevation, zIndex } from "@rotta/theme";

import type { Config } from "tailwindcss";

/**
 * Ver apps/web/tailwind.config.ts — mesma abordagem (Dossie 22, Secao
 * 5.2), incluindo `withOpacity` (variaveis CSS em `globals.css` como
 * canais `R G B`, exigido pelo Tailwind para os modificadores de
 * opacidade usados por `Badge`).
 */
function withOpacity(variableName: string): string {
  // Ver apps/web/tailwind.config.ts — mesmo cast, mesma limitacao dos
  // tipos oficiais do Tailwind (a funcao e valida em runtime).
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
