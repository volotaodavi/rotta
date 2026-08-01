import { createApiClient, createCompaniesEndpoints } from "@rotta/api-client";
import { getStoredAccessToken } from "@rotta/auth";

import { env } from "@/config/env";

/**
 * Instância única do cliente de API do painel do cliente (Dossie 22, Secao 5.6).
 * `getStoredAccessToken` é a ponte temporária documentada em
 * `@rotta/auth` — substituída quando o módulo Auth real existir.
 */
const apiClient = createApiClient({
  baseUrl: env.NEXT_PUBLIC_API_URL,
  getAccessToken: () => getStoredAccessToken(),
});

export const companiesApi = createCompaniesEndpoints(apiClient);
