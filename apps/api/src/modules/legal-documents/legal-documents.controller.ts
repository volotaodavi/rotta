import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CreateLegalDocumentVersionDto } from "./dto/create-legal-document-version.dto";
import { CreateLegalDocumentDto } from "./dto/create-legal-document.dto";
import { UpdateLegalDocumentVersionDto } from "./dto/update-legal-document-version.dto";
import { LegalDocumentsService } from "./legal-documents.service";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

/**
 * API REST do CMS de documentos legais (Dossiê 45 FRENTE 4, tarefa
 * #205) — exclusivo de `Role.ADMIN_ROTTA` em todos os endpoints, mesmo
 * padrão de `BackofficeController`.
 */
@ApiTags("legal-documents")
@ApiBearerAuth()
@Controller("legal-documents")
@Roles(Role.ADMIN_ROTTA)
export class LegalDocumentsController {
  constructor(private readonly legalDocumentsService: LegalDocumentsService) {}

  @Post()
  createDocument(@Body() dto: CreateLegalDocumentDto) {
    return this.legalDocumentsService.createDocument(dto);
  }

  @Get()
  listDocuments() {
    return this.legalDocumentsService.listDocuments();
  }

  @Get(":id")
  getDocument(@Param("id", ParseUUIDPipe) id: string) {
    return this.legalDocumentsService.getDocumentOrThrow(id);
  }

  @Post(":id/versions")
  createVersion(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateLegalDocumentVersionDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.legalDocumentsService.createVersion(id, dto, actor);
  }

  @Patch(":id/versions/:versionId")
  updateVersion(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("versionId", ParseUUIDPipe) versionId: string,
    @Body() dto: UpdateLegalDocumentVersionDto,
  ) {
    return this.legalDocumentsService.updateVersion(id, versionId, dto);
  }

  @Post(":id/versions/:versionId/submit-for-review")
  submitForReview(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("versionId", ParseUUIDPipe) versionId: string,
  ) {
    return this.legalDocumentsService.submitForReview(id, versionId);
  }

  @Post(":id/versions/:versionId/approve")
  approve(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("versionId", ParseUUIDPipe) versionId: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.legalDocumentsService.approve(id, versionId, actor);
  }

  @Post(":id/versions/:versionId/publish")
  publish(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("versionId", ParseUUIDPipe) versionId: string,
  ) {
    return this.legalDocumentsService.publish(id, versionId);
  }
}
