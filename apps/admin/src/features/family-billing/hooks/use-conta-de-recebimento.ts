"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ContaDeRecebimentoComConvite, CriarSubcontaInput } from "@rotta/api-client";

import { familyBillingApi } from "@/lib/api-client";

function chaveDa(companyId: string) {
  return ["family-billing", "conta-de-recebimento", companyId] as const;
}

/**
 * Para onde vai o dinheiro das mensalidades de UMA transportadora.
 *
 * Nunca traz a chave de API da subconta: a resposta da API expõe só
 * `podeEmitirPelaSubconta`, um booleano. Nem o painel do fundador vê o
 * valor, e é de propósito — o compromisso assumido quando guardar chave
 * de terceiro foi autorizado, em 20/10/2026, foi "nunca em log nem em
 * resposta de API", e painel de admin é resposta de API como qualquer
 * outra.
 */
export function useContaDeRecebimentoDaEmpresa(companyId: string) {
  return useQuery({
    queryKey: chaveDa(companyId),
    queryFn: () => familyBillingApi.getContaDeRecebimentoDaEmpresa(companyId),
  });
}

/**
 * Abre a conta de recebimento PELA transportadora.
 *
 * Existe porque o fundador pediu, em 20/10/2026, poder ajudar o
 * transportador na hora de montar a cobrança. A API recusa a segunda
 * subconta da mesma transportadora, então não há como o atalho do
 * painel atropelar o que ela já tem.
 */
export function useCriarSubcontaDaEmpresa(companyId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CriarSubcontaInput) =>
      familyBillingApi.criarSubcontaParaEmpresa(companyId, input),
    /* Sem `dadosParaAbrirConta`: a subconta agora existe, e nao ha
       mais cadastro para conferir antes de enviar. */
    onSuccess: (conta) => {
      queryClient.setQueryData<ContaDeRecebimentoComConvite>(chaveDa(companyId), { conta });
    },
  });
}
