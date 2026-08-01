import type { Config } from "tailwindcss";

/** Ver apps/web/tailwind.config.ts — mesma abordagem (Dossie 22, Secao 5.2). */
const config: Config = {
  darkMode: ["class"],
  content: ["./src/**/*.{ts,tsx}", "../../packages/ui/src/web/**/*.{ts,tsx}"],
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
        info: "var(--color-info)",
        card: "var(--color-card)",
        muted: "var(--color-muted)",
        placeholder: "var(--color-placeholder)",
        border: {
          DEFAULT: "var(--color-border)",
          strong: "var(--color-border-strong)",
        },
        text: {
          DEFAULT: "var(--color-text)",
          muted: "var(--color-text-muted)",
          disabled: "var(--color-text-disabled)",
        },
        disabled: {
          bg: "var(--color-disabled-bg)",
          text: "var(--color-text-disabled)",
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
