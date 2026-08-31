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
  /**
   * Acento de papel do Monitor (Modo Ação) — usuário anexou 3 imagens de
   * referência (Responsável/Motorista/Monitor) e pediu design "idêntico,
   * sem imitações": cada papel com sua própria cor (verde/azul/roxo).
   * Responsável reaproveita `success` (já verde) e Motorista reaproveita
   * `primary` (já azul) — nenhum dos dois precisa de token novo. Só o
   * roxo do Monitor não existe na paleta da marca (Dossiê 10 §7: "azul,
   * preto, branco e cinza... nunca decoração, sempre significado") —
   * token isolado, usado só nas 3 telas do Monitor, nunca nos tokens
   * semânticos existentes (success/warning/danger/info continuam intactos
   * em todo o resto do produto).
   */
  monitorAccent: string;
  monitorAccentMuted: string;
  /**
   * Identidade visual EXCLUSIVA das telas do Motorista/Monitor (spec do
   * usuário, 31/08/2026 — "cores/raios/sombra... só do Motorista",
   * mesma decisão de escopo de `monitorAccent` acima: token isolado,
   * nunca substitui `primary`/`success`/`danger` compartilhados por
   * Responsável/Empresa/Admin/Landing em todo o resto do produto).
   * `driverPrimary`/`driverSuccess`/`driverDanger` só existem porque o
   * usuário deu hex exatos ("IDENTIDADE") — nas poucas telas onde eles
   * coincidem com um token já existente (fundo de cartão branco,
   * texto secundário), a tela reaproveita o token comum em vez de
   * duplicar aqui.
   */
  driverPrimary: string;
  driverPrimaryHover: string;
  driverPrimaryMuted: string;
  driverBackground: string;
  driverSuccess: string;
  driverSuccessMuted: string;
  driverDanger: string;
  driverDangerMuted: string;
}

/**
 * Sombra discreta única do cartão de mapa/bottom sheet do Motorista
 * (spec do usuário: "sombras discretas") — nunca o `elevation`
 * genérico do resto do produto, que deliberadamente NÃO usa sombra em
 * cards no estado padrão (ver `elevation.ts`). Fica FORA de
 * `ColorTokens` (que só guarda cores) porque native precisa de um
 * objeto de sombra (`shadowColor`/`shadowOffset`/...), não de uma
 * string CSS — mesmo formato de `ElevationLevel` — enquanto web
 * consome a própria string via `--shadow-driver` em `globals.css`
 * (que não depende deste export).
 */
export interface DriverShadow {
  web: string;
  native: {
    shadowColor: string;
    shadowOffset: { width: number; height: number };
    shadowOpacity: number;
    shadowRadius: number;
    elevation: number;
  };
}

export const driverShadow: Record<"light" | "dark", DriverShadow> = {
  light: {
    web: "0 8px 30px rgba(16, 24, 40, 0.07)",
    native: {
      shadowColor: "#101828",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      elevation: 8,
    },
  },
  dark: {
    web: "0 8px 30px rgba(0, 0, 0, 0.4)",
    native: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.4,
      shadowRadius: 20,
      elevation: 8,
    },
  },
};

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
  monitorAccent: "#8B5CF6",
  monitorAccentMuted: "#241B47",
  // Escuro adaptado a partir do spec claro do usuário (que não cobre
  // tema escuro) — mesmo matiz de marca em tom mais claro pra contraste
  // sobre fundo escuro (mesmo raciocínio de `primary` acima).
  driverPrimary: "#4C86FF",
  driverPrimaryHover: "#6B9CFF",
  driverPrimaryMuted: "#132A52",
  driverBackground: "#0B0F14",
  driverSuccess: "#22C55E",
  driverSuccessMuted: "#123321",
  driverDanger: "#EF4444",
  driverDangerMuted: "#3A1614",
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
  monitorAccent: "#7C3AED",
  monitorAccentMuted: "#EFE9FE",
  // Valores exatos do spec do usuário ("IDENTIDADE") — nunca arredondar/aproximar.
  driverPrimary: "#1769FF",
  driverPrimaryHover: "#0954DC",
  driverPrimaryMuted: "#EDF4FF",
  driverBackground: "#F6F8FB",
  driverSuccess: "#18A957",
  driverSuccessMuted: "#EAF8F0",
  driverDanger: "#E53935",
  driverDangerMuted: "#FFF0EF",
};
