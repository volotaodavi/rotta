import type { ApiClient } from "../http";

/**
 * Endpoints tipados do CMS de documentos legais (Dossiê 45 FRENTE 4,
 * tarefa #205) — espelham `apps/api/src/modules/legal-documents`.
 * Exclusivo de Admin Rotta (o backend recusa qualquer outro papel).
 */

export type LegalDocumentVersionStatus = "RASCUNHO" | "REVISAO" | "APROVACAO" | "PUBLICADO";

export interface LegalDocument {
  id: string;
  slug: string;
  titulo: string;
  createdAt: string;
  updatedAt: string;
}

export interface LegalDocumentVersion {
  id: string;
  documentId: string;
  versao: number;
  conteudoMarkdown: string;
  changelog: string | null;
  status: LegalDocumentVersionStatus;
  autorId: string;
  aprovadoPorId: string | null;
  publicadoEm: string | null;
  createdAt: string;
  updatedAt: string;
}

export type LegalDocumentWithVersions = LegalDocument & { versoes: LegalDocumentVersion[] };

export interface CreateLegalDocumentInput {
  slug: string;
  titulo: string;
}

export interface CreateLegalDocumentVersionInput {
  conteudoMarkdown: string;
}

export interface UpdateLegalDocumentVersionInput {
  conteudoMarkdown?: string;
  changelog?: string;
}

interface ApiEnvelope<T> {
  data: T;
}

export function createLegalDocumentsEndpoints(apiClient: ApiClient) {
  return {
    createDocument: async (input: CreateLegalDocumentInput): Promise<LegalDocument> =>
      (
        await apiClient.request<ApiEnvelope<LegalDocument>>("/legal-documents", {
          method: "POST",
          body: input,
        })
      ).data,

    listDocuments: async (): Promise<LegalDocumentWithVersions[]> =>
      (await apiClient.request<ApiEnvelope<LegalDocumentWithVersions[]>>("/legal-documents")).data,

    getDocument: async (id: string): Promise<LegalDocumentWithVersions> =>
      (await apiClient.request<ApiEnvelope<LegalDocumentWithVersions>>(`/legal-documents/${id}`))
        .data,

    createVersion: async (
      documentId: string,
      input: CreateLegalDocumentVersionInput,
    ): Promise<LegalDocumentVersion> =>
      (
        await apiClient.request<ApiEnvelope<LegalDocumentVersion>>(
          `/legal-documents/${documentId}/versions`,
          { method: "POST", body: input },
        )
      ).data,

    updateVersion: async (
      documentId: string,
      versionId: string,
      input: UpdateLegalDocumentVersionInput,
    ): Promise<LegalDocumentVersion> =>
      (
        await apiClient.request<ApiEnvelope<LegalDocumentVersion>>(
          `/legal-documents/${documentId}/versions/${versionId}`,
          { method: "PATCH", body: input },
        )
      ).data,

    submitForReview: async (documentId: string, versionId: string): Promise<LegalDocumentVersion> =>
      (
        await apiClient.request<ApiEnvelope<LegalDocumentVersion>>(
          `/legal-documents/${documentId}/versions/${versionId}/submit-for-review`,
          { method: "POST" },
        )
      ).data,

    approve: async (documentId: string, versionId: string): Promise<LegalDocumentVersion> =>
      (
        await apiClient.request<ApiEnvelope<LegalDocumentVersion>>(
          `/legal-documents/${documentId}/versions/${versionId}/approve`,
          { method: "POST" },
        )
      ).data,

    publish: async (documentId: string, versionId: string): Promise<LegalDocumentVersion> =>
      (
        await apiClient.request<ApiEnvelope<LegalDocumentVersion>>(
          `/legal-documents/${documentId}/versions/${versionId}/publish`,
          { method: "POST" },
        )
      ).data,
  };
}

export type LegalDocumentsEndpoints = ReturnType<typeof createLegalDocumentsEndpoints>;
