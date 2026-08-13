import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  Req,
  UploadedFile,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { ApiBearerAuth, ApiConsumes, ApiResponse, ApiTags } from "@nestjs/swagger";
import { DriverDocumentType } from "@prisma/client";

import { DriversService, type RequestMeta } from "./drivers.service";
import { CreateDriverDocumentDto } from "./dto/create-driver-document.dto";
import { SchoolTransportEligibilityResponseDto } from "./dto/school-transport-eligibility-response.dto";
import { TeamMemberResponseDto } from "./dto/team-member-response.dto";

import type { Request } from "express";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

/**
 * API REST do módulo Drivers (Dossiê 28 — CNH/EAR/Cursos obrigatórios).
 * Rotas aninhadas em `:userId` (não em `:id` do próprio documento) —
 * mesmo padrão de `vehicles/:id/documents`, só que o "dono" aqui é o
 * `User` (motorista/monitor), não um `Vehicle`.
 *
 * RBAC (ver `DriversService.resolveCompanyContext` para o detalhe):
 * - `MOTORISTA`/`MONITOR`: só os próprios documentos.
 * - `EMPRESA`/`GESTOR`: documentos de qualquer motorista/monitor da
 *   própria empresa — nunca remove (documento é evidência de
 *   compliance, não um dado que o gestor edita livremente).
 * - `ADMIN_ROTTA`: qualquer motorista, informando `companyId` via query.
 */
@ApiTags("drivers")
@ApiBearerAuth()
@Controller("drivers")
export class DriversController {
  constructor(private readonly driversService: DriversService) {}

  /**
   * Equipe da empresa (Frente K) — Motoristas/Monitores/Gestores com
   * `Membership` ATIVO, incluindo status de verificação de identidade
   * Didit. Rota separada de `:userId/documents` de propósito: aqui o
   * "dono" é a EMPRESA (uma listagem), não um motorista específico.
   */
  @Get("team")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR)
  @ApiResponse({ status: 200, type: [TeamMemberResponseDto] })
  listTeam(@CurrentUser() actor: AuthenticatedUser, @Query("companyId") companyId?: string) {
    return this.driversService.listTeam(actor, companyId);
  }

  @Post(":userId/documents")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR, Role.MOTORISTA, Role.MONITOR)
  @ApiConsumes("multipart/form-data")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 10 * 1024 * 1024 } }))
  uploadDocument(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Body() dto: CreateDriverDocumentDto,
    @UploadedFile() file: Express.Multer.File,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
    @Query("companyId") companyId?: string,
  ) {
    return this.driversService.uploadDocument(
      userId,
      dto,
      file,
      actor,
      requestMeta(req),
      companyId,
    );
  }

  @Get(":userId/documents")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR, Role.MOTORISTA, Role.MONITOR)
  listDocuments(
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query("tipo") tipo?: DriverDocumentType,
    @Query("companyId") companyId?: string,
  ) {
    return this.driversService.listDocuments(userId, actor, tipo, companyId);
  }

  @Delete(":userId/documents/:documentId")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeDocument(
    @Param("userId", ParseUUIDPipe) userId: string,
    @Param("documentId", ParseUUIDPipe) documentId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
    @Query("companyId") companyId?: string,
  ) {
    return this.driversService.removeDocument(
      userId,
      documentId,
      actor,
      requestMeta(req),
      companyId,
    );
  }

  /**
   * Elegibilidade para TRANSPORTE ESCOLAR (Dossiê 45 — CATEGORIA B ≠
   * TRANSPORTE ESCOLAR). Nunca deriva o resultado só da categoria da
   * CNH — ver `school-transport-eligibility.util.ts`.
   */
  @Get(":userId/school-transport-eligibility")
  @Roles(Role.ADMIN_ROTTA, Role.EMPRESA, Role.GESTOR, Role.MOTORISTA, Role.MONITOR)
  getSchoolTransportEligibility(
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Query("companyId") companyId?: string,
  ): Promise<SchoolTransportEligibilityResponseDto> {
    return this.driversService.getSchoolTransportEligibility(userId, actor, companyId);
  }
}
