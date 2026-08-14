import { buildQueryString, omitEmptyOptionalStrings } from "../query.util";

import type { ApiClient } from "../http";

/**
 * Endpoints tipados do módulo Veículos (briefing "Gestão de Veículos")
 * — espelham exatamente `apps/api/src/modules/vehicles` (DTOs de
 * request/response). Nenhuma tela chama `apiClient.request` diretamente
 * para uma rota de Veículos — sempre por uma destas funções.
 */

export type VehicleType =
  "AUTOMOVEL" | "SEDAN" | "SUV" | "MINIVAN" | "VAN" | "MICRO_ONIBUS" | "ONIBUS" | "OUTRO";
export type VehicleCategory = "ESCOLAR" | "FRETAMENTO" | "PARTICULAR" | "OUTRO";
export type VehicleStatus =
  "DISPONIVEL" | "EM_VIAGEM" | "MANUTENCAO" | "RESERVA" | "INATIVO" | "BLOQUEADO";
export type VehicleDocumentType =
  "CRLV" | "LICENCIAMENTO" | "SEGURO" | "LAUDO" | "VISTORIA" | "FOTO" | "OUTRO";
export type VehicleDocumentAiStatus = "PENDENTE" | "APROVADO" | "REPROVADO" | "INDISPONIVEL";
export type VehicleMaintenanceType =
  "TROCA_OLEO" | "PNEUS" | "FREIOS" | "REVISAO" | "VISTORIA" | "LIMPEZA" | "OUTRA";
export type VehicleReminderType =
  "LICENCIAMENTO" | "SEGURO" | "REVISAO" | "TROCA_OLEO" | "MANUTENCAO_PREVENTIVA" | "VISTORIA";
export type VehicleReminderStatus = "PENDENTE" | "CONCLUIDO" | "CANCELADO";
export type VehicleAssignmentRole = "MOTORISTA" | "MONITOR";
export type VehicleOccurrenceSeverity = "BAIXA" | "MEDIA" | "ALTA";

/** Resultado de "buscar pela placa" — todos os campos são opcionais porque nem todo provedor devolve todos. */
export interface VehiclePlateLookupResult {
  marca: string | null;
  modelo: string | null;
  ano: number | null;
  cor: string | null;
}

export interface CreateVehicleInput {
  placa: string;
  modelo: string;
  marca?: string;
  ano?: number;
  cor?: string;
  renavam?: string;
  chassi?: string;
  capacidadePassageiros: number;
  tipo: VehicleType;
  categoria?: VehicleCategory;
  observacoes?: string;
}

export type UpdateVehicleInput = Partial<Omit<CreateVehicleInput, "placa">>;

