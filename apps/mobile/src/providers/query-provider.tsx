import { ApiError } from "@rotta/api-client";
import { MutationCache, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Alert } from "react-native";

/**
 * Provider do TanStack Query no mobile (Dossie 23, Secao 2.2/3.3) — mesma
 * politica de retry/cache do apps/web. Uploads/offline (Dossie 14, Secao
 * 1.7) usam a fila local de `@rotta/storage`, nao este cliente.
 *
 * `MutationCache.onError` (mesmo gap corrigido no `apps/web` — usuário:
 * "ao deslizar para iniciar a rota, não acontece a devida ação... fica na
 * mesma tela", causado por `useStartTrip` sem `onError` nenhum) — mostra
 * um `Alert` nativo com o motivo real de QUALQUER mutação que falhar em
 * qualquer tela, sem precisar lembrar de adicionar tratamento em cada
 * `useMutation` um por um. O mobile não tem um componente de toast
 * próprio (`@rotta/ui` só define isso na variante web) — `Alert.alert` já
 * é nativo do React Native, funciona de fora de qualquer árvore de
 * componentes (igual `MutationCache.onError` exige) e não pede nenhuma
 * dependência nova.
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
            Alert.alert("Não deu certo", message);
          },
        }),
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
