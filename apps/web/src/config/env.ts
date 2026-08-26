import { z } from "zod";

/**
 * Configuracao de ambiente validada (Dossie 23, Secao 8) — nenhum
 * componente le `process.env.*` diretamente; todos importam `env`
 * daqui. A aplicacao falha ao construir/iniciar se uma variavel
 * obrigatoria estiver ausente ou malformada.
 *
 * Apenas variaveis prefixadas `NEXT_PUBLIC_*` chegam ao bundle do
 * navegador (garantia estrutural do proprio Next.js) — nenhum segredo
 * de backend deve, portanto, ser declarado aqui.
 */
const envSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url(),
  // Push real (Frente 0) — mesma chave pública VAPID gerada pro backend
  // (`WebPushService`); sem ela, `usePushRegistration` detecta a ausência
  // e não oferece a opção de ativar push no navegador (stub honesto).
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: z.string().optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || undefined,
});
