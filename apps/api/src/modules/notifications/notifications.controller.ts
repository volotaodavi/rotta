import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CommunicationDashboardQueryDto } from "./dto/communication-dashboard-query.dto";
import { CommunicationDashboardResponseDto } from "./dto/communication-dashboard-response.dto";
import { ListNotificationsQueryDto } from "./dto/list-notifications-query.dto";
import {
  ListNotificationsResponseDto,
  NotificationResponseDto,
} from "./dto/notification-response.dto";
import { RegisterDeviceTokenDto } from "./dto/register-device-token.dto";
import { SetNotificationFlagDto } from "./dto/set-notification-flag.dto";
import { UpdateNotificationPreferenceDto } from "./dto/update-notification-preference.dto";
import { toNotificationResponseDto } from "./mappers/notification.mapper";
import { NotificationDashboardService } from "./notification-dashboard.service";
import { NotificationInboxService } from "./notification-inbox.service";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

/**
 * Central de Notificações Internas (briefing "NOTIFICAÇÕES INTERNAS") —
 * cada rota é implicitamente escopada ao usuário autenticado
 * (`actor.sub`), nunca a um `:userId` de parâmetro: o inbox é sempre
 * pessoal, qualquer papel (Responsável, Empresa, Motorista, Monitor,
 * Admin Rotta) só vê/gerencia o próprio, daí nenhuma rota aqui usar
 * `@Roles(...)` — qualquer papel autenticado passa.
 *
 * `GET/PATCH "preferencia"` e `POST "marcar-todas-lidas"`/`"dispositivos"`
 * são declaradas ANTES de `:id` (ao contrário de `StudentsController`,
 * onde os sufixos como `:id/photo` nunca colidem por terem um segmento a
 * mais): aqui `"preferencia"` tem o MESMO número de segmentos que `:id`
 * no verbo GET, então precisa vir primeiro ou seria capturada por
 * `findById` (mesma disciplina de `SchoolsController#check-duplicates`).
 */
@ApiTags("notifications")
@ApiBearerAuth()
@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly inboxService: NotificationInboxService,
    private readonly dashboardService: NotificationDashboardService,
  ) {}

  /**
   * Únicas rotas deste controller escopadas por EMPRESA (não pelo ator
   * autenticado) — precisam vir antes de `:id` porque `"empresas"` tem
   * o mesmo número de segmentos adicionais que os demais sufixos fixos
   * (`"preferencia"`, `"dispositivos"`), mesma disciplina da nota da
   * classe.
   */
  @Get("empresas/:companyId/dashboard")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR)
  getDashboard(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @Query() query: CommunicationDashboardQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<CommunicationDashboardResponseDto> {
    return this.dashboardService.getDashboard(companyId, actor, query);
  }

  @Get("empresas/:companyId/audit-logs")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR)
  listAuditLogs(
    @Param("companyId", ParseUUIDPipe) companyId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.dashboardService.listAuditLogs(companyId, actor, Number(page), Number(pageSize));
  }

  @Get()
  async list(
    @Query() query: ListNotificationsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<ListNotificationsResponseDto> {
    const { items, total } = await this.inboxService.list(actor.sub, query);
    return {
      items: items.map(toNotificationResponseDto),
      total,
      page: query.page,
      pageSize: query.pageSize,
    };
  }

  @Post("marcar-todas-lidas")
  markAllRead(@CurrentUser() actor: AuthenticatedUser): Promise<{ count: number }> {
    return this.inboxService.markAllRead(actor.sub);
  }

  @Post("dispositivos")
  registerDeviceToken(
    @Body() dto: RegisterDeviceTokenDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.inboxService.registerDeviceToken(actor.sub, dto.token, dto.plataforma);
  }

  @Delete("dispositivos/:token")
  @HttpCode(HttpStatus.NO_CONTENT)
  deactivateDeviceToken(@Param("token") token: string): Promise<void> {
    return this.inboxService.deactivateDeviceToken(token);
  }

  @Get("preferencia")
  getPreference(@CurrentUser() actor: AuthenticatedUser) {
    return this.inboxService.getPreference(actor.sub);
  }

  @Patch("preferencia")
  updatePreference(
    @Body() dto: UpdateNotificationPreferenceDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.inboxService.updatePreference(actor.sub, dto);
  }

  @Get(":id")
  async findById(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<NotificationResponseDto> {
    const notification = await this.inboxService.findByIdOrThrow(id, actor.sub);
    return toNotificationResponseDto(notification);
  }

  @Patch(":id/lida")
  async markRead(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<NotificationResponseDto> {
    await this.inboxService.findByIdOrThrow(id, actor.sub);
    const notification = await this.inboxService.markRead(id, actor.sub);
    return toNotificationResponseDto(notification);
  }

  @Patch(":id/favorita")
  async setFavorita(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SetNotificationFlagDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<NotificationResponseDto> {
    await this.inboxService.findByIdOrThrow(id, actor.sub);
    const notification = await this.inboxService.setFavorita(id, actor.sub, dto.valor);
    return toNotificationResponseDto(notification);
  }

  @Patch(":id/arquivada")
  async setArquivada(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: SetNotificationFlagDto,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<NotificationResponseDto> {
    await this.inboxService.findByIdOrThrow(id, actor.sub);
    const notification = await this.inboxService.setArquivada(id, actor.sub, dto.valor);
    return toNotificationResponseDto(notification);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async delete(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<void> {
    const notification = await this.inboxService.findByIdOrThrow(id, actor.sub);
    await this.inboxService.delete(notification, actor.sub);
  }
}
