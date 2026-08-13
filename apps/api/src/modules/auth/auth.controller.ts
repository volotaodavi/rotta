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
  Req,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Throttle, ThrottlerGuard } from "@nestjs/throttler";

import { AuthService, type AuthRequestMeta } from "./auth.service";
import { AcceptConsentDto } from "./dto/accept-consent.dto";
import { ChangePasswordDto } from "./dto/change-password.dto";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { MfaDisableDto } from "./dto/mfa-disable.dto";
import { MfaEnableDto } from "./dto/mfa-enable.dto";
import { MfaSetupDto } from "./dto/mfa-setup.dto";
import { MfaVerifyLoginDto } from "./dto/mfa-verify-login.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterEmpresaDto } from "./dto/register-empresa.dto";
import { RegisterPessoalDto } from "./dto/register-pessoal.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";

import type { Request } from "express";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Public } from "@/common/decorators/public.decorator";

function requestMeta(req: Request, deviceName?: string): AuthRequestMeta {
  return { ip: req.ip, userAgent: req.headers["user-agent"], deviceName };
}

/**
 * API REST do módulo Auth (Dossiê 15) — login único compartilhado por
 * Landing Page/Site/Painel Web/App (briefing: "Todas as plataformas
 * compartilharão exatamente a mesma conta"). `ThrottlerGuard` aplicado a
 * todo o controller (Dossiê 12 §7.4 — força bruta); limites mais
 * apertados em rotas sensíveis via `@Throttle(...)` por método.
 */
@ApiTags("auth")
@ApiBearerAuth()
@Controller("auth")
@UseGuards(ThrottlerGuard)
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post("register/empresa")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(@Body() dto: RegisterEmpresaDto, @Req() req: Request) {
    return this.authService.register(dto, requestMeta(req));
  }

  @Public()
  @Post("register/pessoal")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  registerPessoal(@Body() dto: RegisterPessoalDto, @Req() req: Request) {
    return this.authService.registerPessoal(dto, requestMeta(req));
  }

  @Public()
  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(@Body() dto: LoginDto, @Req() req: Request) {
    return this.authService.login(dto, requestMeta(req, dto.deviceName));
  }

  /**
   * MFA (Dossiê 43) — os três endpoints abaixo são `@Public()` de
   * propósito: rodam ANTES de qualquer sessão existir, autenticados só
   * pelo `mfaSetupToken`/`mfaChallengeToken` de curta duração (o próprio
   * corpo do DTO), nunca por um JWT de acesso no header `Authorization`.
   * `ThrottlerGuard` do controller já cobre — mais apertado aqui por
   * serem, junto de `login`, os alvos mais óbvios de força bruta.
   */
  @Public()
  @Post("mfa/setup")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  setupMfa(@Body() dto: MfaSetupDto) {
    return this.authService.setupMfa(dto);
  }

  /**
   * MFA deixou de ser exigido no login (ver `AuthService.login`) — quem
   * QUISER ativar o segundo fator por conta própria (sessão já
   * autenticada, nunca `@Public()`) começa por aqui em vez de esperar
   * um `mfaSetupToken` que o login não emite mais para quem não tem
   * TOTP. Devolve o mesmo `mfaSetupToken` de curta duração que
   * `POST /auth/mfa/enable` já espera.
   */
  @Post("mfa/setup/start")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  startMfaSetup(@CurrentUser() actor: AuthenticatedUser) {
    return this.authService.startMfaSetup(actor);
  }

  @Public()
  @Post("mfa/enable")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  enableMfa(@Body() dto: MfaEnableDto, @Req() req: Request) {
    return this.authService.enableMfa(dto, requestMeta(req));
  }

  @Public()
  @Post("mfa/verify-login")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyMfaLogin(@Body() dto: MfaVerifyLoginDto, @Req() req: Request) {
    return this.authService.verifyMfaLogin(dto, requestMeta(req));
  }

  /** Requer sessão autenticada de verdade (nunca `@Public()`) — desativar MFA exige já estar dentro da conta. */
  @Post("mfa/disable")
  @HttpCode(HttpStatus.NO_CONTENT)
  async disableMfa(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: MfaDisableDto,
  ): Promise<void> {
    await this.authService.disableMfa(actor, dto);
  }

  @Public()
  @Post("refresh")
  @HttpCode(HttpStatus.OK)
  refresh(@Body() dto: RefreshTokenDto, @Req() req: Request) {
    return this.authService.refresh(dto, requestMeta(req));
  }

  @Public()
  @Post("logout")
  @HttpCode(HttpStatus.NO_CONTENT)
  async logout(@Body() dto: RefreshTokenDto): Promise<void> {
    await this.authService.logout(dto.refreshToken);
  }

  @Public()
  @Post("forgot-password")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async forgotPassword(@Body() dto: ForgotPasswordDto): Promise<{ message: string }> {
    await this.authService.forgotPassword(dto);
    return {
      message:
        "Se este e-mail existir em nossa base, você receberá um link de redefinição em instantes.",
    };
  }

  @Public()
  @Post("reset-password")
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(dto);
    return {
      message:
        "Senha redefinida com sucesso. Você foi desconectado de todos os dispositivos por segurança.",
    };
  }

  @Get("me")
  me(@CurrentUser() actor: AuthenticatedUser) {
    return this.authService.me(actor);
  }

  /** Autoatendimento LGPD (Dossiê 33) — portabilidade/confirmação de tratamento dos próprios dados. */
  @Get("me/data-export")
  dataExport(@CurrentUser() actor: AuthenticatedUser) {
    return this.authService.dataExport(actor);
  }

  /** Reaceite de Termos/Privacidade (Dossiê 45 FRENTE 5) — chamado quando `GET /auth/me` retorna `pendingConsents` não-vazio. */
  @Post("me/consent")
  acceptConsent(@CurrentUser() actor: AuthenticatedUser, @Body() dto: AcceptConsentDto) {
    return this.authService.acceptConsent(actor, dto.tipos);
  }

  @Patch("me/password")
  async changePassword(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    await this.authService.changePassword(actor, dto);
    return {
      message: "Senha alterada com sucesso. Suas outras sessões foram encerradas por segurança.",
    };
  }

  @Get("sessions")
  listSessions(@CurrentUser() actor: AuthenticatedUser) {
    return this.authService.listSessions(actor.sub, actor.sessionId);
  }

  @Delete("sessions/other")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeOtherSessions(@CurrentUser() actor: AuthenticatedUser): Promise<void> {
    await this.authService.revokeAllOtherSessions(actor.sub, actor.sessionId);
  }

  @Delete("sessions/:id")
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeSession(
    @CurrentUser() actor: AuthenticatedUser,
    @Param("id", ParseUUIDPipe) id: string,
  ): Promise<void> {
    await this.authService.revokeSession(actor.sub, id, actor.sessionId);
  }
}
