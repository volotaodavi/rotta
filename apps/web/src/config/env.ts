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
  // Rotta Geo Platform — chave gratuita da MapTiler (maptiler.com),
  // repassada a `configureRottaMaps` em `providers/app-providers.tsx`.
  // Aceita por `@rotta/maps/web` mas NÃO USADA pra resolver o estilo do
  // mapa (ver `resolveDefaultStyleUrl` no pacote) — o motivo é histórico
  // de produção (27/08/2026): o estilo vetorial da MapTiler renderizava
  // em branco mesmo com chave/CORS/dado conferidos, então o pacote
  // sempre usa o raster CARTO agora. Mantida aqui só pro dia em que essa
  // causa for isolada e valer a pena voltar a testar.
  NEXT_PUBLIC_MAPTILER_API_KEY: z.string().optional(),
  // Chave GRATUITA da CARTO (sem cartão, sem plano pago) que remove o
  // carimbo "API KEY REQUIRED" do raster CARTO — peça em
  // https://carto.com/basemaps/apikey (e-mail + domínio, aprovação
  // automática, limite de uso justo de 5M requisições/mês). Sem esta
  // variável, o mapa continua aparecendo normalmente (ruas/água/nomes de
  // lugar reais), só com o carimbo por cima — nunca uma tela em branco.
  NEXT_PUBLIC_CARTO_API_KEY: z.string().optional(),
});

export const env = envSchema.parse({
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_VAPID_PUBLIC_KEY: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || undefined,
  NEXT_PUBLIC_MAPTILER_API_KEY: process.env.NEXT_PUBLIC_MAPTILER_API_KEY || undefined,
  NEXT_PUBLIC_CARTO_API_KEY: process.env.NEXT_PUBLIC_CARTO_API_KEY || undefined,
});
