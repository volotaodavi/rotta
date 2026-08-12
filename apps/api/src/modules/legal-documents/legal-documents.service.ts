import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";

import { LEGAL_DOCUMENT_REPOSITORY } from "./legal-documents.constants";

import type { CreateLegalDocumentVersionDto } from "./dto/create-legal-document-version.dto";
import type { CreateLegalDocumentDto } from "./dto/create-legal-document.dto";
import type { UpdateLegalDocumentVersionDto } from "./dto/update-legal-document-version.dto";
import type {
  LegalDocumentRepository,
  LegalDocumentWithVersions,
} from "./repositories/legal-document.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { LegalDocument, LegalDocumentVersion } from "@prisma/client";

/**
 * FRENTE 4 (Dossiê 45, tarefa #205) — CMS de documentos legais do Admin
 * Rotta. Fluxo de status estritamente linear, sempre pra frente:
 *
 * RASCUNHO --submitForReview--> REVISAO --approve--> APROVACAO --publish--> PUBLICADO
 *
 * Cada transição valida o estado atual explicitamente (nunca confia
 * que o cliente mandou o botão certo) — pular etapa ou repetir uma já
 * feita sempre lança `ConflictException`. Toda rota deste módulo já é
 * `Role.ADMIN_ROTTA`-only no controller (RBAC estrutural, Dossiê 12
 * §4.5) — o "quatro-olhos" abaixo (`approve` recusa aprovador === autor)
 * é uma segunda camada, específica deste fluxo, não substitui o RBAC.
 */
@Injectable()
export class LegalDocumentsService {
  constructor(
    @Inject(LEGAL_DOCUMENT_REPOSITORY) private readonly repository: LegalDocumentRepository,
  ) {}

  createDocument(dto: CreateLegalDocumentDto): Promise<LegalDocument> {
    return this.repository.createDocument(dto);
  }

  listDocuments(): Promise<LegalDocumentWithVersions[]> {
    return this.repository.listDocuments();
  }

  async getDocumentOrThrow(id: string): Promise<LegalDocumentWithVersions> {
    const document = await this.repository.findDocumentById(id);
    if (!document) throw new NotFoundException("Documento legal não encontrado.");
    return document;
  }

  async createVersion(
    documentId: string,
    dto: CreateLegalDocumentVersionDto,
    actor: AuthenticatedUser,
  ): Promise<LegalDocumentVersion> {
    await this.getDocumentOrThrow(documentId);
    const latest = await this.repository.findLatestVersionNumber(documentId);
    return this.repository.createVersion({
      documentId,
      versao: latest + 1,
      conteudoMarkdown: dto.conteudoMarkdown,
      autorId: actor.sub,
    });
  }

  private async getVersionOrThrow(
    documentId: string,
    versionId: string,
  ): Promise<LegalDocumentVersion> {
    const version = await this.repository.findVersionById(versionId);
    if (!version || version.documentId !== documentId) {
      throw new NotFoundException("Versão não encontrada para este documento.");
    }
    return version;
  }

  /** Edição de conteúdo — só enquanto RASCUNHO (versões além disso são histórico imutável, nunca sobrescritas). */
  async updateVersion(
    documentId: string,
    versionId: string,
    dto: UpdateLegalDocumentVersionDto,
  ): Promise<LegalDocumentVersion> {
    const version = await this.getVersionOrThrow(documentId, versionId);
    if (version.status !== "RASCUNHO") {
      throw new ConflictException("Só é possível editar o conteúdo enquanto a versão é RASCUNHO.");
    }
    return this.repository.updateVersion(versionId, dto);
  }

  async submitForReview(documentId: string, versionId: string): Promise<LegalDocumentVersion> {
    const version = await this.getVersionOrThrow(documentId, versionId);
    if (version.status !== "RASCUNHO") {
      throw new ConflictException("Só é possível enviar para revisão a partir de RASCUNHO.");
    }
    if (!version.changelog?.trim()) {
      throw new BadRequestException(
        "Preencha o changelog (o que mudou nesta versão) antes de enviar para revisão.",
      );
    }
    return this.repository.updateVersion(versionId, { status: "REVISAO" });
  }

  /** "Quatro-olhos": quem aprova nunca pode ser quem redigiu a versão. */
  async approve(
    documentId: string,
    versionId: string,
    actor: AuthenticatedUser,
  ): Promise<LegalDocumentVersion> {
    const version = await this.getVersionOrThrow(documentId, versionId);
    if (version.status !== "REVISAO") {
      throw new ConflictException("Só é possível aprovar a partir de REVISAO.");
    }
    if (version.autorId === actor.sub) {
      throw new ConflictException(
        "Quem redigiu a versão não pode aprová-la — peça para outra pessoa da equipe revisar.",
      );
    }
    return this.repository.updateVersion(versionId, {
      status: "APROVACAO",
      aprovadoPorId: actor.sub,
    });
  }

  async publish(documentId: string, versionId: string): Promise<LegalDocumentVersion> {
    const version = await this.getVersionOrThrow(documentId, versionId);
    if (version.status !== "APROVACAO") {
      throw new ConflictException("Só é possível publicar a partir de APROVACAO.");
    }
    return this.repository.updateVersion(versionId, {
      status: "PUBLICADO",
      publicadoEm: new Date(),
    });
  }
}
