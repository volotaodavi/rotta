import {
  createAccountDeletionEndpoints,
  createAdminAccountsEndpoints,
  createAnalyticsEndpoints,
  createAnnouncementsEndpoints,
  createApiClient,
  createAuthEndpoints,
  createBackofficeEndpoints,
  createBillingEndpoints,
  createClientErrorsEndpoints,
  createCompaniesEndpoints,
  createCompanyServiceAreasEndpoints,
  createSchoolPortalContasEndpoints,
  createGeoEndpoints,
  createGpsEndpoints,
  createHealthEndpoints,
  createIdentityVerificationEndpoints,
  createLegalDocumentsEndpoints,
  createMarketplaceEndpoints,
  createNotificationsEndpoints,
  createPlanNoticesEndpoints,
  createRoutesEndpoints,
  createSchoolsEndpoints,
  createStudentsEndpoints,
  createSupportEndpoints,
  createTripsEndpoints,
  createVehiclesEndpoints,
} from "@rotta/api-client";
import { getAccessToken, requestTokenRefresh } from "@rotta/auth/web";

import { env } from "@/config/env";

/**
 * Instância única do cliente de API do Admin Rotta (Dossie 22, Secao 5.6).
 * `getAccessToken` lê o token em memória mantido por `AuthProvider`
 * (Dossiê 15) — nunca `localStorage` (Dossiê 12 §4.6).
 *
 * `refreshAccessToken` (ver `http.ts#ApiClientConfig`) fecha o BUG REAL
 * de produção "está dando erro na plataforma dos admins, por
 * completo... clico e dá erro" (usuário, 03/09/2026) — sem isto, um
 * `access_token` expirado enquanto a aba ficava em segundo plano (o
 * refresh proativo por timer atrasa nesse caso) derrubava TODA ação
 * subsequente com 401, sem nenhuma tentativa de recuperação sozinha.
 */
const apiClient = createApiClient({
  baseUrl: env.NEXT_PUBLIC_API_URL,
  getAccessToken: () => getAccessToken(),
  refreshAccessToken: () => requestTokenRefresh(),
  platform: "web",
});

/**
 * O pulso da plataforma, para o escritório 3D saber o quanto a Rotta
 * está em movimento agora. Chamado direto em vez de passar por
 * `@rotta/api-client` porque é uma rota só, exclusiva do Admin, e
 * acrescentar um pacote de endpoints inteiro para ela seria cerimônia
 * sem ganho.
 */
export interface PulsoDaPlataforma {
  medidoEm: string;
  viagensEmAndamento: number;
  posicoesNaUltimaHora: number;
  eventosDeAluno24h: number;
  contasNovas24h: number;
  errosDeCliente24h: number;
  carga: number;
}

export const plataformaApi = {
  pulso: async (): Promise<PulsoDaPlataforma> =>
    (await apiClient.request<{ data: PulsoDaPlataforma }>("/plataforma/pulso")).data,
};

export const accountDeletionApi = createAccountDeletionEndpoints(apiClient);
export const authApi = createAuthEndpoints(apiClient);
export const clientErrorsApi = createClientErrorsEndpoints(apiClient);
export const companiesApi = createCompaniesEndpoints(apiClient);
export const companyServiceAreasApi = createCompanyServiceAreasEndpoints(apiClient);
export const schoolPortalContasApi = createSchoolPortalContasEndpoints(apiClient);
export const vehiclesApi = createVehiclesEndpoints(apiClient);
export const schoolsApi = createSchoolsEndpoints(apiClient);
export const studentsApi = createStudentsEndpoints(apiClient);
export const marketplaceApi = createMarketplaceEndpoints(apiClient);
export const geoApi = createGeoEndpoints(apiClient);
export const notificationsApi = createNotificationsEndpoints(apiClient);
export const routesApi = createRoutesEndpoints(apiClient);
export const tripsApi = createTripsEndpoints(apiClient);
export const gpsApi = createGpsEndpoints(apiClient);
export const supportApi = createSupportEndpoints(apiClient);
export const announcementsApi = createAnnouncementsEndpoints(apiClient);
export const backofficeApi = createBackofficeEndpoints(apiClient);
export const analyticsApi = createAnalyticsEndpoints(apiClient);
export const healthApi = createHealthEndpoints(apiClient);
export const legalDocumentsApi = createLegalDocumentsEndpoints(apiClient);
export const identityVerificationApi = createIdentityVerificationEndpoints(apiClient);
export const billingApi = createBillingEndpoints(apiClient);
export const planNoticesApi = createPlanNoticesEndpoints(apiClient);
export const adminAccountsApi = createAdminAccountsEndpoints(apiClient);
