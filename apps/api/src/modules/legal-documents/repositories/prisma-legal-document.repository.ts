import { Injectable } from "@nestjs/common";

import type {
  CreateLegalDocumentData,
  CreateLegalDocumentVersionData,
  LegalDocumentRepository,
  LegalDocumentWithVersions,
  UpdateLegalDocumentVersionData,
} from "./legal-document.repository";
import type { LegalDocument, LegalDocumentVersion } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

/**
 * `legal_documents`/`legal_document_versions` não têm RLS (catálogo
 * interno do Admin Rotta, sem `companyId` — mesma categoria de `School`/
 * `Plan`): `this.prisma.legalDocument`/`legalDocumentVersion` direto,
 * sem `withBypass`.
 */
@Injectable()
export class PrismaLegalDocumentRepository implements LegalDocumentRepository {
  constructor(private readonly prisma: PrismaService) {}

  createDocument(data: CreateLegalDocumentData): Promise<LegalDocument> {
    return this.prisma.legalDocument.create({ data });
  }

  findDocumentById(id: string): Promise<LegalDocumentWithVersions | null> {
    return this.prisma.legalDocument.findUnique({
      where: { id },
      include: { versoes: { orderBy: { versao: "desc" } } },
    });
  }

  findDocumentBySlug(slug: string): Promise<LegalDocument | null> {
    return this.prisma.legalDocument.findUnique({ where: { slug } });
  }

  listDocuments(): Promise<LegalDocumentWithVersions[]> {
    return this.prisma.legalDocument.findMany({
      orderBy: { titulo: "asc" },
      include: { versoes: { orderBy: { versao: "desc" } } },
    });
  }

  createVersion(data: CreateLegalDocumentVersionData): Promise<LegalDocumentVersion> {
    return this.prisma.legalDocumentVersion.create({ data });
  }

  findVersionById(id: string): Promise<LegalDocumentVersion | null> {
    return this.prisma.legalDocumentVersion.findUnique({ where: { id } });
  }

  async findLatestVersionNumber(documentId: string): Promise<number> {
    const latest = await this.prisma.legalDocumentVersion.findFirst({
      where: { documentId },
      orderBy: { versao: "desc" },
      select: { versao: true },
    });
    return latest?.versao ?? 0;
  }

  updateVersion(id: string, data: UpdateLegalDocumentVersionData): Promise<LegalDocumentVersion> {
    return this.prisma.legalDocumentVersion.update({ where: { id }, data });
  }
}
