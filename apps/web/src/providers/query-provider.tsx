"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState, type ReactNode } from "react";

/**
 * Provider do TanStack Query (Dossie 23, Secao 2.2/3.3) — estado de
 * servidor da aplicacao inteira. Retry automatico com backoff para
 * leituras; mutacoes (escrita) NAO usam retry generico, para nao
 * arriscar duplicar uma acao de escrita por reenvio automatico — cada
 * fluxo de escrita critico (ex. checklist, GPS) implementa sua propria
 * idempotencia quando for construido (Dossie 14, Secao 1.7).
 */
export function QueryProvider({ children }: { children: ReactNode }): JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
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
