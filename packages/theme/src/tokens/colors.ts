/**
 * Paleta de cores da Rotta — Dossie 10, Secao 6.
 *
 * Filosofia (Secao 6.1): a marca se restringe a azul, preto, branco e
 * cinza, com uma unica excecao deliberada — tres cores semanticas minimas
 * (sucesso/alerta/perigo), usadas apenas como sinalizacao de estado,
 * nunca como decoracao, dado que a Rotta e um produto de seguranca
 * infantil em tempo real onde ambiguidade de status seria uma regressao
 * de seguranca em nome de uma regra estetica.
 *
 * Nunca importe um valor hexadecimal solto em um componente — todo
 * componente consome estes tokens nomeados via `packages/ui`.
 */

export interface ColorTokens {
  background: string;
  surface: string;
  surfaceElevated: string;
  primary: string;
  primaryHover: string;
  primaryMuted: string;
  secondary: string;
  success: string;
  warning: string;
  danger: string;
  border: string;
  borderStrong: string;
  text: string;
  textMuted: string;
  textDisabled: string;
}

/** Tema escuro — padrao da plataforma (Dossie 10, Secao 7.1). */
export const darkColors: ColorTokens = {
  background: "#0B0F14",
  surface: "#12161D",
  surfaceElevated: "#1A2029",
  primary: "#3B6EF6",
  primaryHover: "#5A8CFF",
  primaryMuted: "#1B2B4D",
  secondary: "#E5E8EC",
  success: "#22C55E",
  warning: "#F5A623",
  danger: "#EF4444",
  border: "#232A35",
  borderStrong: "#333C4A",
  text: "#F5F7FA",
  textMuted: "#9AA4B2",
  textDisabled: "#5C6673",
};

/** Tema claro — oferecido como opcao, nunca removido (Dossie 10, Secao 7.1). */
export const lightColors: ColorTokens = {
  background: "#FFFFFF",
  surface: "#F7F8FA",
  surfaceElevated: "#FFFFFF",
  primary: "#2F5FE0",
  primaryHover: "#1E4BC7",
  primaryMuted: "#E8EEFF",
  secondary: "#4B5563",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
  border: "#E5E8EC",
  borderStrong: "#C7CDD6",
  text: "#0B0F14",
  textMuted: "#6B7280",
  textDisabled: "#A6ACB5",
};
