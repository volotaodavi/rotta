"use client";

import { ApiError } from "@rotta/api-client";
import { pushToastFromOutsideReact } from "@rotta/ui/web";
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
 * `MutationCache.onError` — fecha o gap que o próprio `AppProviders`
 * ainda documentava ("ainda não é automático, cada mutação continua
 * precisando chamar `toast.error(...)` no seu próprio `onError`"): agora
 * QUALQUER mutação que falhar em qualquer tela do Admin mostra um toast
 * com o motivo real, sem precisar lembrar de adicionar `onError` em cada
 * `useMutation` um por um. Mutações que já chamam `toast.error(...)` no
 * próprio `onError` continuam funcionando normalmente (o TanStack Query
 * chama os dois) — isso aqui é só a rede de segurança.
 */
export function QueryProvider({ children }: { children: ReactNode }): JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        mutationCache: new MutationCache({
          onError: (error) => {
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
