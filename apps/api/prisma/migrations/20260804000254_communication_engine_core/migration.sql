-- CreateEnum
CREATE TYPE "CommunicationChannel" AS ENUM ('PUSH', 'WHATSAPP', 'SMS', 'EMAIL', 'IN_APP');

-- CreateEnum
CREATE TYPE "NotificationEventType" AS ENUM ('VIAGEM_INICIADA', 'VIAGEM_ENCERRADA', 'ALUNO_EMBARCOU', 'ALUNO_DESEMBARCOU', 'ALUNO_AUSENTE', 'VEICULO_PROXIMO', 'MOTORISTA_ALTERADO', 'MONITOR_ALTERADO', 'VEICULO_ALTERADO', 'ROTA_ALTERADA', 'OCORRENCIA', 'EMERGENCIA', 'NOVO_CONTRATO', 'CONTRATO_ASSINADO', 'CNH_VENCENDO', 'DOCUMENTO_VENCENDO', 'PAGAMENTO_APROVADO', 'PAGAMENTO_RECUSADO', 'PAGAMENTO_PENDENTE', 'NOVA_ESCOLA', 'NOVO_ALUNO', 'NOVO_RESPONSAVEL');

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('INFORMATIVA', 'IMPORTANTE', 'URGENTE', 'CRITICA', 'EMERGENCIA');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDENTE', 'ENFILEIRADA', 'ENVIADA', 'ENTREGUE', 'LIDA', 'FALHOU');

-- CreateEnum
CREATE TYPE "DeviceTokenPlatform" AS ENUM ('ANDROID', 'IOS', 'WEB');

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "companyId" UUID,
    "tipo" "NotificationEventType" NOT NULL,
    "prioridade" "NotificationPriority" NOT NULL DEFAULT 'INFORMATIVA',
    "titulo" TEXT NOT NULL,
    "corpo" TEXT NOT NULL,
    "dadosContexto" JSONB,
    "canaisEscolhidos" "CommunicationChannel"[],
    "lida" BOOLEAN NOT NULL DEFAULT false,
    "lidaEm" TIMESTAMP(3),
    "favoritada" BOOLEAN NOT NULL DEFAULT false,
    "arquivada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_delivery_attempts" (
    "id" UUID NOT NULL,
    "notificationId" UUID NOT NULL,
    "canal" "CommunicationChannel" NOT NULL,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDENTE',
    "tentativa" INTEGER NOT NULL DEFAULT 1,
    "provedor" TEXT,
    "erro" TEXT,
    "enviadoEm" TIMESTAMP(3),
    "entregueEm" TIMESTAMP(3),
    "lidaEm" TIMESTAMP(3),
    "tempoRespostaMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notification_delivery_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "device_tokens" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "token" TEXT NOT NULL,
    "plataforma" "DeviceTokenPlatform" NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "ultimoUsoEm" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "device_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "receberPush" BOOLEAN NOT NULL DEFAULT true,
    "receberWhatsapp" BOOLEAN NOT NULL DEFAULT true,
    "receberSms" BOOLEAN NOT NULL DEFAULT true,
    "receberEmail" BOOLEAN NOT NULL DEFAULT true,
    "silenciarFinsDeSemana" BOOLEAN NOT NULL DEFAULT false,
    "quietHoursInicio" TEXT,
    "quietHoursFim" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_userId_arquivada_lida_createdAt_idx" ON "notifications"("userId", "arquivada", "lida", "createdAt");

-- CreateIndex
CREATE INDEX "notifications_userId_favoritada_idx" ON "notifications"("userId", "favoritada");

-- CreateIndex
CREATE INDEX "notifications_companyId_createdAt_idx" ON "notifications"("companyId", "createdAt");

-- CreateIndex
CREATE INDEX "notification_delivery_attempts_notificationId_canal_idx" ON "notification_delivery_attempts"("notificationId", "canal");

-- CreateIndex
CREATE INDEX "notification_delivery_attempts_status_createdAt_idx" ON "notification_delivery_attempts"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "device_tokens_token_key" ON "device_tokens"("token");

-- CreateIndex
CREATE INDEX "device_tokens_userId_ativo_idx" ON "device_tokens"("userId", "ativo");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_userId_key" ON "notification_preferences"("userId");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_delivery_attempts" ADD CONSTRAINT "notification_delivery_attempts_notificationId_fkey" FOREIGN KEY ("notificationId") REFERENCES "notifications"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "device_tokens" ADD CONSTRAINT "device_tokens_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- =============================================================================
-- Row-Level Security (Dossie 8, Secao 15.2)
--
-- IMPORTANTE — apenas "notifications" recebe RLS aqui, e por "companyId"
-- (nullable): essa policy cobre exclusivamente a consulta agregada do
-- dashboard de comunicação de UMA empresa (`withTenant`); linhas com
-- "companyId" NULL (notificação pessoal/global) nunca aparecem nessa
-- consulta tenant-scoped, o que é o comportamento esperado (NULL não
-- satisfaz a comparação de igualdade). O acesso ao PRÓPRIO inbox — por
-- QUALQUER usuário, inclusive Responsável e Admin Rotta — é sempre via
-- bypass explícito filtrado por "userId" na camada de aplicação (nunca
-- uma policy de RLS por userId — mesmo raciocínio do bypass de
-- Responsável em "transport_requests"/"contracts"/"ratings", generalizado
-- aqui para todo usuário, já que um inbox de notificações é sempre
-- pessoal — ver nota em `Notification` no schema.prisma).
--
-- "notification_delivery_attempts", "device_tokens" e
-- "notification_preferences" NÃO recebem RLS aqui, de propósito, mesmo
-- padrão de "students"/"student_authorized_persons": são dado
-- inteiramente pessoal do usuário (dispositivo, preferência, tentativa de
-- entrega de uma notificação já pessoal), nunca de uma Empresa/tenant.
-- =============================================================================
ALTER TABLE "notifications" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "notifications" FORCE ROW LEVEL SECURITY;
CREATE POLICY "tenant_isolation" ON "notifications"
  USING ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on')
  WITH CHECK ("companyId"::text = current_setting('app.tenant_id', true) OR current_setting('app.bypass_rls', true) = 'on');
