import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";

/**
 * Provider do TanStack Query no mobile (Dossie 23, Secao 2.2/3.3) — mesma
 * politica de retry/cache do apps/web. Uploads/offline (Dossie 14, Secao
 * 1.7) usam a fila local de `@rotta/storage`, nao este cliente.
 */
export function QueryProvider({ children }: { children: ReactNode }): JSX.Element {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            retry: 3,
            staleTime: 30_000,
          },
          mutations: {
            retry: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
