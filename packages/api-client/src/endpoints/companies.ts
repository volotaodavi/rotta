import { buildQueryString, omitEmptyOptionalStrings } from "../query.util";

import type { ApiClient } from "../http";

/**
 * Endpoints tipados do módulo Empresas (Dossiê 16) — espelham
 * exatamente `apps/api/src/modules/companies` (DTOs de request/response).
 * Nenhuma tela chama `apiClient.request` diretamente para uma rota de
 * Empresas — sempre por uma destas funções.
 */

/** Frente AN — `SLU`/`EIRELI` saíram (raros no público-alvo da Rotta), entraram `SA`/`COOPERATIVA`/`SOCIEDADE_SIMPLES`. */
export type CompanyType =
  "AUTONOMO" | "MEI" | "LTDA" | "SA" | "COOPERATIVA" | "SOCIEDADE_SIMPLES" | "OUTRO";
export type CompanyStatus = "TRIAL" | "ATIVO" | "SUSPENSO" | "CANCELADO" | "INADIMPLENTE";

/**
 * Rótulo exibido do tipo societário — reaproveitado pelos dois
 * formulários de cadastro (`apps/web/.../criar-conta/empresa`,
 * `apps/admin/.../empresas/nova`) e pela exibição no detalhe do Admin
 * (`apps/admin/.../empresas/[id]`), pra nunca mostrar o enum cru
 * ("SA") nem duplicar os textos em 3 lugares.
 */
export const COMPANY_TYPE_LABEL: Record<CompanyType, string> = {
  AUTONOMO: "Motorista Autônomo",
  MEI: "MEI",
  LTDA: "LTDA",
  SA: "S/A",
  COOPERATIVA: "Cooperativa",
  SOCIEDADE_SIMPLES: "Sociedade Simples",
  OUTRO: "Outro",
};

export interface CompanyAdminInput {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  senha: string;
}

export interface CreateCompanyInput {
  razaoSocial: string;
  nomeFantasia: string;
  cpfCnpj: string;
  tipo: CompanyType;
  email: string;
  telefone: string;
  whatsapp?: string;
  cep: string;
  endereco: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  latitude?: number;
  longitude?: number;
  corPrimaria?: string;
  idioma?: string;
  fusoHorario?: string;
  planCode?: string;
  administrador: CompanyAdminInput;
}

export type UpdateCompanyInput = Partial<
  Omit<CreateCompanyInput, "cpfCnpj" | "tipo" | "administrador" | "planCode">
>;

export interface CompanyPlan {
  id: string;
  code: string;
  name: string;
  priceCents: number;
}

export interface Company {
  id: string;
  /** Frente M — código único da transportadora (ex. `TRN-000001`), informado pelo Responsável no Marketplace para solicitar transporte sem precisar buscar por proximidade/escola. */
  codigoInterno: string;
  razaoSocial: string;
  nomeFantasia: string;
  cpfCnpj: string;
  tipo: CompanyType;
  email: string;
  telefone: string;
  whatsapp: string | null;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  latitude: number | null;
  longitude: number | null;
  logoUrl: string | null;
  fotoUrl: string | null;
  corPrimaria: string;
  idioma: string;
  fusoHorario: string;
  status: CompanyStatus;
  plan: CompanyPlan;
  createdAt: string;
  updatedAt: string;
}

export interface ListCompaniesParams {
  search?: string;
  status?: CompanyStatus;
  tipo?: CompanyType;
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "nomeFantasia" | "status";
  sortOrder?: "asc" | "desc";
}

export interface ListCompaniesResult {
  items: Company[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CompanyDashboard {
  motoristas: number;
  responsaveis: number;
  alunos: number;
  veiculos: number;
  rotas: number;
  viagens: number;
  receitaEstimadaCentavos: number;
  documentosVencendo: number;
  alertas: string[];
}

export interface CompanySettings {
  tema: "dark" | "light";
  canaisNotificacao: string[];
  integracoes: Record<string, boolean>;
}

interface ApiEnvelope<T> {
  data: T;
}

/** Prévia de `GET /companies/cnpj/:cnpj` (Frente B — confirmação de CNPJ na Receita Federal). */
export interface CnpjPreview {
  cnpj: string;
  razaoSocial: string;
  nomeFantasiaSugerido: string;
  situacaoCadastral: string;
  ativa: boolean;
  cep: string;
  endereco: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
}

export function createCompaniesEndpoints(apiClient: ApiClient) {
  return {
    /** Público — roda antes de existir conta, na tela de cadastro (`useCnpjLookup`). */
    lookupCnpj: async (cnpj: string): Promise<CnpjPreview> =>
      (await apiClient.request<ApiEnvelope<CnpjPreview>>(`/companies/cnpj/${cnpj}`)).data,

    create: async (input: CreateCompanyInput): Promise<Company> =>
      (
        await apiClient.request<ApiEnvelope<Company>>("/companies", {
          method: "POST",
          body: omitEmptyOptionalStrings(input),
        })
      ).data,

    list: async (params: ListCompaniesParams = {}): Promise<ListCompaniesResult> =>
      (
        await apiClient.request<ApiEnvelope<ListCompaniesResult>>(
          `/companies${buildQueryString(params)}`,
        )
      ).data,

    getById: async (id: string): Promise<Company> =>
      (await apiClient.request<ApiEnvelope<Company>>(`/companies/${id}`)).data,

    update: async (id: string, input: UpdateCompanyInput): Promise<Company> =>
      (
        await apiClient.request<ApiEnvelope<Company>>(`/companies/${id}`, {
          method: "PATCH",
          body: omitEmptyOptionalStrings(input),
        })
      ).data,

    suspend: async (id: string, motivo: string): Promise<Company> =>
      (
        await apiClient.request<ApiEnvelope<Company>>(`/companies/${id}/suspend`, {
          method: "POST",
          body: { motivo },
        })
      ).data,

    reactivate: async (id: string): Promise<Company> =>
      (
        await apiClient.request<ApiEnvelope<Company>>(`/companies/${id}/reactivate`, {
          method: "POST",
        })
      ).data,

    changePlan: async (id: string, planCode: string): Promise<Company> =>
      (
        await apiClient.request<ApiEnvelope<Company>>(`/companies/${id}/plan`, {
          method: "PATCH",
          body: { planCode },
        })
      ).data,

    getDashboard: async (id: string): Promise<CompanyDashboard> =>
      (await apiClient.request<ApiEnvelope<CompanyDashboard>>(`/companies/${id}/dashboard`)).data,

    getSettings: async (id: string): Promise<CompanySettings> =>
      (await apiClient.request<ApiEnvelope<CompanySettings>>(`/companies/${id}/settings`)).data,

    updateSettings: async (id: string, input: Partial<CompanySettings>): Promise<CompanySettings> =>
      (
        await apiClient.request<ApiEnvelope<CompanySettings>>(`/companies/${id}/settings`, {
          method: "PATCH",
          body: input,
        })
      ).data,
  };
}

export type CompaniesEndpoints = ReturnType<typeof createCompaniesEndpoints>;
