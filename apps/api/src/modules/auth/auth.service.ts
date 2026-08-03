import { createHash, randomBytes } from "node:crypto";

import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { JwtService } from "@nestjs/jwt";
import { UserStatus } from "@prisma/client";


import { PASSWORD_RESET_TOKEN_REPOSITORY, SESSION_REPOSITORY } from "./auth.constants";
import { PasswordResetNotifierService } from "./password-reset-notifier.service";

import type {
  AuthTokensResponseDto,
  MeResponseDto,
  ProfileSelectionResponseDto,
} from "./dto/auth-response.dto";
import type { ChangePasswordDto } from "./dto/change-password.dto";
import type { ForgotPasswordDto } from "./dto/forgot-password.dto";
import type { LoginDto } from "./dto/login.dto";
import type { RefreshTokenDto } from "./dto/refresh-token.dto";
import type { RegisterEmpresaDto } from "./dto/register-empresa.dto";
import type { RegisterPessoalDto } from "./dto/register-pessoal.dto";
import type { ResetPasswordDto } from "./dto/reset-password.dto";
import type { SessionResponseDto } from "./dto/session-response.dto";
import type { PasswordResetTokenRepository } from "./repositories/password-reset-token.repository";
import type { SessionRepository } from "./repositories/session.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AuthConfig } from "@/config/auth.config";
import type { User } from "@prisma/client";

import { parseDurationToMs } from "@/common/utils/duration.util";
import { PrismaService } from "@/infra/database/prisma.service";
import { PasswordHasherService } from "@/infra/security/password-hasher.service";
import { CompaniesService, type RequestMeta } from "@/modules/companies/companies.service";
import { UsersService } from "@/modules/users/users.service";
import { Role } from "@/shared/enums";

export interface AuthRequestMeta extends RequestMeta {
  deviceName?: string;
}

const GENERIC_LOGIN_ERROR = "Não foi possível entrar. Verifique os dados e tente novamente.";
const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

