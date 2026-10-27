export const TURNO_LABEL: Record<string, string> = {
  MANHA: "Manhã",
  TARDE: "Tarde",
  NOITE: "Noite",
  INTEGRAL: "Integral",
};

/**
 * Cor de papel (Frente 300, imagens de referência anexadas pelo usuário
 * — Responsável verde/Motorista azul/Monitor roxo, pedido explícito:
 * "quero o mesmo design, sem imitações... quero idêntico"). Motorista
 * reaproveita `primary` (já é o azul da marca); só o Monitor usa o
 * acento novo (`monitorAccent`, ver `packages/theme/src/tokens/
 * colors.ts`) — nenhum token semântico (success/warning/danger)
 * muda de significado em lugar nenhum fora desta cor de identidade.
 */
export interface RoleAccent {
  text: string;
  bg: string;
  muted: string;
  border: string;
}

export const MOTORISTA_ACCENT: RoleAccent = {
  text: "text-driverPrimary",
  bg: "bg-driverPrimary",
  muted: "bg-driverPrimary-muted",
  border: "border-driverPrimary/40",
};

export const MONITOR_ACCENT: RoleAccent = {
  text: "text-monitorAccent",
  bg: "bg-monitorAccent",
  muted: "bg-monitorAccent-muted",
  border: "border-monitorAccent/40",
};

export const DRIVER_SUPPORT_WHATSAPP_MESSAGE =
  "Olá! Preciso de ajuda do suporte durante uma viagem.";

export function formatarDistancia(metros: number): string {
  if (metros < 1000) return `${Math.round(metros)}m`;
  return `${(metros / 1000).toFixed(1).replace(".", ",")}km`;
}
