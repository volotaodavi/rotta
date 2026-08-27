import { Module } from "@nestjs/common";

import { PLAN_NOTICE_REPOSITORY } from "./plan-notices.constants";
import { PlanNoticesController } from "./plan-notices.controller";
import { PlanNoticesService } from "./plan-notices.service";
import { PrismaPlanNoticeRepository } from "./repositories/prisma-plan-notice.repository";

/**
 * Módulo de avisos de plano (Dossiê 26, "Controle de Planos"). Exporta
 * `PlanNoticesService` pro `BillingModule` reusar em `GET /billing/notices`
 * (leitura pela própria empresa) sem duplicar acesso a `plan_notices`.
 */
@Module({
  controllers: [PlanNoticesController],
  providers: [
    PlanNoticesService,
    { provide: PLAN_NOTICE_REPOSITORY, useClass: PrismaPlanNoticeRepository },
  ],
  exports: [PlanNoticesService],
})
export class PlanNoticesModule {}
