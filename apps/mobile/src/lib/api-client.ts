import {
  createApiClient,
  createAuthEndpoints,
  createGeoEndpoints,
  createMarketplaceEndpoints,
  createNotificationsEndpoints,
  createSchoolsEndpoints,
  createStudentsEndpoints,
  createVehiclesEndpoints,
} from "@rotta/api-client";
import { getAccessToken } from "@rotta/auth/native";

import { env } from "@/config/env";

/**
 * Instância única do cliente de API do app mobile (Dossie 22, Secao 5.6) —
 * mesma Core API e mesma conta de `apps/web`/`apps/admin` (Dossiê 15:
 * "todas as plataformas compartilharão exatamente a mesma conta").
 * `getAccessToken` lê o token em memória mantido por `AuthProvider`.
 */
const apiClient = createApiClient({
  baseUrl: env.EXPO_PUBLIC_API_URL,
  getAccessToken: () => getAccessToken(),
});

export const authApi = createAuthEndpoints(apiClient);
export const vehiclesApi = createVehiclesEndpoints(apiClient);
export const schoolsApi = createSchoolsEndpoints(apiClient);
export const studentsApi = createStudentsEndpoints(apiClient);
export const marketplaceApi = createMarketplaceEndpoints(apiClient);
export const geoApi = createGeoEndpoints(apiClient);
export const notificationsApi = createNotificationsEndpoints(apiClient);
