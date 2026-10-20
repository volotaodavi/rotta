"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ContractInvoiceStatus, CriarSubcontaAsaasInput } from "@rotta/api-client";

import { familyBillingApi } from "@/lib/api-client";

/**
 * As contas a receber das famílias — o outro lado da fatura que o
 * Responsável vê no app.
 *
 * Não confundir com `use-company#useAsaasCheckoutStatus`: aquele é a
 * Rotta cobrando a transportadora pela plataforma. Aqui é a
 * transportadora cobrando as famílias pelo transporte.
 */
export function useFaturasDaEmpresa(params: {
  status?: ContractInvoiceStatus;
  competencia?: string;
  page?: number;
}) {
  return useQuery({
    queryKey: ["family-billing", "invoices", params],
    queryFn: () => familyBillingApi.listInvoices({ ...params, pageSize: 20 }),
  });
}

export function useContaDeRecebimento() {
  return useQuery({
    queryKey: ["family-billing", "conta-de-recebimento"],
    queryFn: () => familyBillingApi.getContaDeRecebimento(),
  });
}

export function useSalvarContaDeRecebimento() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: { chavePix: string }) => familyBillingApi.salvarContaDeRecebimento(input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["family-billing", "conta-de-recebimento"],
      });
    },
  });
}

/**
 * Abre a conta de recebimento no Asaas, de dentro da Rotta.
 *
 * O formulário pede um campo porque os outros já estão no cadastro da
 * transportadora. A resposta já traz a conta com o estado novo, então
 * ela entra direto no cache em vez de esperar um segundo GET: a tela
 * muda de "sem conta" para "em análise" no mesmo instante.
 */
export function useCriarSubcontaAsaas() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CriarSubcontaAsaasInput) => familyBillingApi.criarSubcontaAsaas(input),
    onSuccess: (conta) => {
      queryClient.setQueryData(["family-billing", "conta-de-recebimento"], conta);
    },
  });
}
