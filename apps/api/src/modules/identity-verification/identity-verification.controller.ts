import { Body, Controller, Get, HttpCode, HttpStatus, Post } from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";

import { CreateIdentityVerificationSessionDto } from "./dto/create-identity-verification-session.dto";
import {
  IdentityVerificationService,
  type IdentityVerificationSessionResult,
  type IdentityVerificationStatusResult,
} from "./identity-verification.service";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";


/** Quem verifica a PRÓPRIA identidade hoje (Motorista/Monitor dirigem; Empresa/Gestor administram a conta) — Responsável/Escola/Admin Rotta não usam este fluxo. */
const SELF_VERIFICATION_ROLES = [Role.EMPRESA, Role.GESTOR, Role.MOTORISTA, Role.MONITOR] as const;

/**
 * API REST da verificação de identidade hospedada via Didit
 * (`identity-verification/me/*`) — sempre a PRÓPRIA identidade do ator
 * autenticado (`actor.sub`), nunca um `userId` recebido do cliente.
 */
@ApiTags("identity-verification")
@ApiBearerAuth()
@Controller("identity-verification")
export class IdentityVerificationController {
  constructor(private readonly service: IdentityVerificationService) {}

  @Get("me")
  @Roles(...SELF_VERIFICATION_ROLES)
  getMyStatus(@CurrentUser() actor: AuthenticatedUser): Promise<IdentityVerificationStatusResult> {
    return this.service.getStatus(actor.sub);
  }

  @Post("me/sessions")
  @HttpCode(HttpStatus.CREATED)
  @Roles(...SELF_VERIFICATION_ROLES)
  createMySession(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateIdentityVerificationSessionDto,
  ): Promise<IdentityVerificationSessionResult> {
    return this.service.createSession(actor.sub, dto.callbackUrl);
  }
}
