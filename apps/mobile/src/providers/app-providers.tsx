import { AuthProvider } from "@rotta/auth/native";
import { configureRottaMaps } from "@rotta/maps/native";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { QueryProvider } from "./query-provider";
import { ThemeProvider } from "./theme-provider";

import type { ReactNode } from "react";

import { env } from "@/config/env";
import { authApi, clientErrorsApi } from "@/lib/api-client";

/**
 * Rotta Geo Platform — mesmo raciocínio de `apps/web/.../app-providers.tsx`:
 * chamado no corpo do módulo (executa uma única vez, no primeiro
 * `import` deste arquivo, sempre antes de qualquer `<RottaMap/>`
 * montar), nunca dentro de um `useEffect`.
 */
configureRottaMaps({
  mapTilerApiKey: env.EXPO_PUBLIC_MAPTILER_API_KEY,
  cartoApiKey: env.EXPO_PUBLIC_CARTO_API_KEY,
});

/**
 * Composicao unica de todos os providers de nivel de aplicacao do app
 * mobile (Dossie 23, Secao 1.1). `AuthProvider` (Dossie 15) mantem a
 * mesma sessao/conta compartilhada com `apps/web`/`apps/admin`.
 */
/**
 * Leva ao plantão de erro a falha que antes sumia.
 *
 * Quando a renovação de sessão falha por motivo técnico, a pessoa cai
 * na tela de login sem ter feito nada, e até 06/10/2026 isso não
 * deixava rastro em lugar nenhum. Foi assim que o app ficou "sem
 * abrir" por um dia inteiro com o plantão marcando zero erros.
 *
 * Best-effort de propósito: se o relato falhar (e ele vai falhar
 * justamente quando a API estiver fora do ar, que é metade dos casos),
 * o silêncio é melhor que um segundo erro em cima do primeiro. O que
 * sobreviver chega, e um só já basta para o plantão enxergar o padrão.
 */
function relatarSessaoNaoRenovada(erro: unknown): void {
  const mensagem = erro instanceof Error ? erro.message : String(erro);
  void clientErrorsApi
    .report({
      app: "MOBILE",
      source: "sessao-nao-renovada",
      message: `Sessão não renovada: ${mensagem}`,
      path: "abertura-do-app",
      stack: erro instanceof Error ? erro.stack : undefined,
    })
    .catch(() => undefined);
}

export function AppProviders({ children }: { children: ReactNode }): JSX.Element {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <QueryProvider>
          <AuthProvider authApi={authApi} aoFalharPorMotivoTecnico={relatarSessaoNaoRenovada}>
            {children}
          </AuthProvider>
        </QueryProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
