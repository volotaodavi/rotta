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
  // Rotta Geo Platform — mesma chave/mesmo raciocínio de `apps/web`
  // (aceita, mas não usada pra resolver o estilo do mapa — ver
  // comentário completo em `apps/web/src/config/env.ts`).
  EXPO_PUBLIC_MAPTILER_API_KEY: z.string().optional(),
  // Chave GRATUITA da CARTO que remove o carimbo "API KEY REQUIRED" —
  // mesma chave/mesmo raciocínio de `apps/web/src/config/env.ts`.
  EXPO_PUBLIC_CARTO_API_KEY: z.string().optional(),
});

/**
 * `envSchema.parse(...)` rodava direto aqui, sem try/catch — se
 * `EXPO_PUBLIC_API_URL`/`EXPO_PUBLIC_WEB_URL` viesse ausente ou
 * malformada num build específico (ex.: falha silenciosa na injeção de
 * env da EAS), o `parse` lançava NA AVALIAÇÃO DO MÓDULO, antes de
 * `registerRootComponent(App)` sequer rodar (`index.ts` importa isto
 * transitivamente bem cedo) — `AppErrorBoundary` nunca chega a existir
 * nesse ponto, então o app trava com tela branca pra sempre, sem
 * nenhuma mensagem (achado 14/09/2026, investigando relato de "tela
 * branca ao iniciar, sem nenhuma ação" num build de produção).
 *
 * Agora: nunca lança. Em caso de falha, loga (`console.error` — chega
 * no Logcat/Android vitals mesmo sem `AppErrorBoundary` ativo ainda) e
 * cai pra string vazia — o app continua montando; as chamadas de rede
 * então falham de forma visível (estado de erro já tratado nas telas),
 * em vez do processo inteiro travar antes de desenhar qualquer coisa.
 */
function parseEnv(): z.infer<typeof envSchema> {
  try {
    return envSchema.parse({
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
      EXPO_PUBLIC_WEB_URL: process.env.EXPO_PUBLIC_WEB_URL,
      EXPO_PUBLIC_MAPTILER_API_KEY: process.env.EXPO_PUBLIC_MAPTILER_API_KEY || undefined,
      EXPO_PUBLIC_CARTO_API_KEY: process.env.EXPO_PUBLIC_CARTO_API_KEY || undefined,
    });
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error(
      "[env] Configuração de ambiente inválida — o app vai continuar montando, mas chamadas de API vão falhar.",
      error,
    );
    return {
      EXPO_PUBLIC_API_URL: "",
      EXPO_PUBLIC_WEB_URL: "",
      EXPO_PUBLIC_MAPTILER_API_KEY: undefined,
      EXPO_PUBLIC_CARTO_API_KEY: undefined,
    };
  }
}

export const env = parseEnv();
