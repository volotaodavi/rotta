import { buildQueryString, omitEmptyOptionalStrings } from "../query.util";

import type { ApiClient } from "../http";

/**
 * Endpoints tipados do módulo Escolas (briefing "Gestão de Escolas")
 * — espelham exatamente `apps/api/src/modules/schools` (DTOs de
 * request/response). Nenhuma tela chama `apiClient.request` diretamente
 * para uma rota de Escolas — sempre por uma destas funções.
 *
 * Diferencial frente a `endpoints/vehicles.ts`: `School` é um catálogo
 * compartilhado entre empresas (sem `companyId` próprio) — o vínculo
 * empresa<->escola é um recurso à parte (`SchoolCompanyLink`).
 */

export type SchoolType =
  "CRECHE" | "PRE_ESCOLA" | "FUNDAMENTAL" | "MEDIO" | "EJA" | "TECNICO" | "UNIVERSIDADE" | "OUTRO";
export type SchoolAdministrativeDependency =
  "FEDERAL" | "ESTADUAL" | "MUNICIPAL" | "PRIVADA" | "FILANTROPICA" | "COMUNITARIA";
export type SchoolShift = "MANHA" | "TARDE" | "INTEGRAL" | "NOITE" | "PERSONALIZADO";
export type SchoolStatus = "ATIVA" | "INATIVA" | "EM_ANALISE" | "ARQUIVADA";
export type SchoolAccessPointType =
  "ENTRADA_PRINCIPAL" | "PONTO_EMBARQUE" | "PONTO_DESEMBARQUE" | "OUTRO";

export interface CreateSchoolInput {
  codigoInep?: string;
  nomeOficial: string;
  nomeFantasia?: string;
  redeEnsino?: string;
  dependenciaAdministrativa: SchoolAdministrativeDependency;
  cnpj?: string;
  telefone?: string;
  whatsapp?: string;
  email?: string;
  website?: string;
  cep: string;
  logradouro: string;
  numero: string;
  complemento?: string;
  bairro: string;
  cidade: string;
  estado: string;
  pais?: string;
  latitude?: number;
  longitude?: number;
  observacoesLocalizacao?: string;
  tipos: SchoolType[];
  turnosAtendidos: SchoolShift[];
}

export type UpdateSchoolInput = Partial<CreateSchoolInput>;

