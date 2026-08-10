import { buildQueryString } from "../query.util";

import type { ApiClient } from "../http";

/**
 * Endpoints tipados do Analytics (Prompt 22/Dossiê 30) — Central de
 * Inteligência Operacional, exclusiva de Admin Rotta. Espelha
 * `apps/api/src/modules/analytics`.
 */

export interface NationalOperationalKpis {
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

export interface NationalBusinessKpis {
  mrrCentavos: number;
  arrCentavos: number;
  empresasAtivasPagantes: number;
  /** Sempre `null` nesta fase — ver `indisponibilidadeLtvCac` (stub honesto, Dossiê 30 §5). */
  ltvCentavos: number | null;
  cacCentavos: number | null;
  indisponibilidadeLtvCac: string;
}

export interface NationalPeriodKpis {
  de: string;
  ate: string;
  novasEmpresas: number;
  empresasCanceladas: number;
  churnRateAproximado: number;
  viagensRealizadas: number;
}

export interface NationalKpis {
  operacional: NationalOperationalKpis;
  negocio: NationalBusinessKpis;
  periodo: NationalPeriodKpis;
  periodoAnterior: NationalPeriodKpis;
  alertas: string[];
}

export interface NationalKpisParams {
  from?: string;
  to?: string;
}

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  peso: number;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createAnalyticsEndpoints(apiClient: ApiClient) {
  return {
    getNationalKpis: async (params: NationalKpisParams = {}): Promise<NationalKpis> =>
      (
        await apiClient.request<ApiEnvelope<NationalKpis>>(
          `/analytics/national/kpis${buildQueryString(params)}`,
        )
      ).data,

    getNationalHeatmap: async (): Promise<HeatmapPoint[]> =>
      (await apiClient.request<ApiEnvelope<HeatmapPoint[]>>("/analytics/national/heatmap")).data,

    exportNational: (
      params: NationalKpisParams & { format: "csv" | "excel" | "pdf" },
    ): Promise<Blob> =>
      apiClient.request<Blob>(`/analytics/national/export${buildQueryString(params)}`, {
        responseType: "blob",
      }),

    /** "Analytics AI" — sempre lança (stub honesto, `AnalyticsService.getAnomalies`); quem chama deve tratar o erro, nunca esperar dado real aqui. */
    getAnomalies: async (): Promise<never> => apiClient.request<never>("/analytics/anomalies"),
  };
}

export type AnalyticsEndpoints = ReturnType<typeof createAnalyticsEndpoints>;
