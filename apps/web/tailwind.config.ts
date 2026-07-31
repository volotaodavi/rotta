import type { Config } from "tailwindcss";

/**
 * Configuracao Tailwind — os valores de tema (cores, tipografia,
 * espacamento, raio) sao mapeados a partir de `@rotta/theme` via
 * variaveis CSS (ver `src/app/globals.css`), nunca redeclarados aqui
 * como valores literais (Dossie 22, Secao 5.2 / Dossie 23, Secao 5).
 */
const config: Config = {
  darkMode: ["class"],
  content: [
    "./src/**/*.{ts,tsx}",
    "../../packages/ui/src/web/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--color-background)",
        surface: "var(--color-surface)",
        "surface-elevated": "var(--color-surface-elevated)",
        primary: {
          DEFAULT: "var(--color-primary)",
          hover: "var(--color-primary-hover)",
          muted: "var(--color-primary-muted)",
        },
        secondary: "var(--color-secondary)",
        success: "var(--color-success)",
        warning: "var(--color-warning)",
        danger: "var(--color-danger)",
        border: {
          DEFAULT: "var(--color-border)",
          strong: "var(--color-border-strong)",
        },
        text: {
          DEFAULT: "var(--color-text)",
          muted: "var(--color-text-muted)",
          disabled: "var(--color-text-disabled)",
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
    },
  },
  plugins: [],
};

export default config;
