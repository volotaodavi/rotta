import { useAuth } from "@rotta/auth/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { CriarSubcontaAsaasInput } from "@rotta/api-client";

import { familyBillingApi } from "@/lib/api-client";

/** A mesma chave nos dois hooks: a criação escreve o que a leitura lê. */
const CHAVE = ["family-billing", "conta-de-recebimento"] as const;

/**
 * Para onde vai o dinheiro das mensalidades desta transportadora.
 *
 * `enabled` pelo papel, e não só pela rota: o endpoint é de
 * `EMPRESA`/`GESTOR`, e hoje a Carteira só é alcançada pelo
 * autônomo/MEI em Modo Ação (`VeiculoNavigator`). Se alguém mudar essa
 * navegação, um Motorista funcionário chegaria aqui e levaria 403 em
 * loop — a trava fica no hook, perto do dado, e não na tela.
 */
export function useContaDeRecebimento() {
  const { user } = useAuth();
  const podeVer = user?.role === "empresa" || user?.role === "gestor";

  return useQuery({
    queryKey: CHAVE,
    queryFn: () => familyBillingApi.getContaDeRecebimento(),
    enabled: podeVer,
  });
}

/**
 * Abre a conta de recebimento no provedor, sem o transportador sair da
 * Rotta.
 *
 * A resposta já traz a conta com o estado novo, então ela entra direto
 * no cache: a tela passa de "conta não aberta" para "em análise" sem um
 * segundo pedido de rede, que no celular é a diferença entre instantâneo
 * e piscada.
 */
export function useCriarSubcontaAsaas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CriarSubcontaAsaasInput) => familyBillingApi.criarSubcontaAsaas(input),
    onSuccess: (conta) => {
      queryClient.setQueryData(CHAVE, conta);
    },
  });
}
