import { Controller, Get } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { DashboardService } from "./dashboard.service";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

/**
 * API REST do Dashboard (`DASH-01` a `DASH-07`, Dossiê 19; Prompt
 * 22/Dossiê 30) — tela inicial de Motorista/Monitor/Responsável, os
 * três papéis que não tinham NENHUM dashboard próprio antes desta fase.
 *
 * `Role.EMPRESA`/`Role.GESTOR` deliberadamente FORA da lista: já usam
 * `GET /companies/:id/dashboard` (Dossiê 16, agora completo — Dossiê
 * 30 §3.1) — criar um segundo endpoint aqui duplicaria a mesma
 * informação por uma porta diferente. `Role.ADMIN_ROTTA` também fora:
 * a tela inicial dele é `GET /backoffice/dashboard` (Dossiê 29) +
 * `GET /analytics/national/kpis` (Dossiê 30).
 */
@ApiTags("dashboard")
@ApiBearerAuth()
@Controller("dashboard")
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get("me")
  @Roles(Role.MOTORISTA, Role.MONITOR, Role.RESPONSAVEL)
  getMine(@CurrentUser() actor: AuthenticatedUser) {
    return this.dashboardService.getForActor(actor);
  }
}
