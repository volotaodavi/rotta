import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from "@nestjs/core";
import { EventEmitterModule } from "@nestjs/event-emitter";

import { AllExceptionsFilter } from "@/common/filters/all-exceptions.filter";
import { JwtAuthGuard } from "@/common/guards/jwt-auth.guard";
import { RolesGuard } from "@/common/guards/roles.guard";
import { TenantGuard } from "@/common/guards/tenant.guard";
import { LoggingInterceptor } from "@/common/interceptors/logging.interceptor";
import { TimeoutInterceptor } from "@/common/interceptors/timeout.interceptor";
import { TransformResponseInterceptor } from "@/common/interceptors/transform-response.interceptor";
import appConfig from "@/config/app.config";
import authConfig from "@/config/auth.config";
import databaseConfig from "@/config/database.config";
import { validate } from "@/config/env.validation";
import redisConfig from "@/config/redis.config";
import { HealthModule } from "@/health/health.module";
import { RedisModule } from "@/infra/cache/redis.module";
import { PrismaModule } from "@/infra/database/prisma.module";
import { LoggerModule } from "@/infra/observability/logger.module";
import { QueueModule } from "@/infra/queue/queue.module";
import { AgendaModule } from "@/modules/agenda/agenda.module";
import { AnalyticsModule } from "@/modules/analytics/analytics.module";
import { AuditModule } from "@/modules/audit/audit.module";
import { AuthModule } from "@/modules/auth/auth.module";
import { CompaniesModule } from "@/modules/companies/companies.module";
import { DashboardModule } from "@/modules/dashboard/dashboard.module";
import { DocumentsModule } from "@/modules/documents/documents.module";
import { DriversModule } from "@/modules/drivers/drivers.module";
import { GpsModule } from "@/modules/gps/gps.module";
import { LogsModule } from "@/modules/logs/logs.module";
import { MonitorsModule } from "@/modules/monitors/monitors.module";
import { NotificationsModule } from "@/modules/notifications/notifications.module";
import { ParentsModule } from "@/modules/parents/parents.module";
import { ReportsModule } from "@/modules/reports/reports.module";
import { RoutesModule } from "@/modules/routes/routes.module";
import { SchoolsModule } from "@/modules/schools/schools.module";
import { SettingsModule } from "@/modules/settings/settings.module";
import { StudentsModule } from "@/modules/students/students.module";
import { SupportModule } from "@/modules/support/support.module";
import { TripsModule } from "@/modules/trips/trips.module";
import { UsersModule } from "@/modules/users/users.module";
import { VehiclesModule } from "@/modules/vehicles/vehicles.module";

@Module({
  imports: [
    // --- Configuracao (Dossie 12, Secao 12.4) ---
    ConfigModule.forRoot({
      isGlobal: true,
      validate,
      load: [appConfig, authConfig, databaseConfig, redisConfig],
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
    UsersModule,
    CompaniesModule,
    SchoolsModule,
    DriversModule,
    MonitorsModule,
    ParentsModule,
    StudentsModule,
    VehiclesModule,
    RoutesModule,
    TripsModule,
    GpsModule,
    NotificationsModule,
    AgendaModule,
    DashboardModule,
    SupportModule,
    DocumentsModule,
    ReportsModule,
    SettingsModule,
    AuditModule,
    LogsModule,
    AnalyticsModule,
  ],
  providers: [
    // --- Guards globais (Dossie 12, Secao 5.1) ---
    // Ordem: autenticacao -> isolamento de tenant -> autorizacao por papel.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: TenantGuard },
    { provide: APP_GUARD, useClass: RolesGuard },

    // --- Interceptors globais (Dossie 12, Secao 3) ---
    // Registrados aqui (nao via `app.useGlobalInterceptors` em main.ts)
    // porque LoggingInterceptor depende do Logger do nestjs-pino via
    // injecao de dependencia — tokens APP_* sao a unica forma idiomatica
    // do NestJS de registrar um provider global que participa do
    // container de DI. Ordem de registro = ordem de execucao.
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TransformResponseInterceptor },
    { provide: APP_INTERCEPTOR, useClass: TimeoutInterceptor },

    // --- Filtro global de excecoes (Dossie 13, Secao 23) ---
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
  ],
})
export class AppModule {}
