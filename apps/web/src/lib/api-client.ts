import {
  createAgendaEndpoints,
  createApiClient,
  createAuthEndpoints,
  createBillingEndpoints,
  createClientErrorsEndpoints,
  createCompaniesEndpoints,
  createCompanyJoinRequestsEndpoints,
  createDriversEndpoints,
  createGeoEndpoints,
  createGpsEndpoints,
  createIdentityVerificationEndpoints,
  createMarketplaceEndpoints,
  createNotificationsEndpoints,
  createRottaAiEndpoints,
  createRoutesEndpoints,
  createSchoolsEndpoints,
  createStudentPreRegistrationsEndpoints,
  createStudentsEndpoints,
  createSupportEndpoints,
  createTripsEndpoints,
  createVehiclesEndpoints,
  createWalletEndpoints,
} from "@rotta/api-client";
import { getAccessToken } from "@rotta/auth/web";

import { env } from "@/config/env";

/**
 * Instância única do cliente de API do painel do cliente (Dossie 22, Secao 5.6).
 * `getAccessToken` lê o token em memória mantido por `AuthProvider`
 * (Dossiê 15) — nunca `localStorage` (Dossiê 12 §4.6).
 */
const apiClient = createApiClient({
  baseUrl: env.NEXT_PUBLIC_API_URL,
  getAccessToken: () => getAccessToken(),
});

export const agendaApi = createAgendaEndpoints(apiClient);
export const authApi = createAuthEndpoints(apiClient);
export const billingApi = createBillingEndpoints(apiClient);
export const clientErrorsApi = createClientErrorsEndpoints(apiClient);
export const companiesApi = createCompaniesEndpoints(apiClient);
export const driversApi = createDriversEndpoints(apiClient);
export const companyJoinRequestsApi = createCompanyJoinRequestsEndpoints(apiClient);
export const vehiclesApi = createVehiclesEndpoints(apiClient);
export const schoolsApi = createSchoolsEndpoints(apiClient);
export const studentsApi = createStudentsEndpoints(apiClient);
export const studentPreRegistrationsApi = createStudentPreRegistrationsEndpoints(apiClient);
export const marketplaceApi = createMarketplaceEndpoints(apiClient);
export const geoApi = createGeoEndpoints(apiClient);
export const notificationsApi = createNotificationsEndpoints(apiClient);
export const routesApi = createRoutesEndpoints(apiClient);
export const rottaAiApi = createRottaAiEndpoints(apiClient);
export const tripsApi = createTripsEndpoints(apiClient);
export const gpsApi = createGpsEndpoints(apiClient);
export const walletApi = createWalletEndpoints(apiClient);
export const supportApi = createSupportEndpoints(apiClient);
export const identityVerificationApi = createIdentityVerificationEndpoints(apiClient);
