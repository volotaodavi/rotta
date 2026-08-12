import type {
  LegalDocument,
  LegalDocumentVersion,
  LegalDocumentVersionStatus,
} from "@prisma/client";

export interface CreateLegalDocumentData {
  slug: string;
  titulo: string;
}

export interface CreateLegalDocumentVersionData {
  documentId: string;
  versao: number;
  conteudoMarkdown: string;
  autorId: string;
}

export interface UpdateLegalDocumentVersionData {
  conteudoMarkdown?: string;
  changelog?: string;
  status?: LegalDocumentVersionStatus;
  aprovadoPorId?: string | null;
  publicadoEm?: Date | null;
}

export type LegalDocumentWithVersions = LegalDocument & { versoes: LegalDocumentVersion[] };

export interface LegalDocumentRepository {
  createDocument(data: CreateLegalDocumentData): Promise<LegalDocument>;
  findDocumentById(id: string): Promise<LegalDocumentWithVersions | null>;
  findDocumentBySlug(slug: string): Promise<LegalDocument | null>;
  listDocuments(): Promise<LegalDocumentWithVersions[]>;

  createVersion(data: CreateLegalDocumentVersionData): Promise<LegalDocumentVersion>;
  findVersionById(id: string): Promise<LegalDocumentVersion | null>;
  /** Maior `versao` já criada para o documento — 0 quando não existe nenhuma ainda. */
  findLatestVersionNumber(documentId: string): Promise<number>;
  updateVersion(id: string, data: UpdateLegalDocumentVersionData): Promise<LegalDocumentVersion>;
}
