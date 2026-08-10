import { Module } from "@nestjs/common";

import { DASHBOARD_REPOSITORY } from "./dashboard.constants";
import { DashboardController } from "./dashboard.controller";
import { DashboardService } from "./dashboard.service";
import { PrismaDashboardRepository } from "./repositories/prisma-dashboard.repository";

/**
 * Módulo Dashboard (Dossiê 13, Seção 15; Prompt 22/Dossiê 30) — "tela
 * inicial" de Empresa/Gestor/Motorista/Monitor/Responsável
 * (`DASH-01` a `DASH-07`). Sem entidade própria — camada de consulta
 * pura sobre os demais módulos, com sua própria implementação de
 * agregação Prisma (`PrismaDashboardRepository`), no mesmo espírito de
 * `BackofficeModule` (Dossiê 29).
 */
@Module({
  controllers: [DashboardController],
  providers: [
    DashboardService,
    { provide: DASHBOARD_REPOSITORY, useClass: PrismaDashboardRepository },
  ],
  exports: [DashboardService],
})
export class DashboardModule {}
