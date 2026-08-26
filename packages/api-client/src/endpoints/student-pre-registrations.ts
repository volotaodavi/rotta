import type { ApiClient } from "../http";

/**
 * Endpoints tipados de `student-pre-registrations` (pedido do usuário:
 * "no painel do admin deverá ter essa opção de cadastrar alunos por
 * transporte + responsável" + "o responsável ao entrar no app/web
 * deverá colocar o código único do transporte") — espelham exatamente
 * `apps/api/src/modules/student-pre-registrations`. `create`/`list`/
 * `cancel` são do lado da Empresa/Gestor; `lookup`/`claim` são do lado
 * do Responsável, ANTES de ter qualquer aluno cadastrado.
 */

export type StudentPreRegistrationStatus = "PENDENTE" | "RECLAMADO" | "CONCLUIDO" | "CANCELADO";

export interface StudentPreRegistration {
  id: string;
  companyId: string;
  nomeAluno: string;
  nomeResponsavel: string;
  celularResponsavel: string;
  status: StudentPreRegistrationStatus;
  createdAt: string;
}

export interface CreateStudentPreRegistrationInput {
  nomeAluno: string;
  nomeResponsavel: string;
  celularResponsavel: string;
}

/** Resultado de "buscar pelo código + celular" — só o essencial pra montar a tela "Continuar"/"Corrigir". */
export interface StudentPreRegistrationLookupResult {
  id: string;
  companyName: string;
  nomeAluno: string;
  nomeResponsavel: string;
}

/** Prévia pública da transportadora pelo código, independente de haver pré-cadastro (área pública de convite). */
export interface CompanyPreviewResult {
  companyId: string;
  companyName: string;
}

export interface ClaimStudentPreRegistrationResult extends StudentPreRegistrationLookupResult {
  companyId: string;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createStudentPreRegistrationsEndpoints(apiClient: ApiClient) {
  return {
    /** Empresa/Gestor — pré-cadastra um aluno (nome + nome/celular do responsável). */
    create: async (input: CreateStudentPreRegistrationInput): Promise<StudentPreRegistration> =>
      (
        await apiClient.request<ApiEnvelope<StudentPreRegistration>>("/student-pre-registrations", {
          method: "POST",
          body: input,
        })
      ).data,

    /** Empresa/Gestor — lista os pré-cadastros da própria empresa. */
    list: async (): Promise<StudentPreRegistration[]> =>
      (
        await apiClient.request<ApiEnvelope<{ items: StudentPreRegistration[] }>>(
          "/student-pre-registrations",
        )
      ).data.items,

    cancel: async (id: string): Promise<StudentPreRegistration> =>
      (
        await apiClient.request<ApiEnvelope<StudentPreRegistration>>(
          `/student-pre-registrations/${id}`,
          { method: "DELETE" },
        )
      ).data,

    /** Pública (área de convite) — prévia da transportadora pelo código, `null` quando o código não existe. */
    previewCompany: async (codigoInterno: string): Promise<CompanyPreviewResult | null> =>
      (
        await apiClient.request<ApiEnvelope<CompanyPreviewResult | null>>(
          `/student-pre-registrations/company-preview?codigoInterno=${encodeURIComponent(codigoInterno)}`,
        )
      ).data,

    /** Pública (área de convite) — "código do transporte + celular"; `null` quando não bate nada (nunca um erro). */
    lookup: async (
      codigoInterno: string,
      celular: string,
    ): Promise<StudentPreRegistrationLookupResult | null> =>
      (
        await apiClient.request<ApiEnvelope<StudentPreRegistrationLookupResult | null>>(
          `/student-pre-registrations/lookup?codigoInterno=${encodeURIComponent(codigoInterno)}&celular=${encodeURIComponent(celular)}`,
        )
      ).data,

    /** Caminho "Continuar" — reivindica o pré-cadastro encontrado. */
    claim: async (id: string): Promise<ClaimStudentPreRegistrationResult> =>
      (
        await apiClient.request<ApiEnvelope<ClaimStudentPreRegistrationResult>>(
          `/student-pre-registrations/${id}/claim`,
          { method: "POST" },
        )
      ).data,
  };
}

export type StudentPreRegistrationsEndpoints = ReturnType<
  typeof createStudentPreRegistrationsEndpoints
>;
