/**
 * Número/link do WhatsApp de suporte da Rotta — mesmo número já usado em
 * `apps/web/src/lib/site-config.ts` (`SITE_WHATSAPP_NUMBER`), replicado
 * aqui porque `apps/web`/`apps/mobile` não compartilham `src/lib` no
 * monorepo. Mantenha os dois em sincronia se o número mudar.
 */
export const WHATSAPP_SUPPORT_NUMBER = "5521997099557";

export function buildWhatsAppUrl(message: string): string {
  return `https://wa.me/${WHATSAPP_SUPPORT_NUMBER}?text=${encodeURIComponent(message)}`;
}
