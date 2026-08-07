-- CreateEnum
CREATE TYPE "DriverDocumentType" AS ENUM ('CNH', 'EAR', 'CURSO_TRANSPORTE_ESCOLAR', 'ANTECEDENTES_CRIMINAIS', 'OUTRO');

-- CreateEnum
CREATE TYPE "DriverDocumentAiStatus" AS ENUM ('PENDENTE', 'APROVADO', 'REPROVADO', 'INDISPONIVEL');

-- CreateTable
CREATE TABLE "driver_documents" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "tipo" "DriverDocumentType" NOT NULL,
    "numero" TEXT,
    "categoria" TEXT,
    "nomeOriginal" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "vencimentoEm" TIMESTAMP(3),
    "rottaAiStatus" "DriverDocumentAiStatus" NOT NULL DEFAULT 'PENDENTE',
    "rottaAiQualidadeOk" BOOLEAN,
    "rottaAiLegivel" BOOLEAN,
    "rottaAiSuspeitaAdulteracao" BOOLEAN,
    "rottaAiObservacoes" TEXT,
    "rottaAiAnalisadoEm" TIMESTAMP(3),
    "uploadedByUserId" UUID NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "driver_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "driver_documents_companyId_userId_tipo_idx" ON "driver_documents"("companyId", "userId", "tipo");

-- CreateIndex
CREATE INDEX "driver_documents_companyId_vencimentoEm_idx" ON "driver_documents"("companyId", "vencimentoEm");

-- AddForeignKey
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_documents" ADD CONSTRAINT "driver_documents_uploadedByUserId_fkey" FOREIGN KEY ("uploadedByUserId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

