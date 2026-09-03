/**
 * Hora relativa curta ("agora", "14:32", "Ontem", "12/08") — mesmo
 * padrão visual do WhatsApp Web pra prévia de conversa (pedido do
 * usuário 03/09/2026: "layout... estilo do WhatsApp"). Nunca inventa
 * precisão que a Rotta não tem — só reformata `createdAt` real.
 */
export function formatRelativeChatTime(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = diffMs / 60_000;

  if (diffMin < 1) return "agora";

  const sameDay =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (sameDay) {
    return date.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  }

  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const wasYesterday =
    date.getFullYear() === yesterday.getFullYear() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getDate() === yesterday.getDate();
  if (wasYesterday) return "Ontem";

  const diffDays = diffMs / 86_400_000;
  if (diffDays < 7) {
    return date.toLocaleDateString("pt-BR", { weekday: "short" }).replace(".", "");
  }

  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}
