import { Module } from "@nestjs/common";

import { LEGAL_DOCUMENT_REPOSITORY } from "./legal-documents.constants";
import { LegalDocumentsController } from "./legal-documents.controller";
import { LegalDocumentsService } from "./legal-documents.service";
import { PrismaLegalDocumentRepository } from "./repositories/prisma-legal-document.repository";

/**
 * Módulo CMS de documentos legais (Dossiê 45 FRENTE 4, tarefa #205) —
 * catálogo interno do Admin Rotta (`legal_documents`/
 * `legal_document_versions`, sem `companyId`/RLS), desacoplado por
 * enquanto das páginas públicas reais (`apps/web/src/app/legal/*`) —
 * ver comentário em `model LegalDocument`, `schema.prisma`. Não importa
 * nenhum outro módulo: workflow autocontido.
 */
@Module({
  controllers: [LegalDocumentsController],
  providers: [
    LegalDocumentsService,
    { provide: LEGAL_DOCUMENT_REPOSITORY, useClass: PrismaLegalDocumentRepository },
  ],
  exports: [LegalDocumentsService],
})
export class LegalDocumentsModule {}
