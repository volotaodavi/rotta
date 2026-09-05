import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { AllExceptionsFilter } from "@/common/filters/all-exceptions.filter";
import { AdminAreaGuard } from "@/common/guards/admin-area.guard";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { TenantGuard } from "@/common/guards/tenant.guard";
import { TrialGuard } from "@/common/guards/trial.guard";
import { LoggingInterceptor } from "@/common/interceptors/logging.interceptor";
import { TenantContextInterceptor } from "@/common/interceptors/tenant-context.interceptor";
import { TimeoutInterceptor } from "@/common/interceptors/timeout.interceptor";
import { TransformResponseInterceptor } from "@/common/interceptors/transform-response.interceptor";
import appConfig from "@/config/app.config";
import asaasConfig from "@/config/asaas.config";
import authConfig from "@/config/auth.config";
import databaseConfig from "@/config/database.config";
import diditConfig from "@/config/didit.config";
import emailConfig from "@/config/email.config";
import { validate } from "@/config/env.validation";
import fcmConfig from "@/config/fcm.config";
import geoConfig from "@/config/geo.config";
import lytexConfig from "@/config/lytex.config";
import observabilityConfig from "@/config/observability.config";
import pushConfig from "@/config/push.config";
import qstashConfig from "@/config/qstash.config";
import redisConfig from "@/config/redis.config";
import smsConfig from "@/config/sms.config";
import storageConfig from "@/config/storage.config";
import supportAiConfig from "@/config/support-ai.config";
import turnstileConfig from "@/config/turnstile.config";
import vehiclePlateLookupConfig from "@/config/vehicle-plate-lookup.config";
import whatsappConfig from "@/config/whatsapp.config";
import { HealthModule } from "@/health/health.module";
import { RedisModule } from "@/infra/cache/redis.module";
import { PrismaModule } from "@/infra/database/prisma.module";
import { LoggerModule } from "@/infra/observability/logger.module";
import { QueueModule } from "@/infra/queue/queue.module";
import { AdminAccountsModule } from "@/modules/admin-accounts/admin-accounts.module";
import { AdminDigestModule } from "@/modules/admin-digest/admin-digest.module";
import { AgendaModule } from "@/modules/agenda/agenda.module";
import { AnalyticsModule } from "@/modules/analytics/analytics.module";
import { AnnouncementsModule } from "@/modules/announcements/announcements.module";
import { AuditModule } from "@/modules/audit/audit.module";
import { AuthModule } from "@/modules/auth/auth.module";
import { AuthentiqueModule } from "@/modules/authentique/authentique.module";
import { BackofficeModule } from "@/modules/backoffice/backoffice.module";
import { BillingModule } from "@/modules/billing/billing.module";
import { ClientErrorsModule } from "@/modules/client-errors/client-errors.module";
import { CompaniesModule } from "@/modules/companies/companies.module";
import { CompanyJoinPreRegistrationsModule } from "@/modules/company-join-pre-registrations/company-join-pre-registrations.module";
import { CompanyJoinRequestsModule } from "@/modules/company-join-requests/company-join-requests.module";
import { ConversationsModule } from "@/modules/conversations/conversations.module";
import { DashboardModule } from "@/modules/dashboard/dashboard.module";
import { DocumentExpiryModule } from "@/modules/document-expiry/document-expiry.module";
import { DocumentsModule } from "@/modules/documents/documents.module";
import { DriversModule } from "@/modules/drivers/drivers.module";
import { GeoModule } from "@/modules/geo/geo.module";
import { GpsModule } from "@/modules/gps/gps.module";
import { IdentityVerificationModule } from "@/modules/identity-verification/identity-verification.module";
import { LegalDocumentsModule } from "@/modules/legal-documents/legal-documents.module";
import { LogsModule } from "@/modules/logs/logs.module";
import { MarketplaceModule } from "@/modules/marketplace/marketplace.module";
import { MonitorsModule } from "@/modules/monitors/monitors.module";
import { NotificationsModule } from "@/modules/notifications/notifications.module";
import { ParentsModule } from "@/modules/parents/parents.module";
import { PlanNoticesModule } from "@/modules/plan-notices/plan-notices.module";
import { ReportsModule } from "@/modules/reports/reports.module";
import { RottaAiModule } from "@/modules/rotta-ai/rotta-ai.module";
import { RoutesModule } from "@/modules/routes/routes.module";
import { SchoolsModule } from "@/modules/schools/schools.module";
import { SettingsModule } from "@/modules/settings/settings.module";
import { StudentPreRegistrationsModule } from "@/modules/student-pre-registrations/student-pre-registrations.module";
import { StudentsModule } from "@/modules/students/students.module";
import { SupportModule } from "@/modules/support/support.module";
import { TrialNotificationsModule } from "@/modules/trial-notifications/trial-notifications.module";
import { TripsModule } from "@/modules/trips/trips.module";
import { UsersModule } from "@/modules/users/users.module";
import { VehiclesModule } from "@/modules/vehicles/vehicles.module";
import { WalletModule } from "@/modules/wallet/wallet.module";

