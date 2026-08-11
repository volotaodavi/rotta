import type { ApiClient } from "../http";

/**
 * Endpoints tipados de Health (Dossiê 44 — PROMPT ROTTA INTEGRATION &
 * INTELLIGENCE AUDIT ENGINE) — espelha `apps/api/src/health`.
 * `getIntegrationsHealth` é exclusivo de `Role.ADMIN_ROTTA` (painel
 * "Rotta Control Center").
 */

export type IntegrationStatusLevel = "healthy" | "degraded" | "down" | "not_configured" | "unknown";

export interface IntegrationHealthSnapshot {
  integration: string;
  status: IntegrationStatusLevel;
  lastSuccessAt: string | null;
  lastFailureAt: string | null;
  lastError: string | null;
  lastLatencyMs: number | null;
  consecutiveFailures: number;
}

export interface HealthScore {
  value: number;
  consideredComponents: number;
  healthyComponents: number;
  note: string;
}

export interface IntegrationsHealthResponse {
  status: "ok" | "degraded" | "down";
  database: boolean;
  cache: boolean;
  integrations: IntegrationHealthSnapshot[];
  score: HealthScore;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createHealthEndpoints(apiClient: ApiClient) {
  return {
    getIntegrationsHealth: async (): Promise<IntegrationsHealthResponse> =>
      (await apiClient.request<ApiEnvelope<IntegrationsHealthResponse>>("/health/integrations"))
        .data,
  };
}

export type HealthEndpoints = ReturnType<typeof createHealthEndpoints>;
