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
/**
 * `true` só quando `envSchema.parse(...)` realmente passou — nunca
 * inferido comparando `env.EXPO_PUBLIC_API_URL` contra `""` (esse tipo
 * de checagem por "valor mágico" se perderia se o fallback abaixo
 * mudasse). `App.tsx` usa esta flag pra mostrar uma tela honesta de
 * "configuração ausente" ANTES de deixar `RootNavigator` tentar montar
 * — ver a nota completa dessa decisão logo abaixo, e a tela em
 * `src/screens/app-config-error-screen.tsx` (achado 15/09/2026,
 * investigando os relatos "login com erro inesperado" e "erro de
 * render ao abrir Documentação Rotta": os dois batem exatamente com o
 * que acontece quando `EXPO_PUBLIC_API_URL`/`EXPO_PUBLIC_WEB_URL`
 * chegam vazios num build específico — login falha com uma URL de API
 * vazia e vira "erro inesperado" no catch genérico de `LoginScreen`, e
 * as 5 telas de WebView que interpolam `env.EXPO_PUBLIC_WEB_URL` numa
 * `uri` recebem uma URL relativa inválida tipo `/legal`, que o
 * `react-native-webview` rejeita — sem confirmação por log de
 * produção, mas é a explicação mais honesta e acionável que a base de
 * código sustenta hoje).
 */
export let isEnvConfigValid = true;

function parseEnv(): z.infer<typeof envSchema> {
  try {
    return envSchema.parse({
      EXPO_PUBLIC_API_URL: process.env.EXPO_PUBLIC_API_URL,
      EXPO_PUBLIC_WEB_URL: process.env.EXPO_PUBLIC_WEB_URL,
      EXPO_PUBLIC_MAPTILER_API_KEY: process.env.EXPO_PUBLIC_MAPTILER_API_KEY || undefined,
      EXPO_PUBLIC_CARTO_API_KEY: process.env.EXPO_PUBLIC_CARTO_API_KEY || undefined,
    });
  } catch (error) {
    isEnvConfigValid = false;
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
