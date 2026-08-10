import type { ApiClient } from "../http";

/**
 * Endpoints tipados do Dashboard (`DASH-01` a `DASH-07`, Prompt 22/
 * Dossiê 30) — espelha `apps/api/src/modules/dashboard`. Um único
 * endpoint (`GET /dashboard/me`), exclusivo de Motorista/Monitor/
 * Responsável — o backend decide qual sub-objeto preencher pelo papel
 * do usuário autenticado. Empresa/Gestor usam `companiesApi.getDashboard(id)`
 * (`GET /companies/:id/dashboard`, Dossiê 16/30 §3.1) — nunca este
 * endpoint, para não haver duas fontes do mesmo dado.
 */

export interface DashboardTripCounters {
  total: number;
  emAndamento: number;
  concluidas: number;
  canceladas: number;
}

export interface DriverDashboard {
  viagensHoje: DashboardTripCounters;
  documentosPendentesAnaliseIa: number;
  documentosVencendoEm30Dias: number;
}

export interface ResponsavelDashboard {
  filhosTotal: number;
  contratosAtivos: number;
  contratosTotal: number;
}

export interface DashboardMe {
  perfil: "motorista" | "responsavel";
  motorista?: DriverDashboard;
  responsavel?: ResponsavelDashboard;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createDashboardEndpoints(apiClient: ApiClient) {
  return {
    getMine: async (): Promise<DashboardMe> =>
      (await apiClient.request<ApiEnvelope<DashboardMe>>("/dashboard/me")).data,
  };
}

export type DashboardEndpoints = ReturnType<typeof createDashboardEndpoints>;
