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
  // Rotta Geo Platform — mesma chave/mesmo raciocínio de `apps/web`
  // (aceita, mas não usada pra resolver o estilo do mapa — ver
  // comentário completo em `apps/web/src/config/env.ts`).
  NEXT_PUBLIC_MAPTILER_API_KEY: z.string().optional(),
  // Chave GRATUITA da CARTO que remove o carimbo "API KEY REQUIRED" —
  // mesma chave/mesmo raciocínio de `apps/web/src/config/env.ts`.
  NEXT_PUBLIC_CARTO_API_KEY: z.string().optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_MAPTILER_API_KEY: process.env.NEXT_PUBLIC_MAPTILER_API_KEY || undefined,
  NEXT_PUBLIC_CARTO_API_KEY: process.env.NEXT_PUBLIC_CARTO_API_KEY || undefined,
});
