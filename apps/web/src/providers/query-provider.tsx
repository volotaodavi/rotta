"use client";

import { ApiError, deveRepetirLeitura } from "@rotta/api-client";
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
            // Nunca repete 4xx — e repetir um 429 seria responder
            // "pare" com mais três requisições. Ver `retry-policy.ts`.
            retry: deveRepetirLeitura,
            staleTime: 30_000,
            refetchOnWindowFocus: true,
            refetchOnReconnect: true,
            /*
              Atualização sozinha, por padrão (pedido do usuário
              02/10/2026: "não atualiza de forma automática. Isso é em
              toda web").

              O motivo era este: atualizar sozinho era OPT-IN. Cada
              hook que lembrava escrevia o seu `refetchInterval` (GPS,
              viagens, despacho, portal da escola, status do Asaas), e
              todo o resto nunca se atualizava enquanto a tela ficava
              aberta — notificações, pedidos de vínculo da equipe,
              pré-cadastros de aluno, chamados, alunos, rotas,
              veículos. Dado mudado por OUTRA pessoa (um motorista, uma
              família, o Admin) só aparecia com F5. Agora o padrão é o
              contrário: toda leitura se atualiza, e quem não deve
              desliga explicitamente (`refetchInterval: false` nas
              consultas que custam chamada externa, como geocodificação
              e traçado de rota).

              60s e não menos: é a cadência que os hooks que já faziam
              isso escolheram, fica muito abaixo do limite do backend
              (90 requisições por 10s por conta, `throttler.options.ts`)
              e dá pra uma tela com meia dúzia de consultas sem chegar
              perto de qualquer teto.
            */
            refetchInterval: 60_000,
            /*
              Explícito, mesmo sendo o padrão da biblioteca: aba
              escondida NÃO fica consultando. Quem minimizou o
              navegador não gera tráfego nenhum, e o
              `refetchOnWindowFocus` acima já traz tudo atualizado no
              instante em que a pessoa volta.
            */
            refetchIntervalInBackground: false,
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
