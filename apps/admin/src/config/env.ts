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
  /** Token público do Mapbox (`pk.*`) — Rotta Geo Platform, `@rotta/maps/web`. Opcional: sem ele, as telas de mapa caem no fallback de lista (mesma disciplina de `GeoEngineService` no backend). */
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: z.string().optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN,
});
