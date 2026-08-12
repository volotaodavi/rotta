-- Dossiê 45 FRENTE 4 (tarefa #205) — CMS de documentos legais do Admin
-- Rotta. Fluxo de versão RASCUNHO→REVISAO→APROVACAO→PUBLICADO, sempre
-- para frente (nenhuma UPDATE apaga uma versão anterior). Desacoplado
-- das páginas públicas reais (`apps/web/src/app/legal/*`) nesta
-- entrega — ver comentário em cima de `model LegalDocument` no schema.
CREATE TYPE "LegalDocumentVersionStatus" AS ENUM ('RASCUNHO', 'REVISAO', 'APROVACAO', 'PUBLICADO');

CREATE TABLE "legal_documents" (
    "id" UUID NOT NULL,
    "slug" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_documents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "legal_documents_slug_key" ON "legal_documents"("slug");

CREATE TABLE "legal_document_versions" (
    "id" UUID NOT NULL,
    "documentId" UUID NOT NULL,
    "versao" INTEGER NOT NULL,
    "conteudoMarkdown" TEXT NOT NULL,
    "changelog" TEXT,
    "status" "LegalDocumentVersionStatus" NOT NULL DEFAULT 'RASCUNHO',
    "autorId" UUID NOT NULL,
    "aprovadoPorId" UUID,
    "publicadoEm" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "legal_document_versions_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "legal_document_versions_documentId_versao_key" ON "legal_document_versions"("documentId", "versao");

ALTER TABLE "legal_document_versions" ADD CONSTRAINT "legal_document_versions_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "legal_documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "legal_document_versions" ADD CONSTRAINT "legal_document_versions_autorId_fkey" FOREIGN KEY ("autorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "legal_document_versions" ADD CONSTRAINT "legal_document_versions_aprovadoPorId_fkey" FOREIGN KEY ("aprovadoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
