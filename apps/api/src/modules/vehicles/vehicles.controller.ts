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
  Req,
  Res,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiTags } from "@nestjs/swagger";
import { VehicleDocumentType } from "@prisma/client";

import { CreateVehicleAssignmentDto } from "./dto/create-vehicle-assignment.dto";
import { CreateVehicleChecklistDto } from "./dto/create-vehicle-checklist.dto";
import { CreateVehicleDocumentDto } from "./dto/create-vehicle-document.dto";
import { CreateVehicleMaintenanceDto } from "./dto/create-vehicle-maintenance.dto";
import { CreateVehicleOccurrenceDto } from "./dto/create-vehicle-occurrence.dto";
import { CreateVehicleReminderDto } from "./dto/create-vehicle-reminder.dto";
import { CreateVehicleDto } from "./dto/create-vehicle.dto";
import { ExportVehiclesQueryDto } from "./dto/export-vehicles-query.dto";
import { ListVehicleCategoryReviewQueryDto } from "./dto/list-vehicle-category-review-query.dto";
import { ListVehiclesQueryDto } from "./dto/list-vehicles-query.dto";
import { ResolveVehicleCategoryReviewDto } from "./dto/resolve-vehicle-category-review.dto";
import { ReviewVehicleDto } from "./dto/review-vehicle.dto";
import { UpdateVehicleLocationDto } from "./dto/update-vehicle-location.dto";
import { UpdateVehicleReminderDto } from "./dto/update-vehicle-reminder.dto";
import { UpdateVehicleStatusDto } from "./dto/update-vehicle-status.dto";
import { UpdateVehicleDto } from "./dto/update-vehicle.dto";
import { VehiclesService, type RequestMeta } from "./vehicles.service";

import type { Request, Response } from "express";

import { AdminAreas } from "@/common/decorators/admin-areas.decorator";
import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { AdminArea, Role } from "@/shared/enums";

const MANAGE_ROLES = [Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR] as const;
const READ_ROLES = [...MANAGE_ROLES, Role.MOTORISTA, Role.MONITOR] as const;

function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

/**
 * API REST do módulo Veículos (briefing "Gestão de Veículos"). Rotas
 * literais (`me`, `dashboard`, `export`) são declaradas ANTES de `:id`
 * — mesma precaução de `AuthController` (`sessions/other` antes de
 * `sessions/:id`) para evitar colisão de rota.
 */
