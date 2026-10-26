"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  ContaDeRecebimentoComConvite,
  ContractInvoiceStatus,
  CriarAssinaturaDaFamiliaInput,
  CriarSubcontaInput,
} from "@rotta/api-client";

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
export function useCriarSubconta() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CriarSubcontaInput) => familyBillingApi.criarSubconta(input),
    /* A criação devolve a conta, e o cache guarda o envelope. Sem
       `dadosParaAbrirConta`, de propósito: a subconta agora existe, e
       não há mais o que conferir antes de enviar. */
    onSuccess: (conta) => {
      queryClient.setQueryData<ContaDeRecebimentoComConvite>(
        ["family-billing", "conta-de-recebimento"],
        { conta },
      );
    },
  });
}

/** Os contratos da transportadora, com o estado da cobrança mensal de cada um. */
export function useContratosParaCobrar() {
  return useQuery({
    queryKey: ["family-billing", "contratos-para-cobrar"],
    queryFn: () => familyBillingApi.listarContratosParaCobrar(),
  });
}

/**
 * Liga a cobrança mensal automática de um contrato.
 *
 * Invalida a lista e as faturas: a recorrência já cria a cobrança do
 * primeiro mês (o provedor gera até 40 dias antes do vencimento), então
 * a tabela de mensalidades pode mudar junto.
 */
export function useCriarAssinaturaDoContrato() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      contractId,
      input,
    }: {
      contractId: string;
      input: CriarAssinaturaDaFamiliaInput;
    }) => familyBillingApi.criarAssinaturaDoContrato(contractId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["family-billing", "contratos-para-cobrar"],
      });
      void queryClient.invalidateQueries({ queryKey: ["family-billing", "invoices"] });
    },
  });
}
