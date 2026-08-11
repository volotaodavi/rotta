import { buildQueryString } from "../query.util";

import type { ApiClient } from "../http";

/**
 * Endpoints tipados do módulo Drivers (Dossiê 28 — CNH/EAR/Cursos
 * obrigatórios) — espelham exatamente `apps/api/src/modules/drivers`
 * (DTOs de request/response), mesmo padrão de `endpoints/vehicles.ts`.
 */

export type DriverDocumentType =
  "CNH" | "EAR" | "CURSO_TRANSPORTE_ESCOLAR" | "ANTECEDENTES_CRIMINAIS" | "OUTRO";
export type DriverDocumentAiStatus = "PENDENTE" | "APROVADO" | "REPROVADO" | "INDISPONIVEL";

export interface DriverDocument {
  id: string;
  userId: string;
  companyId: string;
  tipo: DriverDocumentType;
  numero: string | null;
  categoria: string | null;
  nomeOriginal: string;
  mimeType: string;
  fileUrl: string;
  vencimentoEm: string | null;
  rottaAiStatus: DriverDocumentAiStatus;
  rottaAiQualidadeOk: boolean | null;
  rottaAiLegivel: boolean | null;
  rottaAiSuspeitaAdulteracao: boolean | null;
  rottaAiObservacoes: string | null;
  rottaAiAnalisadoEm: string | null;
  uploadedByUserId: string;
  createdAt: string;
}

export interface CreateDriverDocumentMeta {
  tipo: DriverDocumentType;
  numero?: string;
  categoria?: string;
  vencimentoEm?: string;
}

/**
 * Espelha `SchoolTransportEligibilityResult` (Dossiê 45 — CATEGORIA B ≠
 * TRANSPORTE ESCOLAR). Nunca derive "elegível" de `categoria` sozinha
 * no cliente — sempre confie neste campo, calculado pelo backend a
 * partir de TODOS os requisitos (CNH D/E + EAR + curso + antecedentes).
 */
export type SchoolTransportEligibilityStatus =
  "PENDING" | "UNDER_REVIEW" | "ELIGIBLE" | "NOT_ELIGIBLE" | "EXPIRED" | "REQUIRES_UPDATE";

export interface SchoolTransportEligibility {
  status: SchoolTransportEligibilityStatus;
  motivo: string;
  categoriaCnh: string | null;
  requisitosVerificados: {
    cnhCategoriaValida: boolean;
    ear: boolean;
    cursoTransporteEscolar: boolean;
    antecedentesCriminais: boolean;
  };
}

interface ApiEnvelope<T> {
  data: T;
}

export function createDriversEndpoints(apiClient: ApiClient) {
  return {
    uploadDocument: async (
      userId: string,
      meta: CreateDriverDocumentMeta,
      file: File | Blob,
      companyId?: string,
    ): Promise<DriverDocument> => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("tipo", meta.tipo);
      if (meta.numero) formData.append("numero", meta.numero);
      if (meta.categoria) formData.append("categoria", meta.categoria);
      if (meta.vencimentoEm) formData.append("vencimentoEm", meta.vencimentoEm);
      return (
        await apiClient.request<ApiEnvelope<DriverDocument>>(
          `/drivers/${userId}/documents${buildQueryString({ companyId })}`,
          { method: "POST", body: formData },
        )
      ).data;
    },

    listDocuments: async (
      userId: string,
      params: { tipo?: DriverDocumentType; companyId?: string } = {},
    ): Promise<DriverDocument[]> =>
      (
        await apiClient.request<ApiEnvelope<DriverDocument[]>>(
          `/drivers/${userId}/documents${buildQueryString(params)}`,
        )
      ).data,

    removeDocument: async (
      userId: string,
      documentId: string,
      companyId?: string,
    ): Promise<void> => {
      await apiClient.request(
        `/drivers/${userId}/documents/${documentId}${buildQueryString({ companyId })}`,
        { method: "DELETE" },
      );
    },

    /** Dossiê 45 — motor de elegibilidade para transporte escolar (nunca deriva do lado do cliente). */
    getSchoolTransportEligibility: async (
      userId: string,
      companyId?: string,
    ): Promise<SchoolTransportEligibility> =>
      (
        await apiClient.request<ApiEnvelope<SchoolTransportEligibility>>(
          `/drivers/${userId}/school-transport-eligibility${buildQueryString({ companyId })}`,
        )
      ).data,
  };
}

export type DriversEndpoints = ReturnType<typeof createDriversEndpoints>;
