import { buildQueryString } from "../query.util";

import type { ApiClient } from "../http";

/**
 * Endpoints tipados do Backoffice (Prompt 21 / Dossiê 29) — tela
 * inicial e "Acessar como suporte" do Admin Rotta. Espelha
 * `apps/api/src/modules/backoffice`, exclusivo de `Role.ADMIN_ROTTA`.
 */

export interface BackofficeDashboard {
  empresasPorStatus: Record<string, number>;
  empresasTotal: number;
  motoristasAtivos: number;
  monitoresAtivos: number;
  veiculosTotal: number;
  alunosTotal: number;
  viagensHoje: number;
  chamadosAbertos: number;
  documentosMotoristaPendentes: number;
  documentosVeiculoPendentes: number;
  contratosAguardandoAssinatura: number;
  aprovacoesPendentesTotal: number;
}

export interface PendingDriverDocument {
  id: string;
  companyId: string;
  companyNome: string;
  userId: string;
  userNome: string;
  tipo: string;
  rottaAiStatus: string;
  createdAt: string;
}

export interface PendingVehicleDocument {
  id: string;
  companyId: string;
  companyNome: string;
  vehicleId: string;
  vehiclePlaca: string;
  tipo: string;
  rottaAiStatus: string;
  createdAt: string;
}

export interface PendingContract {
  id: string;
  companyId: string;
  companyNome: string;
  studentNome: string;
  status: string;
  createdAt: string;
}

export interface ApprovalQueue {
  documentosMotorista: PendingDriverDocument[];
  documentosVeiculo: PendingVehicleDocument[];
  contratos: PendingContract[];
}

interface ApiEnvelope<T> {
  data: T;
}

export function createBackofficeEndpoints(apiClient: ApiClient) {
  return {
    getDashboard: async (): Promise<BackofficeDashboard> =>
      (await apiClient.request<ApiEnvelope<BackofficeDashboard>>("/backoffice/dashboard")).data,

    listApprovals: async (limit?: number): Promise<ApprovalQueue> =>
      (
        await apiClient.request<ApiEnvelope<ApprovalQueue>>(
          `/backoffice/approvals${buildQueryString({ limit })}`,
        )
      ).data,

    /** `ADM-01`/`RN-10`: exige justificativa, sempre auditado. */
    accessAsSupport: async (
      companyId: string,
      motivo: string,
    ): Promise<{ id: string; nomeFantasia: string }> =>
      (
        await apiClient.request<ApiEnvelope<{ id: string; nomeFantasia: string }>>(
          `/backoffice/companies/${companyId}/access-as-support`,
          { method: "POST", body: { motivo } },
        )
      ).data,
  };
}

export type BackofficeEndpoints = ReturnType<typeof createBackofficeEndpoints>;
