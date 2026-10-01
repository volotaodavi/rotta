import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CreateIdentityVerificationSessionDto } from "./dto/create-identity-verification-session.dto";
import { DecideIdentityVerificationDto } from "./dto/decide-identity-verification.dto";
import { ListIdentityVerificationsQueryDto } from "./dto/list-identity-verifications-query.dto";
import {
  IdentityVerificationService,
  type AdminIdentityVerificationDetail,
  type AdminIdentityVerificationListResult,
  type IdentityVerificationSessionResult,
  type IdentityVerificationStatusResult,
} from "./identity-verification.service";

import { AdminAreas } from "@/common/decorators/admin-areas.decorator";
import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { SemTenant } from "@/common/decorators/sem-tenant.decorator";
import { AdminArea, Role } from "@/shared/enums";

/** Quem verifica a PRÓPRIA identidade hoje (Motorista/Monitor dirigem; Empresa/Gestor administram a conta) — Responsável/Escola/Admin Rotta não usam este fluxo. */
const SELF_VERIFICATION_ROLES = [Role.EMPRESA, Role.GESTOR, Role.MOTORISTA, Role.MONITOR] as const;

/**
 * `@SemTenant()` nas três rotas `me/*` (01/10/2026). Elas agem sempre
 * sobre `actor.sub`, nunca sobre recurso de uma transportadora — e o
 * Motorista/Monitor autônomo precisa delas ANTES de ter vínculo, que é
 * quando o `tenantId` aparece. Sem isso, `TenantGuard` reprovava com
 * `Forbidden resource` antes mesmo do `RolesGuard` conferir o papel
 * (relato real: "o transportador tenta verificar a identidade e o app
 * dá erro"). Ver o decorator para o porquê de ser seguro.
 *
 * API REST da verificação de identidade hospedada via Didit
 * (`identity-verification/me/*`) — sempre a PRÓPRIA identidade do ator
 * autenticado (`actor.sub`), nunca um `userId` recebido do cliente.
 *
 * `identity-verification/admin/*` é a contraparte do Admin Rotta —
 * visão de todos os usuários, sincronização pull com a Didit e decisão
 * manual (aprovar/recusar) direto do painel, sem precisar abrir o
 * Business Console dela.
 */
@ApiTags("identity-verification")
@ApiBearerAuth()
@Controller("identity-verification")
export class IdentityVerificationController {
  constructor(private readonly service: IdentityVerificationService) {}

  @Get("me")
  @Roles(...SELF_VERIFICATION_ROLES)
  @SemTenant()
  getMyStatus(@CurrentUser() actor: AuthenticatedUser): Promise<IdentityVerificationStatusResult> {
    return this.service.getStatus(actor.sub);
  }

  @Post("me/sessions")
  @HttpCode(HttpStatus.CREATED)
  @Roles(...SELF_VERIFICATION_ROLES)
  @SemTenant()
  createMySession(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateIdentityVerificationSessionDto,
  ): Promise<IdentityVerificationSessionResult> {
    return this.service.createSession(actor.sub, actor.role, dto.callbackUrl);
  }

  /** Pull-based, self-service — mesmo endpoint da Didit que `admin/:userId/refresh` usa, aqui escopado ao próprio ator. Corrige o caso relatado: "Em andamento" travado porque o webhook nunca chegou. */
  @Post("me/refresh")
  @Roles(...SELF_VERIFICATION_ROLES)
  @SemTenant()
  refreshMyStatus(
    @CurrentUser() actor: AuthenticatedUser,
  ): Promise<IdentityVerificationStatusResult> {
    return this.service.refreshForSelf(actor.sub);
  }

  @Get("admin")
  @Roles(Role.ADMIN_ROTTA)
  @AdminAreas(AdminArea.IDENTIDADE)
  listAdmin(
    @Query() query: ListIdentityVerificationsQueryDto,
  ): Promise<AdminIdentityVerificationListResult> {
    return this.service.listForAdmin(query);
  }

  @Get("admin/:userId")
  @Roles(Role.ADMIN_ROTTA)
  @AdminAreas(AdminArea.IDENTIDADE)
  getAdmin(@Param("userId") userId: string): Promise<AdminIdentityVerificationDetail> {
    return this.service.getForAdmin(userId);
  }

  @Post("admin/:userId/refresh")
  @Roles(Role.ADMIN_ROTTA)
  @AdminAreas(AdminArea.IDENTIDADE)
  refreshAdmin(@Param("userId") userId: string): Promise<AdminIdentityVerificationDetail> {
    return this.service.refreshForAdmin(userId);
  }

  @Post("admin/:userId/decision")
  @Roles(Role.ADMIN_ROTTA)
  @AdminAreas(AdminArea.IDENTIDADE)
  decideAdmin(
    @Param("userId") userId: string,
    @Body() dto: DecideIdentityVerificationDto,
  ): Promise<AdminIdentityVerificationDetail> {
    return this.service.decideForAdmin(userId, dto);
  }
}
