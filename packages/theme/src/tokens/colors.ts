/**
 * Paleta de cores da Rotta — Dossie 24, Secao 4.1 (substitui e estende a
 * paleta inicial do Dossie 10, Secao 6).
 *
 * Filosofia: a marca se restringe a azul, preto, branco e cinza, com
 * excecao deliberada e minima das cores semanticas de estado
 * (success/warning/danger/info) e da escala neutra de ultimo recurso
 * (Secao 4.1.1) — nunca decoracao, sempre significado.
 *
 * Nunca importe um valor hexadecimal solto em um componente — todo
 * componente consome estes tokens nomeados via `packages/ui`.
 */

export interface DisabledColors {
  background: string;
  text: string;
}

export interface NeutralScale {
  100: string;
  300: string;
  500: string;
  700: string;
  900: string;
}

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceElevated: string;
  card: string;
  primary: string;
  primaryHover: string;
  primaryMuted: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
  neutral: NeutralScale;
  border: string;
  borderStrong: string;
  disabled: DisabledColors;
  placeholder: string;
  text: string;
  textMuted: string;
  muted: string;
}

/** Tema escuro — padrao da plataforma (Dossie 24, Secao 5). */
export const darkColors: ColorTokens = {
  background: "#0B0F14",
  surface: "#12161D",
  surfaceElevated: "#1A2029",
  card: "#151A22",
  primary: "#3B6EF6",
  primaryHover: "#5A8CFF",
  primaryMuted: "#1B2B4D",
  secondary: "#E5E8EC",
  success: "#22C55E",
  warning: "#F5A623",
  danger: "#EF4444",
  info: "#22D3EE",
  neutral: {
    100: "#1C212B",
    300: "#2A313D",
    500: "#5C6673",
    700: "#9AA4B2",
    900: "#F5F7FA",
  },
  border: "#232A35",
  borderStrong: "#333C4A",
  disabled: {
    background: "#1C212B",
    text: "#5C6673",
  },
  placeholder: "#6B7484",
  text: "#F5F7FA",
  textMuted: "#9AA4B2",
  muted: "#161B24",
};

/** Tema claro — oferecido como preferencia explicita do usuario (Dossie 24, Secao 5). */
export const lightColors: ColorTokens = {
  background: "#FFFFFF",
  surface: "#F7F8FA",
  surfaceElevated: "#FFFFFF",
  card: "#FFFFFF",
  primary: "#2F5FE0",
  primaryHover: "#1E4BC7",
  primaryMuted: "#E8EEFF",
  secondary: "#4B5563",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  info: "#0891B2",
  neutral: {
    100: "#F7F8FA",
    300: "#E5E8EC",
    500: "#9CA3AF",
    700: "#4B5563",
    900: "#0B0F14",
  },
  border: "#E5E8EC",
  borderStrong: "#C7CDD6",
  disabled: {
    background: "#F1F2F4",
    text: "#A6ACB5",
  },
  placeholder: "#9CA3AF",
  text: "#0B0F14",
  textMuted: "#6B7280",
  muted: "#F1F2F4",
};