export interface Vehicle {
  id: string;
  companyId: string;
  placa: string;
  modelo: string;
  marca: string | null;
  ano: number | null;
  cor: string | null;
  renavam: string | null;
  chassi: string | null;
  capacidadePassageiros: number;
  tipo: VehicleType;
  categoria: VehicleCategory;
  observacoes: string | null;
  fotoUrl: string | null;
  status: VehicleStatus;
  quilometragemAtual: number;
  ultimaLatitude: number | null;
  ultimaLongitude: number | null;
  ultimaPosicaoEm: string | null;
  viagemAtualId: string | null;
  ultimoMotoristaId: string | null;
  ultimoMonitorId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListVehiclesParams {
  search?: string;
  status?: VehicleStatus;
  tipo?: VehicleType;
  motoristaId?: string;
  /** Somente Admin Rotta: filtra a visão cross-tenant por uma empresa específica. */
  companyId?: string;
  page?: number;
  pageSize?: number;
  sortBy?: "createdAt" | "placa" | "modelo" | "status";
  sortOrder?: "asc" | "desc";
}

export interface ListVehiclesResult {
  items: Vehicle[];
  total: number;
  page: number;
  pageSize: number;
}

export interface VehicleDashboard {
  totalVeiculos: number;
  veiculosAtivos: number;
  veiculosEmViagem: number;
  veiculosEmManutencao: number;
  capacidadeTotalPassageiros: number;
  quilometragemTotal: number;
  documentosVencendo: number;
  alertas: string[];
}

export interface VehicleDocument {
  id: string;
  vehicleId: string;
  maintenanceId: string | null;
  tipo: VehicleDocumentType;
  nomeOriginal: string;
  mimeType: string;
  fileUrl: string;
  vencimentoEm: string | null;
  rottaAiStatus: VehicleDocumentAiStatus;
  rottaAiQualidadeOk: boolean | null;
  rottaAiLegivel: boolean | null;
  rottaAiSuspeitaAdulteracao: boolean | null;
  rottaAiObservacoes: string | null;
  rottaAiAnalisadoEm: string | null;
  uploadedByUserId: string;
  createdAt: string;
}

export interface CreateVehicleDocumentMeta {
  tipo: VehicleDocumentType;
  vencimentoEm?: string;
  maintenanceId?: string;
}

export interface VehicleMaintenance {
  id: string;
  vehicleId: string;
  tipo: VehicleMaintenanceType;
  data: string;
  quilometragem: number | null;
  valorCentavos: number | null;
  fornecedor: string | null;
  observacoes: string | null;
  registradoPorId: string;
  createdAt: string;
}

export interface CreateVehicleMaintenanceInput {
  tipo: VehicleMaintenanceType;
  data: string;
  quilometragem?: number;
  valorCentavos?: number;
  fornecedor?: string;
  observacoes?: string;
}

export interface ListVehicleMaintenancesResult {
  items: VehicleMaintenance[];
  total: number;
  page: number;
  pageSize: number;
}

export interface VehicleReminder {
  id: string;
  vehicleId: string;
  tipo: VehicleReminderType;
  dataAlvo: string;
  quilometragemAlvo: number | null;
  status: VehicleReminderStatus;
  observacoes: string | null;
  vencido: boolean;
  vencendo: boolean;
  createdAt: string;
}

export interface CreateVehicleReminderInput {
  tipo: VehicleReminderType;
  dataAlvo: string;
  quilometragemAlvo?: number;
  observacoes?: string;
}

export interface CreateVehicleAssignmentInput {
  papel: VehicleAssignmentRole;
  userId: string;
}

export interface VehicleAssignment {
  id: string;
  vehicleId: string;
  papel: VehicleAssignmentRole;
  userId: string;
  iniciadoEm: string;
  encerradoEm: string | null;
  criadoPorId: string;
}

export interface VehicleChecklistInput {
  pneusOk: boolean;
  lucesOk: boolean;
  combustivelOk: boolean;
  limpezaOk: boolean;
  equipamentosObrigatoriosOk: boolean;
  observacoes?: string;
  viagemId?: string;
}

export interface VehicleChecklist extends VehicleChecklistInput {
  id: string;
  vehicleId: string;
  motoristaId: string;
  createdAt: string;
}

export interface ListVehicleChecklistsResult {
  items: VehicleChecklist[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CreateVehicleOccurrenceInput {
  titulo: string;
  descricao: string;
  severidade?: VehicleOccurrenceSeverity;
  fotoUrls?: string[];
}

export interface VehicleOccurrence {
  id: string;
  vehicleId: string;
  reportadoPorId: string;
  titulo: string;
  descricao: string;
  severidade: VehicleOccurrenceSeverity;
  fotoUrls: string[];
  createdAt: string;
}

export interface ListVehicleOccurrencesResult {
  items: VehicleOccurrence[];
  total: number;
  page: number;
  pageSize: number;
}

export interface VehicleAuditLog {
  id: string;
  entidadeTipo: string;
  entidadeId: string;
  acao: string;
  atorUserId: string | null;
  dadosAntes: unknown;
  dadosDepois: unknown;
  createdAt: string;
}

export interface ListVehicleAuditLogsResult {
  items: VehicleAuditLog[];
  total: number;
  page: number;
  pageSize: number;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createVehiclesEndpoints(apiClient: ApiClient) {
  return {
    create: async (input: CreateVehicleInput): Promise<Vehicle> =>
      (
        await apiClient.request<ApiEnvelope<Vehicle>>("/vehicles", {
          method: "POST",
          body: omitEmptyOptionalStrings(input),
        })
      ).data,

    list: async (params: ListVehiclesParams = {}): Promise<ListVehiclesResult> =>
      (
        await apiClient.request<ApiEnvelope<ListVehiclesResult>>(
          `/vehicles${buildQueryString(params)}`,
        )
      ).data,

    getMyVehicle: async (): Promise<Vehicle | null> =>
      (await apiClient.request<ApiEnvelope<Vehicle | null>>("/vehicles/me")).data,

    getDashboard: async (companyId?: string): Promise<VehicleDashboard> =>
      (
        await apiClient.request<ApiEnvelope<VehicleDashboard>>(
          `/vehicles/dashboard${buildQueryString({ companyId })}`,
        )
      ).data,

    exportList: async (
      params: ListVehiclesParams & { format: "csv" | "excel" | "pdf" },
    ): Promise<Blob> =>
      apiClient.request<Blob>(`/vehicles/export${buildQueryString(params)}`, {
        responseType: "blob",
      }),

    /** "Buscar pela placa" (pedido do usuário) — ver `VehiclePlateLookupService` no backend para o que acontece sem provedor configurado (erro claro, nunca dado inventado). */
    lookupByPlate: async (placa: string): Promise<VehiclePlateLookupResult> =>
      (
        await apiClient.request<ApiEnvelope<VehiclePlateLookupResult>>(
          `/vehicles/plate-lookup/${encodeURIComponent(placa)}`,
        )
      ).data,

    getById: async (id: string): Promise<Vehicle> =>
      (await apiClient.request<ApiEnvelope<Vehicle>>(`/vehicles/${id}`)).data,

    update: async (id: string, input: UpdateVehicleInput): Promise<Vehicle> =>
      (
        await apiClient.request<ApiEnvelope<Vehicle>>(`/vehicles/${id}`, {
          method: "PATCH",
          body: omitEmptyOptionalStrings(input),
        })
      ).data,

    remove: async (id: string): Promise<void> => {
      await apiClient.request(`/vehicles/${id}`, { method: "DELETE" });
    },

    updateStatus: async (id: string, status: VehicleStatus): Promise<Vehicle> =>
      (
        await apiClient.request<ApiEnvelope<Vehicle>>(`/vehicles/${id}/status`, {
          method: "PATCH",
          body: { status },
        })
      ).data,

    updateLocation: async (
      id: string,
      input: { latitude: number; longitude: number; viagemId?: string },
    ): Promise<Vehicle> =>
      (
        await apiClient.request<ApiEnvelope<Vehicle>>(`/vehicles/${id}/location`, {
          method: "PATCH",
          body: input,
        })
      ).data,

    uploadPhoto: async (id: string, file: File | Blob): Promise<Vehicle> => {
      const formData = new FormData();
      formData.append("file", file);
      return (
        await apiClient.request<ApiEnvelope<Vehicle>>(`/vehicles/${id}/photo`, {
          method: "POST",
          body: formData,
        })
      ).data;
    },

    listAuditLogs: async (
      id: string,
      page = 1,
      pageSize = 20,
    ): Promise<ListVehicleAuditLogsResult> =>
      (
        await apiClient.request<ApiEnvelope<ListVehicleAuditLogsResult>>(
          `/vehicles/${id}/audit-logs${buildQueryString({ page, pageSize })}`,
        )
      ).data,

    uploadDocument: async (
      id: string,
      meta: CreateVehicleDocumentMeta,
      file: File | Blob,
    ): Promise<VehicleDocument> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tipo", meta.tipo);
      if (meta.vencimentoEm) formData.append("vencimentoEm", meta.vencimentoEm);
      if (meta.maintenanceId) formData.append("maintenanceId", meta.maintenanceId);
      return (
        await apiClient.request<ApiEnvelope<VehicleDocument>>(`/vehicles/${id}/documents`, {
          method: "POST",
          body: formData,
        })
      ).data;
    },

    listDocuments: async (id: string, tipo?: VehicleDocumentType): Promise<VehicleDocument[]> =>
      (
        await apiClient.request<ApiEnvelope<VehicleDocument[]>>(
          `/vehicles/${id}/documents${buildQueryString({ tipo })}`,
        )
      ).data,

    removeDocument: async (id: string, documentId: string): Promise<void> => {
      await apiClient.request(`/vehicles/${id}/documents/${documentId}`, { method: "DELETE" });
    },

    createMaintenance: async (
      id: string,
      input: CreateVehicleMaintenanceInput,
    ): Promise<VehicleMaintenance> =>
      (
        await apiClient.request<ApiEnvelope<VehicleMaintenance>>(`/vehicles/${id}/maintenances`, {
          method: "POST",
          body: input,
        })
      ).data,

    listMaintenances: async (
      id: string,
      page = 1,
      pageSize = 20,
    ): Promise<ListVehicleMaintenancesResult> =>
      (
        await apiClient.request<ApiEnvelope<ListVehicleMaintenancesResult>>(
          `/vehicles/${id}/maintenances${buildQueryString({ page, pageSize })}`,
        )
      ).data,

    createReminder: async (
      id: string,
      input: CreateVehicleReminderInput,
    ): Promise<VehicleReminder> =>
      (
        await apiClient.request<ApiEnvelope<VehicleReminder>>(`/vehicles/${id}/reminders`, {
          method: "POST",
          body: input,
        })
      ).data,

    listReminders: async (id: string): Promise<VehicleReminder[]> =>
      (await apiClient.request<ApiEnvelope<VehicleReminder[]>>(`/vehicles/${id}/reminders`)).data,

    updateReminderStatus: async (
      id: string,
      reminderId: string,
      status: VehicleReminderStatus,
    ): Promise<VehicleReminder> =>
      (
        await apiClient.request<ApiEnvelope<VehicleReminder>>(
          `/vehicles/${id}/reminders/${reminderId}`,
          { method: "PATCH", body: { status } },
        )
      ).data,

    assign: async (id: string, input: CreateVehicleAssignmentInput): Promise<VehicleAssignment> =>
      (
        await apiClient.request<ApiEnvelope<VehicleAssignment>>(`/vehicles/${id}/assignments`, {
          method: "POST",
          body: input,
        })
      ).data,

    listAssignmentHistory: async (id: string): Promise<VehicleAssignment[]> =>
      (await apiClient.request<ApiEnvelope<VehicleAssignment[]>>(`/vehicles/${id}/assignments`))
        .data,

    createChecklist: async (id: string, input: VehicleChecklistInput): Promise<VehicleChecklist> =>
      (
        await apiClient.request<ApiEnvelope<VehicleChecklist>>(`/vehicles/${id}/checklists`, {
          method: "POST",
          body: input,
        })
      ).data,

    listChecklists: async (
      id: string,
      page = 1,
      pageSize = 20,
    ): Promise<ListVehicleChecklistsResult> =>
      (
        await apiClient.request<ApiEnvelope<ListVehicleChecklistsResult>>(
          `/vehicles/${id}/checklists${buildQueryString({ page, pageSize })}`,
        )
      ).data,

    createOccurrence: async (
      id: string,
      input: CreateVehicleOccurrenceInput,
    ): Promise<VehicleOccurrence> =>
      (
        await apiClient.request<ApiEnvelope<VehicleOccurrence>>(`/vehicles/${id}/occurrences`, {
          method: "POST",
          body: input,
        })
      ).data,

    listOccurrences: async (
      id: string,
      page = 1,
      pageSize = 20,
    ): Promise<ListVehicleOccurrencesResult> =>
      (
        await apiClient.request<ApiEnvelope<ListVehicleOccurrencesResult>>(
          `/vehicles/${id}/occurrences${buildQueryString({ page, pageSize })}`,
        )
      ).data,
  };
}

export type VehiclesEndpoints = ReturnType<typeof createVehiclesEndpoints>;
