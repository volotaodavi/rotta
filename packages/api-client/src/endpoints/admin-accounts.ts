import type { AdminRottaPapel } from "./auth";
import type { ApiClient } from "../http";

/**
 * Endpoints tipados de "Contas Admin" (pedido do usuário 03/09/2026:
 * "crie outros acessos para o painel do admin") — espelha
 * `apps/api/src/modules/admin-accounts`. Único jeito de criar/gerenciar
 * uma conta `isAdminRotta: true` — restrito a `AdminRottaPapel.GERAL`
 * (o backend recusa qualquer outro papel, `AdminAreaGuard`).
 */

export type AdminAccountStatus = "ATIVO" | "INATIVO";

export interface AdminAccount {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  papel: AdminRottaPapel;
  status: AdminAccountStatus;
  createdAt: string;
}

export interface CreateAdminAccountInput {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  senha: string;
  papel: AdminRottaPapel;
}

export interface UpdateAdminAccountInput {
  papel?: AdminRottaPapel;
  status?: AdminAccountStatus;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createAdminAccountsEndpoints(apiClient: ApiClient) {
  return {
    list: async (): Promise<AdminAccount[]> =>
      (await apiClient.request<ApiEnvelope<AdminAccount[]>>("/admin-accounts")).data,

    create: async (input: CreateAdminAccountInput): Promise<AdminAccount> =>
      (
        await apiClient.request<ApiEnvelope<AdminAccount>>("/admin-accounts", {
          method: "POST",
          body: input,
        })
      ).data,

    update: async (id: string, input: UpdateAdminAccountInput): Promise<AdminAccount> =>
      (
        await apiClient.request<ApiEnvelope<AdminAccount>>(`/admin-accounts/${id}`, {
          method: "PATCH",
          body: input,
        })
      ).data,
  };
}

export type AdminAccountsEndpoints = ReturnType<typeof createAdminAccountsEndpoints>;
