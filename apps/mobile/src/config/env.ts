import { z } from "zod";

/**
 * Configuracao de ambiente validada (Dossie 23, Secao 8) — apenas
 * variaveis `EXPO_PUBLIC_*` chegam ao bundle do cliente.
 */
const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
  /**
   * URL do Site/Painel Web (Dossie 15, `AUTH-01`) — nunca hardcoded: em
   * dev aponta para `http://localhost:3000`, em producao para o dominio
   * real. Usada para abrir "Criar Empresa" em WebView integrada.
   */
  EXPO_PUBLIC_WEB_URL: z.string().url(),
  // Rotta Geo Platform — mesma chave/mesmo raciocínio de `apps/web`.
  EXPO_PUBLIC_MAPTILER_API_KEY: z.string().optional(),
});

export const env = envSchema.parse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_WEB_URL: process.env.EXPO_PUBLIC_WEB_URL,
  EXPO_PUBLIC_MAPTILER_API_KEY: process.env.EXPO_PUBLIC_MAPTILER_API_KEY || undefined,
});
