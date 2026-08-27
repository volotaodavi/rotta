import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CreatePlanNoticeDto } from "./dto/create-plan-notice.dto";
import { ListPlanNoticesQueryDto } from "./dto/list-plan-notices-query.dto";
import { PlanNoticesService } from "./plan-notices.service";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { SkipTrialGuard } from "@/common/decorators/skip-trial-guard.decorator";
import { Role } from "@/shared/enums";

/**
 * API REST de avisos de plano (Dossiê 26, painel Admin "Controle de
 * Planos") — exclusivo de Admin Rotta, mesmo padrão de RBAC de
 * `AnnouncementsController`. A leitura pela própria empresa vive em
 * `GET /billing/notices` (`BillingController`), não aqui.
 */
@ApiTags("plan-notices")
@ApiBearerAuth()
@Controller("plan-notices")
@Roles(Role.ADMIN_ROTTA)
@SkipTrialGuard()
export class PlanNoticesController {
  constructor(private readonly planNoticesService: PlanNoticesService) {}

  @Post()
  create(@Body() dto: CreatePlanNoticeDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.planNoticesService.create(dto, actor);
  }

  @Get()
  list(@Query() query: ListPlanNoticesQueryDto) {
    return this.planNoticesService.list(query);
  }

  @Post(":id/ativar")
  ativar(@Param("id") id: string) {
    return this.planNoticesService.setAtivo(id, true);
  }

  @Post(":id/desativar")
  desativar(@Param("id") id: string) {
    return this.planNoticesService.setAtivo(id, false);
  }
}
