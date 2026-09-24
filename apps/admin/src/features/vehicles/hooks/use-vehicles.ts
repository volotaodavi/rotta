"use client";

import { useToast } from "@rotta/ui/web";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type {
  ItemRastreador,
  ListVehicleCategoryReviewParams,
  ListVehiclesParams,
  ResolveVehicleCategoryReviewInput,
  ReviewVehicleInput,
  VehicleStatus,
} from "@rotta/api-client";

import { vehiclesApi } from "@/lib/api-client";

/** Mensagem de erro legível — mesmo padrão de `use-identity-verification-admin.ts`. */
function errorMessage(error: unknown, fallback: string): string {
  return error instanceof Error && error.message ? error.message : fallback;
}

/**
 * Hooks de dados do módulo Veículos (visão cross-tenant do Admin Rotta) —
 * mesmo padrão de `use-companies.ts`. Apenas leitura + troca de status,
 * já que o Admin Rotta não cadastra veículos (nenhuma empresa própria).
 */
export function useVehiclesList(params: ListVehiclesParams) {
  return useQuery({
    queryKey: ["vehicles", params],
    queryFn: () => vehiclesApi.list(params),
  });
}

export function useVehicle(id: string) {
  return useQuery({
    queryKey: ["vehicles", id],
    queryFn: () => vehiclesApi.getById(id),
    enabled: Boolean(id),
  });
}

export function useVehicleAuditLogs(id: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["vehicles", id, "audit-logs", page, pageSize],
    queryFn: () => vehiclesApi.listAuditLogs(id, page, pageSize),
    enabled: Boolean(id),
  });
}

/**
 * Ocorrências do veículo (auditoria 31/08/2026, pedido do usuário: "as
 * ações do motorista/monitor refletindo?") — antes não existia NENHUMA
 * tela do Admin pra ver `VehicleOccurrence`, apesar do endpoint
 * (`GET /vehicles/:id/occurrences`) já liberar `ADMIN_ROTTA` em
 * `READ_ROLES`. `refetchInterval` (mesmo valor de `apps/web`) pra uma
 * ocorrência nova aparecer aqui sem precisar recarregar a página.
 */
export function useVehicleOccurrences(id: string, page = 1, pageSize = 20) {
  return useQuery({
    queryKey: ["vehicles", id, "occurrences", page, pageSize],
    queryFn: () => vehiclesApi.listOccurrences(id, page, pageSize),
    enabled: Boolean(id),
    refetchInterval: 30_000,
  });
}

export function useUpdateVehicleStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: VehicleStatus) => vehiclesApi.updateStatus(id, status),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles", id] });
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
  });
}

/** Fila `/veiculos/revisao-categoria` (Frente AL) — só veículos com `categoriaRevisaoStatus = PENDENTE`. */
export function useVehicleCategoryReviewList(params: ListVehicleCategoryReviewParams) {
  return useQuery({
    queryKey: ["vehicles", "revisao-categoria", params],
    queryFn: () => vehiclesApi.listCategoryReview(params),
    // Fila de revisão — um veículo novo cai aqui sozinho (pedido do
    // usuário 05/09/2026: "cada novidade aparecerá de forma automática,
    // sem precisar de atualização no painel?").
    refetchInterval: 60_000,
  });
}

/** Confirma (sem `categoria`) ou corrige (com `categoria` diferente) a sugestão da IA. */
export function useResolveVehicleCategoryReview(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (input: ResolveVehicleCategoryReviewInput) =>
      vehiclesApi.resolveCategoryReview(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles", "revisao-categoria"] });
      void queryClient.invalidateQueries({ queryKey: ["vehicles", id] });
      toast.success(variables.categoria ? "Categoria corrigida." : "Sugestão da IA confirmada.");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Não foi possível registrar a revisão."), "Falha ao revisar");
    },
  });
}

/**
 * Credenciamento de um LOTE de rastreadores (24/09/2026) — primeira
 * instalação, a planilha do instalador inteira de uma vez.
 *
 * Sem `toast` de sucesso aqui de propósito: o resultado é PARCIAL, e
 * quem sabe se houve linha recusada é a tela, que mostra a lista. Um
 * "importado com sucesso" automático mentiria quando 3 das 40 linhas
 * ficaram de fora.
 */
export function useImportarRastreadores() {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: ({ companyId, itens }: { companyId: string; itens: ItemRastreador[] }) =>
      vehiclesApi.importarRastreadores(companyId, itens),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
    },
    onError: (error) => {
      toast.error(
        errorMessage(error, "Não foi possível credenciar o lote."),
        "Falha na importação",
      );
    },
  });
}

/**
 * Credenciamento inicial do rastreador (fluxo público, 22/09/2026).
 *
 * É a etapa que casa o aparelho físico ao ônibus: a partir daqui, toda
 * posição que chegar com este IMEI vira posição deste ônibus. Só o
 * Admin da Rotta faz — depois disso o despachante opera sozinho.
 * `imei` vazio DESVINCULA, que é como o aparelho muda de carro.
 */
export function useCredenciarRastreador(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (imei?: string) => vehiclesApi.credenciarRastreador(id, imei),
    onSuccess: (_data, imei) => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success(imei ? "Rastreador credenciado." : "Rastreador desvinculado.");
    },
    onError: (error) => {
      toast.error(
        errorMessage(error, "Não foi possível credenciar o rastreador."),
        "Falha no credenciamento",
      );
    },
  });
}

/**
 * Epic A — aprova/reprova um veículo (camada ADICIONAL sobre o
 * "pré-aprovado" automático). Invalida tanto a lista da empresa quanto o
 * veículo individual, já que os dois lugares mostram `revisaoAdminStatus`.
 */
export function useReviewVehicle(id: string) {
  const queryClient = useQueryClient();
  const toast = useToast();
  return useMutation({
    mutationFn: (input: ReviewVehicleInput) => vehiclesApi.reviewVehicle(id, input),
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      toast.success(variables.status === "APROVADO" ? "Veículo aprovado." : "Veículo reprovado.");
    },
    onError: (error) => {
      toast.error(errorMessage(error, "Não foi possível registrar a decisão."), "Falha ao revisar");
    },
  });
}
