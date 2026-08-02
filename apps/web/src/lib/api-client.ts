import { createApiClient, createAuthEndpoints, createCompaniesEndpoints } from "@rotta/api-client";
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

export const authApi = createAuthEndpoints(apiClient);
export const companiesApi = createCompaniesEndpoints(apiClient);
