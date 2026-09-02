import type { ApiClient } from "../http";
import type { Role } from "./auth";

/**
 * Endpoints tipados de `company-join-pre-registrations` — tela
 * "Convites" (pedido do usuário 02/09/2026). Espelham exatamente
 * `apps/api/src/modules/company-join-pre-registrations` (DTOs de
 * request/response). Só o lado da Empresa/Gestor: pré-cadastrar o
 * celular/nome de quem já vai contratar, listar, cancelar.
 */

export type CompanyJoinPreRegistrationStatus = "PENDENTE" | "VINCULADO" | "CANCELADO";

export interface CompanyJoinPreRegistration {
  id: string;
  role: Role;
  nome: string | null;
  celular: string | null;
  status: CompanyJoinPreRegistrationStatus;
  vinculadoEm: string | null;
  createdAt: string;
}

export interface CreateCompanyJoinPreRegistrationInput {
  role: Role;
  nome?: string;
  celular?: string;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createCompanyJoinPreRegistrationsEndpoints(apiClient: ApiClient) {
  return {
    create: async (
      input: CreateCompanyJoinPreRegistrationInput,
    ): Promise<CompanyJoinPreRegistration> =>
      (
        await apiClient.request<ApiEnvelope<CompanyJoinPreRegistration>>(
          "/company-join-pre-registrations",
          { method: "POST", body: input },
        )
      ).data,

    list: async (): Promise<CompanyJoinPreRegistration[]> =>
      (
        await apiClient.request<ApiEnvelope<{ items: CompanyJoinPreRegistration[] }>>(
          "/company-join-pre-registrations",
        )
      ).data.items,

    cancel: async (id: string): Promise<CompanyJoinPreRegistration> =>
      (
        await apiClient.request<ApiEnvelope<CompanyJoinPreRegistration>>(
          `/company-join-pre-registrations/${id}`,
          { method: "DELETE" },
        )
      ).data,
  };
}
