import { z } from "zod";

/**
 * Configuracao de ambiente validada (Dossie 23, Secao 8) — apenas
 * variaveis `EXPO_PUBLIC_*` chegam ao bundle do cliente.
 */
const envSchema = z.object({
  EXPO_PUBLIC_API_URL: z.string().url(),
  EXPO_PUBLIC_APP_VARIANT: z.enum(["driver", "parent"]).default("driver"),
});

export const env = envSchema.parse({
  EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
  EXPO_PUBLIC_APP_VARIANT: process.env.EXPO_PUBLIC_APP_VARIANT,
});