@Module({
  imports: [
    // --- Configuracao (Dossie 12, Secao 12.4) ---
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      load: [
        appConfig,
        authConfig,
        databaseConfig,
        redisConfig,
        qstashConfig,
        storageConfig,
        geoConfig,
        fcmConfig,
        pushConfig,
        supportAiConfig,
        whatsappConfig,
        smsConfig,
        emailConfig,
        diditConfig,
        lytexConfig,
        asaasConfig,
        observabilityConfig,
        vehiclePlateLookupConfig,
        turnstileConfig,
      ],
    }),

    // --- Observabilidade e infraestrutura (Dossie 12, Secoes 6/8/10) ---
    LoggerModule,
    PrismaModule,
    RedisModule,
    QueueModule,

    // --- Event bus interno (Dossie 12, Secao 1.5 / Dossie 14, Secao 4) ---
    EventEmitterModule.forRoot(),

    // --- Health checks (Dossie 12, Secao 10.1) ---
    HealthModule,

    // --- Modulos de dominio (Dossie 13) — todos vazios nesta fase ---
    AuthModule,
    AuthentiqueModule,
    ClientErrorsModule,
    UsersModule,
    CompaniesModule,
    BillingModule,
    AdminDigestModule,
    TrialNotificationsModule,
    DocumentExpiryModule,
    SchoolsModule,
    GeoModule,
    DriversModule,
    MonitorsModule,
    CompanyJoinRequestsModule,
    CompanyJoinPreRegistrationsModule,
    ParentsModule,
    StudentPreRegistrationsModule,
    StudentsModule,
    WalletModule,
    MarketplaceModule,
    VehiclesModule,
    RoutesModule,
    TripsModule,
    GpsModule,
    NotificationsModule,
    AgendaModule,
    DashboardModule,
    SupportModule,
    ConversationsModule,
    AnnouncementsModule,
    DocumentsModule,
    ReportsModule,
    SettingsModule,
    PlanNoticesModule,
    AuditModule,
    LogsModule,
    AnalyticsModule,
    RottaAiModule,
    BackofficeModule,
    LegalDocumentsModule,
    IdentityVerificationModule,
    AdminAccountsModule,
  ],
  providers: [
    // --- Guards globais (Dossie 12, Secao 5.1) ---
    // Ordem: autenticacao -> isolamento de tenant -> autorizacao por papel.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    // Sub-papéis DENTRO de Role.ADMIN_ROTTA (pedido do usuário
    // 03/09/2026 — suporte@/financeiro@/admin geral com áreas
    // diferentes) — roda logo depois do RolesGuard, mesma ordem
    // "autenticação -> tenant -> papel -> [sub-papel]".
    { provide: APP_GUARD, useClass: AdminAreaGuard },
    // Faturamento (Dossiê 26) — trial vencido/inadimplente/suspenso
    // bloqueia escrita em toda a API, exceto `@SkipTrialGuard()`
    // (Support, Billing). Roda por último: precisa do papel já
    // resolvido pelo `RolesGuard` pra saber se vale a pena consultar o
    // status da empresa.
    { provide: APP_GUARD, useClass: TrialGuard },

    // --- Interceptors globais (Dossie 12, Secao 3) ---
    // Registrados aqui (nao via `app.useGlobalInterceptors` em main.ts)
    // porque LoggingInterceptor depende do Logger do nestjs-pino via
    // injecao de dependencia — tokens APP_* sao a unica forma idiomatica
    // do NestJS de registrar um provider global que participa do
    // container de DI. Ordem de registro = ordem de execucao — o
    // primeiro e o mais "externo" (encapsula todos os demais e o
    // controller). `TenantContextInterceptor` precisa ser o primeiro
    // exatamente por isso: seu `AsyncLocalStorage.run(...)` so cobre
    // corretamente tudo que ele encapsula (Dossie 8, Secao 15.2 — ver
    // a nota de implementacao no proprio interceptor).
    { provide: APP_INTERCEPTOR, useClass: TenantContextInterceptor },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },

    // --- Filtro global de excecoes (Dossie 13, Secao 23) ---
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
