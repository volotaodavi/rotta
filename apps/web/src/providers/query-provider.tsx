"use client";

import { ApiError } from "@rotta/api-client";
import { openTrialLockModalFromOutsideReact, pushToastFromOutsideReact } from "@rotta/ui/web";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

/**
 * Provider do TanStack Query (Dossie 23, Secao 2.2/3.3) — estado de
 * servidor da aplicacao inteira. Retry automatico com backoff para
 * leituras; mutacoes (escrita) NAO usam retry generico, para nao
 * arriscar duplicar uma acao de escrita por reenvio automatico — cada
 * fluxo de escrita critico (ex. checklist, GPS) implementa sua propria
 * idempotencia quando for construido (Dossie 14, Secao 1.7).
 *
 * `MutationCache.onError` (pedido do usuário: "ao deslizar para iniciar
 * a rota, não acontece a devida ação... fica na mesma tela" — a causa
 * real era `useStartTrip` sem `onError` nenhum, e essa mesma ausência
 * se repetia em toda mutação do app, exatamente o gap que o próprio
 * `Toast.tsx` já documentava desde que foi criado) — dispara UM toast
 * de erro pra QUALQUER mutação que falhar em qualquer tela, sem
 * precisar lembrar de adicionar `onError` em cada `useMutation` um por
 * um. Mutações que já têm seu próprio `onError` continuam recebendo
 * ele normalmente (o TanStack Query chama os dois) — isso aqui é só a
 * rede de segurança que garante que nenhuma falha vira silêncio.
 */
export function QueryProvider({ children }: { children: ReactNode }): JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          onError: (error) => {
            // Faturamento (Dossiê 26) — `TRIALEXPIRADO` (trial vencido,
            // inadimplente, suspenso ou cancelado) mostra o cadeado, não
            // o toast genérico de erro: cobre qualquer ação bloqueada em
            // qualquer tela, mesmo as que o cadeado da navegação (Frente
            // B, `layout.tsx`) não intercepta antes do clique chegar aqui.
            if (error instanceof ApiError && error.code === "TRIALEXPIRADO") {
              openTrialLockModalFromOutsideReact(error.message);
              return;
            }
            const message =
              error instanceof ApiError
                ? error.message
                : "Não foi possível concluir a ação. Tente novamente.";
            pushToastFromOutsideReact({ variant: "danger", message, duration: 0 });
          },
        }),
        defaultOptions: {
          queries: {
            retry: 3,
            staleTime: 30_000,
            refetchOnWindowFocus: true,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === "development" && <ReactQueryDevtools initialIsOpen={false} />}
    </QueryClientProvider>
  );
}
