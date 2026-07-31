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
});

export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
});