/**
 * Núcleo de negócio do módulo Auth (Dossiê 15) — login único
 * compartilhado por Landing Page/Site/Painel Web/App (briefing "toda
 * autenticação deverá utilizar o mesmo banco de usuários"). Nunca
 * duplica a lógica de criação de Empresa/Usuário/Vínculo já existente em
 * `CompaniesService`/`UsersService` (Dossiê 16) — o cadastro self-service
 * é literalmente a mesma operação de negócio, apenas acionada pelo
 * próprio registrante em vez do Admin Rotta.
 */
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly usersService: UsersService,
    private readonly companiesService: CompaniesService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
    private readonly passwordResetNotifier: PasswordResetNotifierService,
    @Inject(SESSION_REPOSITORY) private readonly sessionRepository: SessionRepository,
    @Inject(PASSWORD_RESET_TOKEN_REPOSITORY)
    private readonly passwordResetTokenRepository: PasswordResetTokenRepository,
  ) {}

  /**
   * Cadastro self-service (Dossiê 15, `AUTH-01`) — Empresa/MEI/Autônomo.
   * Roda como um Admin Rotta autenticado rodaria (mesma transação
   * atômica Company+User+Membership de `CompaniesService.create`), mas
   * sem nenhum tenant/JWT ainda existir: `runWithTenantContext` com
   * bypass explícito é o mesmo mecanismo documentado em
   * `prisma.service.ts`, usado deliberadamente aqui porque não há outra
   * forma de uma rota `@Public()` escrever em tabelas com RLS.
   */
  async register(dto: RegisterEmpresaDto, meta: AuthRequestMeta): Promise<AuthTokensResponseDto> {
    const syntheticActor: AuthenticatedUser = {
      sub: "",
      tenantId: null,
      role: Role.EMPRESA,
      vinculoId: "",
    };

    const { company, adminUser, membership } = await this.prisma.runWithTenantContext(
      { tenantId: null, bypass: true },
      async () => {
        const createdCompany = await this.companiesService.create(dto, syntheticActor, meta);
        const createdAdminUser = await this.usersService.findByIdentifier(
          dto.administrador.email.trim().toLowerCase(),
        );
        if (!createdAdminUser) {
          throw new InternalServerErrorException(
            "Falha ao localizar o administrador recém-criado.",
          );
        }
        const createdMembership = await this.usersService.findActiveMembership(
          createdAdminUser.id,
          createdCompany.id,
        );
        if (!createdMembership) {
          throw new InternalServerErrorException("Falha ao localizar o vínculo recém-criado.");
        }
        return {
          company: createdCompany,
          adminUser: createdAdminUser,
          membership: createdMembership,
        };
      },
    );

    await this.usersService.recordLgpdConsent(adminUser.id);

    return this.issueTokens(adminUser, company.id, Role.EMPRESA, membership.id, meta);
  }

  /**
   * Cadastro self-service da Área Pessoal (briefing "Marketplace" —
   * Responsável). Bem mais simples que `register` (Empresa): `users`
   * não tem RLS, então não precisa de `runWithTenantContext`/bypass —
   * é só criar o `User` com `isResponsavel: true` e emitir o token
   * diretamente (sem `Company`/`Membership` nenhum).
   */
  async registerPessoal(
    dto: RegisterPessoalDto,
    meta: AuthRequestMeta,
  ): Promise<AuthTokensResponseDto> {
    const email = dto.email.trim().toLowerCase();
    await this.usersService.assertNoDuplicateIdentity(email, dto.telefone, dto.cpf);

    const user = await this.usersService.createUserWithPassword({
      nome: dto.nome,
      email,
      telefone: dto.telefone,
      cpf: dto.cpf,
      senha: dto.senha,
      isResponsavel: true,
    });

    await this.usersService.recordLgpdConsent(user.id);

    return this.issueTokens(user, null, Role.RESPONSAVEL, user.id, meta);
  }

  /**
   * Login único (Dossiê 15, `AUTH-02`) — mesmo endpoint para toda
   * plataforma. Retorna tokens diretamente quando há exatamente um
   * vínculo ativo (ou a conta é Admin Rotta/Responsável); com mais de
   * um vínculo e nenhum `companyId` informado, retorna a lista de
   * perfis para seleção em vez de tokens (ver `LoginDto`).
   */
  async login(
    dto: LoginDto,
    meta: AuthRequestMeta,
  ): Promise<AuthTokensResponseDto | ProfileSelectionResponseDto> {
    const user = await this.usersService.findByIdentifier(dto.identificador.trim());

    // RN de não-enumeração (Dossiê 12 §7.4): mesma mensagem genérica
    // tanto para identificador inexistente quanto para senha incorreta.
    if (!user || user.deletedAt || user.status !== UserStatus.ATIVO) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    if (this.usersService.isLockedOut(user)) {
      const minutes = Math.ceil((user.bloqueadoAte!.getTime() - Date.now()) / 60_000);
      throw new UnauthorizedException(
        `Muitas tentativas. Tente novamente em ${minutes} minuto(s).`,
      );
    }

    const passwordValid = await this.passwordHasher.verify(user.passwordHash, dto.senha);
    if (!passwordValid) {
      await this.usersService.recordLoginFailure(user);
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    await this.usersService.resetLoginFailures(user.id);

    if (user.isAdminRotta) {
      return this.issueTokens(user, null, Role.ADMIN_ROTTA, user.id, meta);
    }

    const memberships = await this.usersService.listActiveMembershipsWithCompany(user.id);

    // Responsável "puro" (módulo Marketplace) — sem nenhum Membership,
    // entra direto como RESPONSAVEL. Uma mesma pessoa que É Responsável
    // E TEM Membership(s) simultâneos (Dossiê 8 §2 — múltiplos papéis)
    // fica fora do escopo desta entrega: por ora ela segue o fluxo de
    // seleção de perfil abaixo apenas entre seus Memberships, sem a
    // opção "Área Pessoal" aparecer na lista — documentado, não um bug
    // escondido.
    if (user.isResponsavel && memberships.length === 0) {
      return this.issueTokens(user, null, Role.RESPONSAVEL, user.id, meta);
    }

    if (memberships.length === 0) {
      throw new ForbiddenException("Esta conta ainda não possui nenhum vínculo ativo.");
    }

    if (memberships.length === 1) {
      const [only] = memberships;
      return this.issueTokens(user, only!.companyId, only!.role as Role, only!.id, meta);
    }

    if (dto.companyId) {
      const selected = memberships.find((membership) => membership.companyId === dto.companyId);
      if (!selected) {
        throw new ForbiddenException("Vínculo informado não pertence a este usuário.");
      }
      return this.issueTokens(user, selected.companyId, selected.role as Role, selected.id, meta);
    }

    return {
      requiresProfileSelection: true,
      profiles: memberships.map((membership) => ({
        companyId: membership.companyId,
        companyName: membership.company.nomeFantasia,
        role: membership.role as Role,
      })),
    };
  }

  /**
   * Rotação de refresh token (Dossiê 12 §4.4): cada refresh token só
   * pode ser usado uma vez — a próxima chamada revoga o atual e emite
   * um par novo. Reapresentar um refresh token JÁ revogado é tratado
   * como possível comprometimento (reuso) e revoga TODAS as sessões do
   * usuário, não apenas a apresentada.
   */
  async refresh(dto: RefreshTokenDto, meta: AuthRequestMeta): Promise<AuthTokensResponseDto> {
    const tokenHash = this.hashToken(dto.refreshToken);
    const session = await this.sessionRepository.findByRefreshTokenHash(tokenHash);

    if (!session) {
      throw new UnauthorizedException("Sessão inválida.");
    }

    if (session.revokedAt) {
      this.logger.warn(
        `Reuso de refresh token já revogado detectado (userId=${session.userId}) — revogando todas as sessões.`,
      );
      await this.sessionRepository.revokeAllForUser(session.userId);
      throw new UnauthorizedException("Sessão inválida. Faça login novamente.");
    }

    if (session.expiresAt.getTime() < Date.now()) {
      throw new UnauthorizedException("Sessão expirada. Faça login novamente.");
    }

    const user = await this.usersService.findById(session.userId);
    if (!user || user.deletedAt || user.status !== UserStatus.ATIVO) {
      throw new UnauthorizedException("Sessão inválida.");
    }

    await this.sessionRepository.revoke(session.id);

    return this.issueTokens(user, session.tenantId, session.role as Role, session.vinculoId, {
      ip: meta.ip,
      userAgent: meta.userAgent,
      deviceName: session.deviceName ?? undefined,
    });
  }

  /** AUTH-05 — encerra apenas a sessão do refresh token apresentado; idempotente se já inválido. */
  async logout(refreshToken: string): Promise<void> {
    const session = await this.sessionRepository.findByRefreshTokenHash(
      this.hashToken(refreshToken),
    );
    if (session && !session.revokedAt) {
      await this.sessionRepository.revoke(session.id);
    }
  }

  /** AUTH-06 — "Meus dispositivos". */
  async listSessions(userId: string, currentSessionId?: string): Promise<SessionResponseDto[]> {
    const sessions = await this.sessionRepository.listActiveByUser(userId);
    return sessions.map((session) => ({
      id: session.id,
      deviceName: session.deviceName,
      ip: session.ip,
      createdAt: session.createdAt,
      lastUsedAt: session.lastUsedAt,
      isCurrentSession: session.id === currentSessionId,
    }));
  }

  /** A sessão atual nunca pode ser revogada por aqui (Dossiê 15, `AUTH-06`) — existe o Logout para isso. */
  async revokeSession(userId: string, sessionId: string, currentSessionId?: string): Promise<void> {
    if (sessionId === currentSessionId) {
      throw new BadRequestException('Use "Sair" para encerrar a sessão atual.');
    }
    const session = await this.sessionRepository.findById(sessionId);
    if (!session || session.userId !== userId) {
      throw new NotFoundException("Sessão não encontrada.");
    }
    await this.sessionRepository.revoke(sessionId);
  }

  /** AUTH-06-A1 — "Encerrar todas as outras sessões". */
  async revokeAllOtherSessions(userId: string, currentSessionId?: string): Promise<void> {
    await this.sessionRepository.revokeAllForUser(userId, currentSessionId);
  }

  /** AUTH-07 — troca de senha autenticada; revoga as demais sessões (`RN-AUTH-04`). */
  async changePassword(actor: AuthenticatedUser, dto: ChangePasswordDto): Promise<void> {
    const user = await this.usersService.findById(actor.sub);
    if (!user) {
      throw new UnauthorizedException();
    }

    const valid = await this.passwordHasher.verify(user.passwordHash, dto.senhaAtual);
    if (!valid) {
      throw new BadRequestException("Senha atual incorreta.");
    }

    const newHash = await this.passwordHasher.hash(dto.novaSenha);
    await this.usersService.updatePassword(user.id, newHash);
    await this.sessionRepository.revokeAllForUser(user.id, actor.sessionId);
  }

  /** AUTH-03 — sempre a mesma resposta genérica no controller, exista ou não a conta (`RN-AUTH-03`). */
  async forgotPassword(dto: ForgotPasswordDto): Promise<void> {
    const user = await this.usersService.findByIdentifier(dto.email.trim().toLowerCase());
    if (!user) {
      return;
    }

    await this.passwordResetTokenRepository.invalidateAllForUser(user.id);

    const rawToken = randomBytes(32).toString("hex");
    await this.passwordResetTokenRepository.create({
      userId: user.id,
      tokenHash: this.hashToken(rawToken),
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
    });

    this.passwordResetNotifier.notify(user.email, rawToken);
  }

  /** AUTH-03 — token de uso único; revoga todas as sessões ao concluir (`RN-AUTH-04`). */
  async resetPassword(dto: ResetPasswordDto): Promise<void> {
    const resetToken = await this.passwordResetTokenRepository.findByTokenHash(
      this.hashToken(dto.token),
    );

    if (!resetToken || resetToken.usedAt || resetToken.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("Este link expirou. Solicite a redefinição novamente.");
    }

    const newHash = await this.passwordHasher.hash(dto.novaSenha);
    await this.usersService.updatePassword(resetToken.userId, newHash);
    await this.passwordResetTokenRepository.markUsed(resetToken.id);
    await this.sessionRepository.revokeAllForUser(resetToken.userId);
  }

  async me(actor: AuthenticatedUser): Promise<MeResponseDto> {
    const user = await this.usersService.findById(actor.sub);
    if (!user) {
      throw new UnauthorizedException();
    }

    let companyName: string | null = null;
    if (actor.tenantId) {
      const memberships = await this.usersService.listActiveMembershipsWithCompany(user.id);
      companyName =
        memberships.find((m) => m.companyId === actor.tenantId)?.company.nomeFantasia ?? null;
    }

    return this.toMeResponse(user, actor.tenantId, actor.role, companyName);
  }

  private hashToken(token: string): string {
    return createHash("sha256").update(token).digest("hex");
  }

  /**
   * Emite `access_token`/`refresh_token` para um `User`+vínculo já
   * resolvidos e cria a `Session` correspondente. Público porque
   * `InvitesService.redeem` reutiliza exatamente esta emissão (Dossiê 15
   * `AUTH-01-A1`: "aceita o convite... entra normalmente" — mesmo
   * mecanismo de login, nunca duplicado).
   */
  async issueTokens(
    user: User,
    tenantId: string | null,
    role: Role,
    vinculoId: string,
    meta: AuthRequestMeta,
  ): Promise<AuthTokensResponseDto> {
    const refreshTokenPlain = randomBytes(48).toString("hex");
    const refreshTtl = this.configService.get<AuthConfig>("auth")!.refreshTokenTtl;
    const expiresAt = new Date(Date.now() + parseDurationToMs(refreshTtl));

    const session = await this.sessionRepository.create({
      userId: user.id,
      refreshTokenHash: this.hashToken(refreshTokenPlain),
      deviceName: meta.deviceName,
      ip: meta.ip,
      userAgent: meta.userAgent,
      expiresAt,
      tenantId,
      role,
      vinculoId,
    });

    const payload: AuthenticatedUser = {
      sub: user.id,
      tenantId,
      role,
      vinculoId,
      sessionId: session.id,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    let companyName: string | null = null;
    if (tenantId) {
      const memberships = await this.usersService.listActiveMembershipsWithCompany(user.id);
      companyName = memberships.find((m) => m.companyId === tenantId)?.company.nomeFantasia ?? null;
    }

    return {
      accessToken,
      refreshToken: refreshTokenPlain,
      user: this.toMeResponse(user, tenantId, role, companyName),
    };
  }

  private toMeResponse(
    user: User,
    tenantId: string | null,
    role: Role,
    companyName: string | null,
  ): MeResponseDto {
    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      telefone: user.telefone,
      avatarUrl: user.avatarUrl,
      role,
      companyId: tenantId,
      companyName,
    };
  }
}
