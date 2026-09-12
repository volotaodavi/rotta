import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  CreateIdentityVerificationSessionInput,
  IdentityVerificationSessionResponse,
  IdentityVerificationStatusResponse,
} from "@rotta/api-client";

import { identityVerificationApi } from "@/lib/api-client";

const QUERY_KEY = ["identity-verification", "me"];

/**
 * Status da verificação de identidade do Motorista/Monitor/dono
 * autônomo-MEI logado — consultado pelo `RootNavigator` (Frente J) para
 * o bloqueio total enquanto `status !== "APROVADA"`, mesmo raciocínio de
 * `(dashboard)/layout.tsx` em apps/web. `enabled` default `true` — quem
 * chama passa `false` fora desses papéis (o backend nem aceita este
 * endpoint pra outros papéis).
 */
export function useMyIdentityVerification(options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => identityVerificationApi.getMyStatus(),
    enabled: options?.enabled ?? true,
  });
}

/**
 * Cria a sessão hospedada na Didit — mirror de
 * `apps/web/.../use-identity-verification.ts`. `session.url` é a URL
 * da PRÓPRIA Didit (`verify.didit.me/...`), nunca uma página nossa —
 * quem chama abre isso direto numa `WebView` (Frente 12/09/2026,
 * pedido do usuário: "não deve parecer com a web, mas sim o app
 * próprio" — antes esta tela abria `/verificacao-identidade` do Painel
 * Web, que exigia um SEGUNDO login, sessão web isolada da nativa).
 * Chamar `POST /identity-verification/me/sessions` direto com o token
 * nativo já autenticado elimina esse segundo login por completo.
 */
export function useCreateIdentityVerificationSession() {
  const queryClient = useQueryClient();
  return useMutation<
    IdentityVerificationSessionResponse,
    unknown,
    CreateIdentityVerificationSessionInput | undefined
  >({
    mutationFn: (input) => identityVerificationApi.createMySession(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
  });
}

/**
 * Sincroniza (pull) o status direto na Didit — mesmo motivo do
 * equivalente Web: enquanto o webhook não aplica nada (destino mal
 * configurado, entrega falhando etc.), um `refetch()` comum nunca muda
 * (só um `SELECT` no nosso banco). Este hook chama
 * `POST /identity-verification/me/refresh`, que busca a decisão direto
 * na Didit e já devolve o status atualizado.
 */
export function useRefreshMyIdentityVerification() {
  const queryClient = useQueryClient();
  return useMutation<IdentityVerificationStatusResponse, unknown, void>({
    mutationFn: () => identityVerificationApi.refreshMyStatus(),
    onSuccess: (result) => {
      queryClient.setQueryData(QUERY_KEY, result);
    },
  });
}
