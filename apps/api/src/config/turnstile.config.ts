import { registerAs } from "@nestjs/config";

export interface TurnstileConfig {
  /** Sem ela, `TurnstileService.assertHuman` pula a verificação (stub honesto) — ver nota lá. */
  secretKey: string | undefined;
}

/**
 * Cloudflare Turnstile ("não sou um robô", pedido do usuário 01/09/2026)
 * — widget gratuito, sem limite de uso conhecido pro tamanho da Rotta.
 * Par de chaves gerado no painel Cloudflare (Turnstile → Add site):
 * a pública (`NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `apps/web`) fica visível
 * no navegador de propósito — é assim que o widget funciona; só esta
 * aqui, a secreta, precisa ficar de fato secreta.
 */
export default registerAs("turnstile", (): TurnstileConfig => ({
  secretKey: process.env.TURNSTILE_SECRET_KEY || undefined,
}));
