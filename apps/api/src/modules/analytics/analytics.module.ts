import { Module } from "@nestjs/common";

import { ANALYTICS_REPOSITORY } from "./analytics.constants";
import { AnalyticsController } from "./analytics.controller";
import { AnalyticsService } from "./analytics.service";
import { PrismaAnalyticsRepository } from "./repositories/prisma-analytics.repository";

import { BackofficeModule } from "@/modules/backoffice/backoffice.module";

/**
 * Módulo Analytics (Dossiê 13, Seção 22; Prompt 22/Dossiê 30) —
 * Central de Inteligência Operacional (`ADM-03`/`ADM-06`), exclusiva de
 * Admin Rotta. Importa `BackofficeModule` para reusar
 * `BackofficeService.getDashboard()` como base operacional (nunca
 * reimplementa as mesmas contagens cross-tenant, Dossiê 29) — este
 * módulo só acrescenta a camada de negócio (MRR/ARR), período/
 * comparação, geografia e a fronteira honesta com o que ainda não
 * existe (LTV/CAC, anomalias/forecasting).
 */
@Module({
  imports: [BackofficeModule],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    { provide: ANALYTICS_REPOSITORY, useClass: PrismaAnalyticsRepository },
  ],
})
export class AnalyticsModule {}
