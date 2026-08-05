-- CreateEnum
CREATE TYPE "EventoAgendaTipo" AS ENUM ('FERIADO', 'RECESSO', 'EVENTO_ESCOLAR', 'TROCA_DE_ROTA_PONTUAL', 'AUSENCIA_PLANEJADA', 'MANUTENCAO_VEICULO', 'VENCIMENTO_CNH', 'VENCIMENTO_SEGURO', 'VENCIMENTO_DOCUMENTO_GENERICO');

-- CreateTable
CREATE TABLE "eventos_agenda" (
    "id" UUID NOT NULL,
    "companyId" UUID NOT NULL,
    "tipo" "EventoAgendaTipo" NOT NULL,
    "data" DATE NOT NULL,
    "dataFim" DATE,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "entidadeTipo" TEXT,
    "entidadeId" TEXT,
    "geradoAutomaticamente" BOOLEAN NOT NULL DEFAULT false,
    "criadoPorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_agenda_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eventos_agenda_companyId_tipo_data_idx" ON "eventos_agenda"("companyId", "tipo", "data");

-- CreateIndex
CREATE INDEX "eventos_agenda_companyId_data_idx" ON "eventos_agenda"("companyId", "data");

-- AddForeignKey
ALTER TABLE "eventos_agenda" ADD CONSTRAINT "eventos_agenda_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "eventos_agenda" ADD CONSTRAINT "eventos_agenda_criadoPorId_fkey" FOREIGN KEY ("criadoPorId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- RLS por "companyId" (mesmo mecanismo de "routes"/"trips" — ver
-- comentário em "vehicles_module").
ALTER TABLE "eventos_agenda" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "eventos_agenda" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "eventos_agenda"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');
