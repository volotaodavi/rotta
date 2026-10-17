import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { familyBillingApi } from "@/lib/api-client";

/**
 * Quanto a família deve, quando vence e como está cada fatura.
 *
 * O escopo é o ALUNO: o backend prova a posse antes de devolver fatura
 * nenhuma (`FamilyBillingService.getPagamentosDoAluno`). O app nunca
 * pede fatura por id de contrato nem de transportadora.
 */
export function usePagamentosDoAluno(studentId: string | undefined) {
  return useQuery({
    queryKey: ["responsavel", "students", studentId, "pagamentos"],
    queryFn: () => familyBillingApi.getPagamentosDoAluno(studentId as string),
    enabled: Boolean(studentId),
  });
}

/**
 * Abre o Pix de uma fatura.
 *
 * O backend reaproveita a cobrança já criada para a mesma fatura, então
 * tocar duas vezes no botão não gera duas cobranças — a família não paga
 * duas vezes. Invalida os pagamentos no fim porque abrir o Pix grava o
 * meio de pagamento e o link da fatura.
 */
export function useAbrirPagamentoPix(studentId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (invoiceId: string) => familyBillingApi.abrirPagamentoPix(invoiceId),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ["responsavel", "students", studentId, "pagamentos"],
      });
    },
  });
}