export interface School {
  id: string;
  codigoInterno: string;
  codigoInep: string | null;
  nomeOficial: string;
  nomeFantasia: string | null;
  redeEnsino: string | null;
  dependenciaAdministrativa: SchoolAdministrativeDependency;
  cnpj: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  website: string | null;
  cep: string;
  logradouro: string;
  numero: string;
  complemento: string | null;
  bairro: string;
  cidade: string;
  estado: string;
  pais: string;
  latitude: number | null;
  longitude: number | null;
  observacoesLocalizacao: string | null;
  tipos: SchoolType[];
  turnosAtendidos: SchoolShift[];
  status: SchoolStatus;
  origemCadastro: string;
  criadoPorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListSchoolsParams {
  search?: string;
  cidade?: string;
  estado?: string;
  redeEnsino?: string;
  tipo?: SchoolType;
  turno?: SchoolShift;
  status?: SchoolStatus;
  /** Somente Admin Rotta: filtra pelas escolas vinculadas a uma empresa específica. */
  companyId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "nomeOficial" | "cidade";
  sortOrder?: "asc" | "desc";
}

export interface ListSchoolsResult {
  items: School[];
  total: number;
  page: number;
  pageSize: number;
}

/** Uma sugestão do autocomplete tolerante a erro de digitação (`GET /schools/sugestoes`). */
export interface SchoolSuggestion extends School {
  /** km até a `latitude`/`longitude` informada na busca — `null` sem localização informada ou sem coordenada confirmada da escola. */
  distanciaKm: number | null;
}

export interface SuggestSchoolsParams {
  q: string;
  /** Localização aproximada do Responsável/embarque — opcional, só reordena por proximidade, nunca filtra. */
  latitude?: number;
  longitude?: number;
  limit?: number;
}

export interface SuggestSchoolsResult {
  items: SchoolSuggestion[];
}

export interface SchoolDashboard {
  totalEscolas: number;
  escolasPublicas: number;
  escolasPrivadas: number;
  alunosVinculados: number;
  rotasAtivas: number;
  turnosAtendidos: string[];
}

export interface CreateSchoolAccessPointInput {
  tipo: SchoolAccessPointType;
  nome: string;
  descricao?: string;
  latitude: number;
  longitude: number;
  observacoes?: string;
}

export type UpdateSchoolAccessPointInput = Partial<CreateSchoolAccessPointInput>;

export interface SchoolAccessPoint {
  id: string;
  schoolId: string;
  tipo: SchoolAccessPointType;
  nome: string;
  descricao: string | null;
  latitude: number;
  longitude: number;
  observacoes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SchoolCompanyLink {
  id: string;
  schoolId: string;
  companyId: string;
  vinculadoEm: string;
  desvinculadoEm: string | null;
  vinculadoPorId: string;
  encerradoPorId: string | null;
}

export interface ListSchoolCompanyLinksResult {
  items: SchoolCompanyLink[];
}

export interface ImportSchoolsRowError {
  linha: number;
  mensagem: string;
}

export interface ImportSchoolsResult {
  totalLinhas: number;
  importadas: number;
  erros: ImportSchoolsRowError[];
}

export interface SchoolAuditLog {
  id: string;
  entidadeTipo: string;
  entidadeId: string;
  acao: string;
  atorUserId: string | null;
  dadosAntes: unknown;
  dadosDepois: unknown;
  createdAt: string;
}

export interface ListSchoolAuditLogsResult {
  items: SchoolAuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createSchoolsEndpoints(apiClient: ApiClient) {
  return {
    create: async (input: CreateSchoolInput): Promise<School> =>
      (
        await apiClient.request<ApiEnvelope<School>>("/schools", {
          method: "POST",
          body: omitEmptyOptionalStrings(input),
        })
      ).data,

    list: async (params: ListSchoolsParams = {}): Promise<ListSchoolsResult> =>
      (
        await apiClient.request<ApiEnvelope<ListSchoolsResult>>(
          `/schools${buildQueryString(params)}`,
        )
      ).data,

    /** Autocomplete tolerante a erro de digitação, com sugestão por proximidade quando `latitude`/`longitude` são informadas. */
    sugerir: async (params: SuggestSchoolsParams): Promise<SuggestSchoolsResult> =>
      (
        await apiClient.request<ApiEnvelope<SuggestSchoolsResult>>(
          `/schools/sugestoes${buildQueryString(params)}`,
        )
      ).data,

    checkPossibleDuplicates: async (
      nomeOficial: string,
      cidade: string,
      estado: string,
    ): Promise<School[]> =>
      (
        await apiClient.request<ApiEnvelope<School[]>>(
          `/schools/check-duplicates${buildQueryString({ nomeOficial, cidade, estado })}`,
        )
      ).data,

    getDashboard: async (companyId?: string): Promise<SchoolDashboard> =>
      (
        await apiClient.request<ApiEnvelope<SchoolDashboard>>(
          `/schools/dashboard${buildQueryString({ companyId })}`,
        )
      ).data,

    exportList: async (
      params: ListSchoolsParams & { format: "csv" | "excel" | "pdf" },
    ): Promise<Blob> =>
      apiClient.request<Blob>(`/schools/export${buildQueryString(params)}`, {
        responseType: "blob",
      }),

    importFile: async (
      format: "csv" | "excel" | "json",
      file: File | Blob,
    ): Promise<ImportSchoolsResult> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("format", format);
      return (
        await apiClient.request<ApiEnvelope<ImportSchoolsResult>>("/schools/import", {
          method: "POST",
          body: formData,
        })
      ).data;
    },

    getById: async (id: string): Promise<School> =>
      (await apiClient.request<ApiEnvelope<School>>(`/schools/${id}`)).data,

    update: async (id: string, input: UpdateSchoolInput): Promise<School> =>
      (
        await apiClient.request<ApiEnvelope<School>>(`/schools/${id}`, {
          method: "PATCH",
          body: omitEmptyOptionalStrings(input),
        })
      ).data,

    updateStatus: async (id: string, status: SchoolStatus): Promise<School> =>
      (
        await apiClient.request<ApiEnvelope<School>>(`/schools/${id}/status`, {
          method: "PATCH",
          body: { status },
        })
      ).data,

    /**
     * Troca de status EM MASSA (só Admin Rotta) — pedido do usuário:
     * "as escolas que estiverem com o status de 'em análise', passe
     * todas as escolas para 'ativa'". Um único `PATCH`, nunca um loop
     * de `updateStatus()` chamado escola por escola.
     */
    bulkUpdateStatus: async (
      fromStatus: SchoolStatus,
      toStatus: SchoolStatus,
    ): Promise<{ quantidadeAtualizada: number }> =>
      (
        await apiClient.request<ApiEnvelope<{ quantidadeAtualizada: number }>>(
          "/schools/status/bulk",
          { method: "PATCH", body: { fromStatus, toStatus } },
        )
      ).data,

    remove: async (id: string): Promise<void> => {
      await apiClient.request(`/schools/${id}`, { method: "DELETE" });
    },

    listAuditLogs: async (
      id: string,
      page = 1,
      pageSize = 20,
    ): Promise<ListSchoolAuditLogsResult> =>
      (
        await apiClient.request<ApiEnvelope<ListSchoolAuditLogsResult>>(
          `/schools/${id}/audit-logs${buildQueryString({ page, pageSize })}`,
        )
      ).data,

    createAccessPoint: async (
      id: string,
      input: CreateSchoolAccessPointInput,
    ): Promise<SchoolAccessPoint> =>
      (
        await apiClient.request<ApiEnvelope<SchoolAccessPoint>>(`/schools/${id}/access-points`, {
          method: "POST",
          body: input,
        })
      ).data,

    listAccessPoints: async (id: string): Promise<SchoolAccessPoint[]> =>
      (await apiClient.request<ApiEnvelope<SchoolAccessPoint[]>>(`/schools/${id}/access-points`))
        .data,

    updateAccessPoint: async (
      id: string,
      pointId: string,
      input: UpdateSchoolAccessPointInput,
    ): Promise<SchoolAccessPoint> =>
      (
        await apiClient.request<ApiEnvelope<SchoolAccessPoint>>(
          `/schools/${id}/access-points/${pointId}`,
          { method: "PATCH", body: input },
        )
      ).data,

    removeAccessPoint: async (id: string, pointId: string): Promise<void> => {
      await apiClient.request(`/schools/${id}/access-points/${pointId}`, { method: "DELETE" });
    },

    linkCompany: async (id: string, companyId?: string): Promise<SchoolCompanyLink> =>
      (
        await apiClient.request<ApiEnvelope<SchoolCompanyLink>>(`/schools/${id}/company-links`, {
          method: "POST",
          body: { companyId },
        })
      ).data,

    listCompanyLinks: async (id: string): Promise<ListSchoolCompanyLinksResult> =>
      (
        await apiClient.request<ApiEnvelope<ListSchoolCompanyLinksResult>>(
          `/schools/${id}/company-links`,
        )
      ).data,

    unlinkCompany: async (id: string, linkId: string): Promise<void> => {
      await apiClient.request(`/schools/${id}/company-links/${linkId}`, { method: "DELETE" });
    },
  };
}

export type SchoolsEndpoints = ReturnType<typeof createSchoolsEndpoints>;