@ApiTags("vehicles")
@ApiBearerAuth()
@Controller("vehicles")
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post()
  @Roles(Role.EMPRESA, Role.GESTOR)
  create(
    @Body() dto: CreateVehicleDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.vehiclesService.create(dto, actor, requestMeta(req));
  }

  @Get()
  @Roles(...MANAGE_ROLES)
  @AdminAreas(AdminArea.VEICULOS)
  list(@Query() query: ListVehiclesQueryDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.vehiclesService.list(query, actor);
  }

  @Get("me")
  @Roles(Role.MOTORISTA, Role.MONITOR)
  findMyVehicle(@CurrentUser() actor: AuthenticatedUser) {
    return this.vehiclesService.findMyVehicle(actor);
  }

  @Get("dashboard")
  @Roles(...MANAGE_ROLES)
  getDashboard(@CurrentUser() actor: AuthenticatedUser, @Query("companyId") companyId?: string) {
    return this.vehiclesService.getDashboard(actor, companyId);
  }

  /**
   * `@Res()` sem `passthrough` — controle manual da resposta HTTP,
   * necessário para que o arquivo binário saia cru, sem passar pelo
   * `TransformResponseInterceptor` global (que envelopa toda resposta em
   * `{ data }`, o que corromperia CSV/Excel/PDF).
   */
  @Get("export")
  @Roles(...MANAGE_ROLES)
  async export(
    @Query() query: ExportVehiclesQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Res() res: Response,
  ): Promise<void> {
    const { buffer, contentType, filename } = await this.vehiclesService.exportList(
      query,
      actor,
      query.format,
    );
    res
      .status(200)
      .set({
        "Content-Type": contentType,
        "Content-Disposition": `attachment; filename="${filename}"`,
      })
      .send(buffer);
  }

  /**
   * "Buscar pela placa" (pedido do usuário: "as empresas... deverão
   * colocar a placa do veículo (pode buscar em todos os detrans, para
   * a análise ser rápida)") — rota literal (nunca colide com `:id`,
   * que é sempre um UUID). Ver `VehiclePlateLookupService` para a
   * explicação completa de por que isso depende de um provedor pago
   * configurado, não de scraping de Detran.
   */
  @Get("plate-lookup/:placa")
  @Roles(...MANAGE_ROLES)
  lookupByPlate(@Param("placa") placa: string) {
    return this.vehiclesService.lookupByPlate(placa);
  }

  /**
   * Fila de revisão de categoria sugerida pela IA (Frente AL — pedido do
   * usuário: "os admins da Rotta irão analisar manualmente a
   * situação"). Rota literal, antes de `:id` pelo mesmo motivo das
   * demais acima.
   */
  @Get("revisao-categoria")
  @Roles(Role.ADMIN_ROTTA)
  @AdminAreas(AdminArea.VEICULOS)
  listCategoryReview(@Query() query: ListVehicleCategoryReviewQueryDto) {
    return this.vehiclesService.listCategoryReview(query);
  }

  /**
   * Epic A (Aprovação/reprovação de veículos) — rota literal, antes de
   * `:id` pelo mesmo motivo das demais acima. Responsável enxerga aqui os
   * veículos das rotas ativas dos próprios filhos com alguma observação
   * ainda não reconhecida ("Li e concordo").
   */
  @Get("pendencias-revisao-admin")
  @Roles(Role.RESPONSAVEL)
  listPendingAdminReviewAcknowledgements(@CurrentUser() actor: AuthenticatedUser) {
    return this.vehiclesService.listPendingAdminReviewAcknowledgements(actor);
  }

  @Get(":id")
  @Roles(...READ_ROLES)
  @AdminAreas(AdminArea.VEICULOS)
  findById(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.vehiclesService.findByIdOrThrow(id, actor);
  }

  @Patch(":id")
  @Roles(...MANAGE_ROLES)
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.vehiclesService.update(id, dto, actor, requestMeta(req));
  }

  @Delete(":id")
  @Roles(...MANAGE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.vehiclesService.remove(id, actor, requestMeta(req));
  }

  @Patch(":id/status")
  @Roles(...MANAGE_ROLES)
  updateStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleStatusDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.vehiclesService.updateStatus(id, dto, actor, requestMeta(req));
  }

  @Patch(":id/revisao-categoria")
  @Roles(Role.ADMIN_ROTTA)
  @AdminAreas(AdminArea.VEICULOS)
  resolveCategoryReview(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ResolveVehicleCategoryReviewDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.vehiclesService.resolveCategoryReview(id, dto, actor, requestMeta(req));
  }

  @Patch(":id/revisao-admin")
  @Roles(Role.ADMIN_ROTTA)
  @AdminAreas(AdminArea.VEICULOS)
  reviewVehicle(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ReviewVehicleDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.vehiclesService.reviewVehicle(id, dto, actor, requestMeta(req));
  }

  /** "Li e concordo" — de propósito NUNCA existe "recusar" aqui (pedido explícito do usuário). */
  @Post(":id/revisao-admin/reconhecer")
  @Roles(Role.RESPONSAVEL)
  @HttpCode(HttpStatus.NO_CONTENT)
  acknowledgeAdminReview(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.vehiclesService.acknowledgeAdminReview(id, actor);
  }

  @Patch(":id/location")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR, Role.MOTORISTA)
  updateLocation(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateVehicleLocationDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.vehiclesService.updateLocation(id, dto, actor);
  }

  @Post(":id/photo")
  @Roles(...MANAGE_ROLES)
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 5 * 1024 * 1024 } }))
  uploadPhoto(
    @Param("id", ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.vehiclesService.uploadPhoto(id, file, actor, requestMeta(req));
  }

  @Get(":id/audit-logs")
  @Roles(...MANAGE_ROLES)
  listAuditLogs(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.vehiclesService.listAuditLogs(id, actor, Number(page), Number(pageSize));
  }

  // --- Documentos (briefing "DOCUMENTAÇÃO") ---

  @Post(":id/documents")
  @Roles(...MANAGE_ROLES)
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadDocument(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateVehicleDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.vehiclesService.uploadDocument(id, dto, file, actor, requestMeta(req));
  }

  @Get(":id/documents")
  @Roles(...READ_ROLES)
  @AdminAreas(AdminArea.VEICULOS)
  listDocuments(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query("tipo") tipo?: VehicleDocumentType,
  ) {
    return this.vehiclesService.listDocuments(id, actor, tipo);
  }

  @Delete(":id/documents/:documentId")
  @Roles(...MANAGE_ROLES)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDocument(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("documentId", ParseUUIDPipe) documentId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.vehiclesService.removeDocument(id, documentId, actor, requestMeta(req));
  }

  // --- Manutenção (briefing "MANUTENÇÃO") ---

  @Post(":id/maintenances")
  @Roles(...MANAGE_ROLES)
  createMaintenance(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateVehicleMaintenanceDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.vehiclesService.createMaintenance(id, dto, actor, requestMeta(req));
  }

  @Get(":id/maintenances")
  @Roles(...READ_ROLES)
  listMaintenances(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.vehiclesService.listMaintenances(id, actor, Number(page), Number(pageSize));
  }

  // --- Lembretes (briefing "LEMBRETES") ---

  @Post(":id/reminders")
  @Roles(...MANAGE_ROLES)
  createReminder(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateVehicleReminderDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.vehiclesService.createReminder(id, dto, actor);
  }

  @Get(":id/reminders")
  @Roles(...MANAGE_ROLES)
  listReminders(@Param("id", ParseUUIDPipe) id: string, @CurrentUser() actor: AuthenticatedUser) {
    return this.vehiclesService.listReminders(id, actor);
  }

  @Patch(":id/reminders/:reminderId")
  @Roles(...MANAGE_ROLES)
  updateReminderStatus(
    @Param("id", ParseUUIDPipe) id: string,
    @Param("reminderId", ParseUUIDPipe) reminderId: string,
    @Body() dto: UpdateVehicleReminderDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.vehiclesService.updateReminderStatus(id, reminderId, dto, actor);
  }

  // --- Vinculação (briefing "VINCULAÇÃO") ---

  @Post(":id/assignments")
  @Roles(...MANAGE_ROLES)
  assign(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateVehicleAssignmentDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.vehiclesService.assign(id, dto, actor, requestMeta(req));
  }

  @Get(":id/assignments")
  @Roles(...MANAGE_ROLES)
  listAssignmentHistory(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.vehiclesService.listAssignmentHistory(id, actor);
  }

  // --- Checklist (briefing "CHECKLIST") ---

  @Post(":id/checklists")
  @Roles(Role.MOTORISTA)
  createChecklist(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateVehicleChecklistDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.vehiclesService.createChecklist(id, dto, actor);
  }

  @Get(":id/checklists")
  @Roles(...READ_ROLES)
  listChecklists(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.vehiclesService.listChecklists(id, actor, Number(page), Number(pageSize));
  }

  // --- Ocorrências (briefing "APP MOBILE") ---

  @Post(":id/occurrences")
  @Roles(Role.EMPRESA, Role.GESTOR, Role.MOTORISTA, Role.MONITOR)
  createOccurrence(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: CreateVehicleOccurrenceDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.vehiclesService.createOccurrence(id, dto, actor, requestMeta(req));
  }

  @Get(":id/occurrences")
  @Roles(...READ_ROLES)
  listOccurrences(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query("page") page = 1,
    @Query("pageSize") pageSize = 20,
  ) {
    return this.vehiclesService.listOccurrences(id, actor, Number(page), Number(pageSize));
  }
}
