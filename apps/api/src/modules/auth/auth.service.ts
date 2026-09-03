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
import { EventEmitter2 } from "@nestjs/event-emitter";
import { JwtService } from "@nestjs/jwt";
import { CompanyType, NotificationEventType, UserStatus } from "@prisma/client";


import { PASSWORD_RESET_TOKEN_REPOSITORY, SESSION_REPOSITORY } from "./auth.constants";
import { MfaService } from "./mfa.service";
import { PasswordResetNotifierService } from "./password-reset-notifier.service";

import type {
  AuthTokensResponseDto,
  MeResponseDto,
  MfaChallengeResponseDto,
  MfaEnableResponseDto,
  MfaSetupRequiredResponseDto,
  MfaSetupResponseDto,
  ProfileSelectionResponseDto,
} from "./dto/auth-response.dto";
import type { ChangePasswordDto } from "./dto/change-password.dto";
import type { DataExportResponseDto } from "./dto/data-export-response.dto";
import type { ForgotPasswordDto } from "./dto/forgot-password.dto";
import type { LoginDto } from "./dto/login.dto";
import type { MfaDisableDto } from "./dto/mfa-disable.dto";
import type { MfaEnableDto } from "./dto/mfa-enable.dto";
import type { MfaSetupDto } from "./dto/mfa-setup.dto";
import type { MfaVerifyLoginDto } from "./dto/mfa-verify-login.dto";
import type { RefreshTokenDto } from "./dto/refresh-token.dto";
import type { RegisterAutonomoDto } from "./dto/register-autonomo.dto";
import type { RegisterEmpresaDto } from "./dto/register-empresa.dto";
import type { RegisterPessoalDto } from "./dto/register-pessoal.dto";
import type { ResetPasswordDto } from "./dto/reset-password.dto";
import type { SessionResponseDto } from "./dto/session-response.dto";
import type { PasswordResetTokenRepository } from "./repositories/password-reset-token.repository";
import type { SessionRepository } from "./repositories/session.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AuthConfig } from "@/config/auth.config";
import type { RecordAuditLogInput } from "@/modules/audit/repositories/audit-log.repository";
import type { ConsentType, User } from "@prisma/client";
import { resolveTrialBloqueioMotivo } from "@/common/billing/resolve-trial-bloqueio.util";
import { TRIAL_BLOQUEIO_MENSAGENS } from "@/common/exceptions/trial-expirado.exception";
import { parseDurationToMs } from "@/common/utils/duration.util";
import { PrismaService } from "@/infra/database/prisma.service";
import { PasswordHasherService } from "@/infra/security/password-hasher.service";
import { TurnstileService } from "@/infra/turnstile/turnstile.service";
import { AuditLogService } from "@/modules/audit/audit-log.service";
import { CompaniesService, type RequestMeta } from "@/modules/companies/companies.service";
import { CompanyJoinRequestsService } from "@/modules/company-join-requests/company-join-requests.service";
import { COMMUNICATION_REQUESTED_EVENT } from "@/modules/notifications/events/communication-requested.event";

import { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import { StudentPreRegistrationsService } from "@/modules/student-pre-registrations/student-pre-registrations.service";
import { UsersService } from "@/modules/users/users.service";
import { Role } from "@/shared/enums";

export interface AuthRequestMeta extends RequestMeta {
  deviceName?: string;
  /** "web" exige Turnstile no cadastro; qualquer outro valor (app nativo, cliente antigo sem o header) pula — ver `TurnstileService`. */
  platform?: "web" | "mobile";
}

const GENERIC_LOGIN_ERROR = "Não foi possível entrar. Verifique os dados e tente novamente.";
const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

/**
 * Tokens de MFA (Dossiê 43) — assinados com o MESMO par de chaves
 * RS256 dos tokens de acesso (`JwtService` já configurado no módulo),
 * mas com payload minimalista e TTL bem mais curto: nunca carregam
 * `role`/`tenantId`/`vinculoId`, então mesmo que um vazasse não
 * autenticariam NENHUMA rota protegida — o `TenantGuard` global rejeita
 * qualquer papel fora de `ADMIN_ROTTA`/`RESPONSAVEL` sem `tenantId`
 * (ver `tenant.guard.ts`), e este payload nunca declara `role`. O campo
 * `purpose` é a segunda camada de defesa, verificada explicitamente por
 * `verifyMfaToken` — um token de setup nunca é aceito onde se espera um
 * de challenge, e vice-versa.
 */
type MfaTokenPurpose = "mfa_setup" | "mfa_challenge";
const MFA_TOKEN_TTL = "5m";

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
    private readonly eventEmitter: EventEmitter2,
    private readonly messagePersonalizationService: MessagePersonalizationService,
    private readonly mfaService: MfaService,
    private readonly auditLogService: AuditLogService,
    private readonly studentPreRegistrationsService: StudentPreRegistrationsService,
    private readonly companyJoinRequestsService: CompanyJoinRequestsService,
    private readonly turnstileService: TurnstileService,
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
    // "Não sou um robô" (pedido do usuário 01/09/2026) — sempre primeiro,
    // antes de qualquer escrita no banco.
    await this.assertHumanIfWeb(dto, meta);

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

    return this.issueTokens(
      adminUser,
      company.id,
      Role.EMPRESA,
      membership.id,
      meta,
      company.nomeFantasia,
      company.tipo,
    );
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
    await this.assertHumanIfWeb(dto, meta);

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

    // Área pública de convite (pedido do usuário: "o responsável recebe
    // o código da transportadora... caso já tenha um pré-cadastro...
    // vai ter lá confirmado") — reivindica o pré-cadastro que a tela já
    // encontrou via `GET /student-pre-registrations/lookup` (pública)
    // ANTES desta conta existir. Best-effort de propósito: se outra
    // pessoa reivindicou no meio do caminho (corrida rara), a conta
    // ainda assim é criada normalmente — o cadastro do aluno só segue
    // pelo caminho "do zero" em vez do caminho prefilled.
    if (dto.preRegistrationId) {
      try {
        await this.studentPreRegistrationsService.claim(
          { sub: user.id, tenantId: null, role: Role.RESPONSAVEL, vinculoId: user.id },
          dto.preRegistrationId,
        );
      } catch (error) {
        this.logger.warn(
          `Não foi possível reivindicar o pré-cadastro ${dto.preRegistrationId} para o novo responsável ${user.id}: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    const { titulo, corpo } = this.messagePersonalizationService.novoResponsavel(dto.nome);
    this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
      userId: user.id,
      tipo: NotificationEventType.NOVO_RESPONSAVEL,
      titulo,
      corpo,
    });

    // Boas-vindas (pedido do usuário 31/08/2026: "quero todos") —
    // dirigido a QUEM ACABOU DE CRIAR A CONTA, diferente do evento
    // acima (que é administrativo, "fulano foi cadastrado").
    const boasVindas = this.messagePersonalizationService.cadastroConcluido(dto.nome);
    this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
      userId: user.id,
      tipo: NotificationEventType.CADASTRO_CONCLUIDO,
      titulo: boasVindas.titulo,
      corpo: boasVindas.corpo,
    });

    return this.issueTokens(user, null, Role.RESPONSAVEL, user.id, meta);
  }

  /**
   * Cadastro self-service de Motorista/Monitor autônomo (Frente N,
   * briefing item 9) — mesmo mecanismo de `registerPessoal` (`users` sem
   * RLS, nenhum `Company`/`Membership` ainda), mas grava
   * `User.autonomoRole` em vez de `isResponsavel`: é o que permite
   * `login()` reemitir o mesmo papel em acessos futuros ANTES de existir
   * qualquer vínculo. Depois de completar a Didit
   * (`identity-verification/me/sessions`, já liberado para este papel —
   * ver `SELF_VERIFICATION_ROLES`), o usuário pede vínculo com uma
   * transportadora via `CompanyJoinRequestsService.create`.
   */
  async registerAutonomo(
    dto: RegisterAutonomoDto,
    meta: AuthRequestMeta,
  ): Promise<AuthTokensResponseDto> {
    await this.assertHumanIfWeb(dto, meta);

    const email = dto.email.trim().toLowerCase();
    await this.usersService.assertNoDuplicateIdentity(email, dto.telefone, dto.cpf);

    const user = await this.usersService.createUserWithPassword({
      nome: dto.nome,
      email,
      telefone: dto.telefone,
      cpf: dto.cpf,
      senha: dto.senha,
      autonomoRole: dto.role,
    });

    await this.usersService.recordLgpdConsent(user.id);

    // Frente 9 (auditoria 31/08/2026, pedido do usuário: "o fluxo deverá
    // garantir isso" — código da transportadora primeiro, dados depois,
    // conta como continuação de um único fluxo, igual ao que o
    // Responsável já tinha via `preRegistrationId`). O cliente já validou
    // o código publicamente (`GET /student-pre-registrations/
    // company-preview`) ANTES de coletar os dados pessoais — best-effort
    // aqui, mesmo princípio do `claim` de `registerPessoal` logo acima:
    // numa corrida rara (código desativado nesse meio-tempo), a conta
    // ainda é criada normalmente, só sem o pedido de vínculo automático
    // (a pessoa pode tentar de novo depois, autenticada, na tela "Meu
    // pedido" — nada se perde). A aprovação da empresa continua manual;
    // só a ORDEM do fluxo muda.
    if (dto.codigoInterno) {
      try {
        await this.companyJoinRequestsService.create(
          { sub: user.id, tenantId: null, role: dto.role, vinculoId: user.id },
          { codigoInterno: dto.codigoInterno },
        );
      } catch (error) {
        this.logger.warn(
          `Não foi possível criar o pedido de vínculo automático para ${user.id} (código ${dto.codigoInterno}): ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }

    // Boas-vindas (pedido do usuário 31/08/2026: "quero todos").
    const boasVindas = this.messagePersonalizationService.cadastroConcluido(dto.nome);
    this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
      userId: user.id,
      tipo: NotificationEventType.CADASTRO_CONCLUIDO,
      titulo: boasVindas.titulo,
      corpo: boasVindas.corpo,
    });

    return this.issueTokens(user, null, dto.role, user.id, meta);
  }

  /**
   * Cloudflare Turnstile ("não sou um robô", pedido do usuário
   * 01/09/2026) — só EXIGE o token quando `meta.platform === "web"`: o
   * widget é uma tecnologia de navegador, o app nativo não tem como
   * rodar (ver `ApiClientConfig.platform`, `packages/api-client/src/
   * http.ts`) — exigir ali travaria todo cadastro pelo app assim que
   * `TURNSTILE_SECRET_KEY` fosse configurada em produção.
   */
  private async assertHumanIfWeb(
    dto: { turnstileToken?: string },
    meta: AuthRequestMeta,
  ): Promise<void> {
    if (meta.platform !== "web") return;
    await this.turnstileService.assertHuman(dto.turnstileToken, meta.ip);
  }

  /**
   * Login único (Dossiê 15, `AUTH-02`) — mesmo endpoint para toda
   * plataforma. Retorna tokens diretamente quando há exatamente um
   * vínculo ativo (ou a conta é Responsável); com mais de um vínculo e
   * nenhum `companyId` informado, retorna a lista de perfis para seleção
   * em vez de tokens (ver `LoginDto`).
   *
   * Admin Rotta (Dossiê 43, atualizado depois — pedido explícito do
   * usuário em produção: "desative a verificação de duas etapas para os
   * admins... deixe o login livre, apenas com a senha"). Senha correta
   * SEMPRE recebe tokens diretamente agora, mesmo pra uma conta com
   * `totpHabilitado` de uma configuração de MFA anterior — o login
   * nunca mais checa esse campo. `setupMfa`/`enableMfa`/`verifyMfaLogin`/
   * `disableMfa` continuam existindo no código (não removidos), mas
   * `verifyMfaLogin` ficou inalcançável: nada mais emite o
   * `mfaChallengeToken` que ele exige, porque este método não devolve
   * mais `mfaRequired` pra ninguém.
   */
  async login(
    dto: LoginDto,
    meta: AuthRequestMeta,
  ): Promise<
    | AuthTokensResponseDto
    | ProfileSelectionResponseDto
    | MfaSetupRequiredResponseDto
    | MfaChallengeResponseDto
  > {
    const user = await this.usersService.findByIdentifier(dto.identificador.trim());

    // RN de não-enumeração (Dossiê 12 §7.4): mesma mensagem genérica
    // tanto para identificador inexistente quanto para senha incorreta.
    // Sem auditoria aqui também por não-enumeração: um identificador que
    // não existe não gera nenhum registro atribuível a um `User` real.
    if (!user || user.deletedAt || user.status !== UserStatus.ATIVO) {
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    if (this.usersService.isLockedOut(user)) {
      const minutes = Math.ceil((user.bloqueadoAte!.getTime() - Date.now()) / 60_000);
      await this.recordAuditBestEffort({
        entidadeTipo: "User",
        entidadeId: user.id,
        acao: "LOGIN_FAILED",
        atorUserId: user.id,
        dadosDepois: { motivo: "bloqueado_por_tentativas" },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedException(
        `Muitas tentativas. Tente novamente em ${minutes} minuto(s).`,
      );
    }

    const passwordValid = await this.passwordHasher.verify(user.passwordHash, dto.senha);
    if (!passwordValid) {
      await this.usersService.recordLoginFailure(user);
      await this.recordAuditBestEffort({
        entidadeTipo: "User",
        entidadeId: user.id,
        acao: "LOGIN_FAILED",
        atorUserId: user.id,
        dadosDepois: { motivo: "senha_incorreta" },
        ip: meta.ip,
        userAgent: meta.userAgent,
      });
      throw new UnauthorizedException(GENERIC_LOGIN_ERROR);
    }

    await this.usersService.resetLoginFailures(user.id);

    if (user.isAdminRotta) {
      return this.issueTokensWithLoginAudit(user, null, Role.ADMIN_ROTTA, user.id, meta);
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
      return this.issueTokensWithLoginAudit(user, null, Role.RESPONSAVEL, user.id, meta);
    }

    // Motorista/Monitor autônomo (Frente N, `registerAutonomo`) — mesmo
    // mecanismo do Responsável acima: sem `Membership` ainda (pode estar
    // no meio da Didit, ou com um `CompanyJoinRequest` `PENDENTE`/
    // `RECUSADO`), reemite o mesmo papel em vez de recusar a entrada.
    // Assim que o primeiro `Membership` é criado (pedido aprovado),
    // `UsersService.clearAutonomoRole` zera este campo e o próximo login
    // já cai no ramo de `memberships.length >= 1` abaixo.
    if (
      memberships.length === 0 &&
      (user.autonomoRole === Role.MOTORISTA || user.autonomoRole === Role.MONITOR)
    ) {
      return this.issueTokensWithLoginAudit(user, null, user.autonomoRole, user.id, meta);
    }

    if (memberships.length === 0) {
      throw new ForbiddenException("Esta conta ainda não possui nenhum vínculo ativo.");
    }

    if (memberships.length === 1) {
      const [only] = memberships;
      return this.issueTokensWithLoginAudit(
        user,
        only!.companyId,
        only!.role as Role,
        only!.id,
        meta,
        only!.company.nomeFantasia,
        only!.company.tipo,
      );
    }

    if (dto.companyId) {
      const selected = memberships.find((membership) => membership.companyId === dto.companyId);
      if (!selected) {
        throw new ForbiddenException("Vínculo informado não pertence a este usuário.");
      }
      return this.issueTokensWithLoginAudit(
        user,
        selected.companyId,
        selected.role as Role,
        selected.id,
        meta,
        selected.company.nomeFantasia,
        selected.company.tipo,
      );
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
   * MFA passo 1/2 (Dossiê 43) — gera um novo segredo TOTP e o mantém
   * PENDENTE (`totpHabilitado` continua `false` até `enableMfa`
   * confirmar com um código real do app autenticador). Chamar de novo
   * antes de confirmar simplesmente substitui o segredo pendente
   * anterior — seguro, nada foi ativado ainda.
   */
  async setupMfa(dto: MfaSetupDto): Promise<MfaSetupResponseDto> {
    const userId = await this.verifyMfaToken(dto.mfaSetupToken, "mfa_setup");
    return this.buildMfaSetupResponse(userId);
  }

  /**
   * Início de MFA por escolha própria (Dossiê 43 atualizado — MFA
   * deixou de ser forçado no login, ver comentário em `login()`). Um
   * Admin Rotta já autenticado que QUISER proteger a conta com TOTP
   * começa por aqui em vez de receber um `mfaSetupToken` embutido numa
   * resposta de login que não existe mais para quem não tem MFA. Emite
   * o mesmo tipo de `mfaSetupToken` de curta duração que `setupMfa`
   * sempre emitiu, pra reusar `POST /auth/mfa/enable` sem duplicar o
   * passo 2/2.
   */
  async startMfaSetup(
    actor: AuthenticatedUser,
  ): Promise<MfaSetupResponseDto & { mfaSetupToken: string }> {
    const setup = await this.buildMfaSetupResponse(actor.sub);
    return { ...setup, mfaSetupToken: await this.signMfaToken(actor.sub, "mfa_setup") };
  }

  private async buildMfaSetupResponse(userId: string): Promise<MfaSetupResponseDto> {
    const user = await this.requireActiveAdminRotta(userId);

    if (user.totpHabilitado) {
      throw new BadRequestException("MFA já está ativado para esta conta.");
    }

    const secretPlain = this.mfaService.generateSecret();
    await this.usersService.savePendingMfaSecret(
      user.id,
      this.mfaService.encryptSecret(secretPlain),
    );

    const otpauthUrl = this.mfaService.buildOtpAuthUrl(secretPlain, user.email);
    const qrCodeDataUrl = await this.mfaService.buildQrCodeDataUrl(otpauthUrl);
    return { secret: secretPlain, otpauthUrl, qrCodeDataUrl };
  }

  /**
   * MFA passo 2/2 — confirma a posse do app autenticador com o primeiro
   * código real gerado, ativa o MFA, gera os 10 códigos de recuperação
   * (mostrados só nesta resposta, nunca de novo) e finalmente emite os
   * tokens de sessão — é o único caminho de um Admin Rotta sem MFA
   * chegar a ter acesso de verdade.
   */
  async enableMfa(dto: MfaEnableDto, meta: AuthRequestMeta): Promise<MfaEnableResponseDto> {
    const userId = await this.verifyMfaToken(dto.mfaSetupToken, "mfa_setup");
    const user = await this.requireActiveAdminRotta(userId);

    if (!user.totpSecretCriptografado) {
      throw new BadRequestException(
        "Nenhum setup de MFA pendente. Chame /auth/mfa/setup primeiro.",
      );
    }

    const secretPlain = this.mfaService.decryptSecret(user.totpSecretCriptografado);
    const codeValid = this.mfaService.verifyCode(secretPlain, dto.code);
    if (!codeValid) {
      throw new BadRequestException(
        "Código inválido. Confira o horário do celular e tente de novo.",
      );
    }

    const recoveryCodesPlain = this.mfaService.generateRecoveryCodes();
    const recoveryCodeHashes = await this.mfaService.hashRecoveryCodes(recoveryCodesPlain);
    await this.usersService.confirmMfaEnabled(user.id, recoveryCodeHashes);

    await this.recordAuditBestEffort({
      entidadeTipo: "User",
      entidadeId: user.id,
      acao: "MFA_ENABLED",
      atorUserId: user.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const tokens = await this.issueTokensWithLoginAudit(
      user,
      null,
      Role.ADMIN_ROTTA,
      user.id,
      meta,
    );
    return { tokens, recoveryCodes: recoveryCodesPlain };
  }

  /**
   * MFA — segundo fator do login de uma conta que JÁ tem TOTP ativado.
   * Aceita ou o código de 6 dígitos do app autenticador, ou (perdeu o
   * celular) um código de recuperação de uso único — nunca os dois.
   */
  async verifyMfaLogin(
    dto: MfaVerifyLoginDto,
    meta: AuthRequestMeta,
  ): Promise<AuthTokensResponseDto> {
    const userId = await this.verifyMfaToken(dto.mfaChallengeToken, "mfa_challenge");
    const user = await this.requireActiveAdminRotta(userId);

    if (!user.totpHabilitado || !user.totpSecretCriptografado) {
      throw new UnauthorizedException();
    }

    if (dto.recoveryCode) {
      const matchIndex = await this.mfaService.matchRecoveryCode(
        dto.recoveryCode,
        user.totpCodigosRecuperacaoHashes,
      );
      if (matchIndex === null) {
        await this.recordAuditBestEffort({
          entidadeTipo: "User",
          entidadeId: user.id,
          acao: "MFA_LOGIN_FAILED",
          atorUserId: user.id,
          dadosDepois: { metodo: "recovery_code" },
          ip: meta.ip,
          userAgent: meta.userAgent,
        });
        throw new UnauthorizedException("Código de recuperação inválido.");
      }
      const remainingHashes = user.totpCodigosRecuperacaoHashes.filter(
        (_, index) => index !== matchIndex,
      );
      await this.usersService.replaceMfaRecoveryCodeHashes(user.id, remainingHashes);
    } else if (dto.code) {
      const secretPlain = this.mfaService.decryptSecret(user.totpSecretCriptografado);
      const codeValid = this.mfaService.verifyCode(secretPlain, dto.code);
      if (!codeValid) {
        await this.recordAuditBestEffort({
          entidadeTipo: "User",
          entidadeId: user.id,
          acao: "MFA_LOGIN_FAILED",
          atorUserId: user.id,
          dadosDepois: { metodo: "totp" },
          ip: meta.ip,
          userAgent: meta.userAgent,
        });
        throw new UnauthorizedException("Código inválido.");
      }
    } else {
      throw new BadRequestException(
        "Informe o código do app autenticador ou um código de recuperação.",
      );
    }

    return this.issueTokensWithLoginAudit(user, null, Role.ADMIN_ROTTA, user.id, meta);
  }

  /**
   * Desativa o MFA de uma sessão JÁ autenticada — exige o código TOTP
   * atual (briefing §31: "ações críticas exigem confirmação adicional"),
   * nunca só a senha/sessão válida. Reativar depois exige `setupMfa` +
   * `enableMfa` de novo, com um segredo novo (o antigo nunca é reusado).
   */
  async disableMfa(actor: AuthenticatedUser, dto: MfaDisableDto): Promise<void> {
    const user = await this.usersService.findById(actor.sub);
    if (!user || !user.totpHabilitado || !user.totpSecretCriptografado) {
      throw new BadRequestException("MFA não está ativado para esta conta.");
    }

    const secretPlain = this.mfaService.decryptSecret(user.totpSecretCriptografado);
    const codeValid = this.mfaService.verifyCode(secretPlain, dto.code);
    if (!codeValid) {
      throw new BadRequestException("Código inválido.");
    }

    await this.usersService.disableMfa(user.id);
    await this.recordAuditBestEffort({
      entidadeTipo: "User",
      entidadeId: user.id,
      acao: "MFA_DISABLED",
      atorUserId: actor.sub,
    });
  }

  private async signMfaToken(userId: string, purpose: MfaTokenPurpose): Promise<string> {
    return this.jwtService.signAsync({ sub: userId, purpose }, { expiresIn: MFA_TOKEN_TTL });
  }

  private async verifyMfaToken(token: string, expectedPurpose: MfaTokenPurpose): Promise<string> {
    let payload: { sub: string; purpose?: MfaTokenPurpose };
    try {
      payload = await this.jwtService.verifyAsync(token);
    } catch {
      throw new UnauthorizedException("Sessão de MFA inválida ou expirada. Faça login novamente.");
    }
    if (payload.purpose !== expectedPurpose) {
      throw new UnauthorizedException("Sessão de MFA inválida ou expirada. Faça login novamente.");
    }
    return payload.sub;
  }

  private async requireActiveAdminRotta(userId: string): Promise<User> {
    const user = await this.usersService.findById(userId);
    if (!user || user.deletedAt || user.status !== UserStatus.ATIVO || !user.isAdminRotta) {
      throw new UnauthorizedException();
    }
    return user;
  }

  /** `issueTokens` + auditoria `LOGIN_SUCCESS` — só para os caminhos de LOGIN de verdade (nunca `register*`/`refresh`, que não são "entrar", são "criar conta"/"renovar sessão"). */
  private async issueTokensWithLoginAudit(
    user: User,
    tenantId: string | null,
    role: Role,
    vinculoId: string,
    meta: AuthRequestMeta,
    companyNameHint?: string | null,
    companyTypeHint?: CompanyType | null,
  ): Promise<AuthTokensResponseDto> {
    const tokens = await this.issueTokens(
      user,
      tenantId,
      role,
      vinculoId,
      meta,
      companyNameHint,
      companyTypeHint,
    );
    await this.recordAuditBestEffort({
      companyId: tenantId ?? undefined,
      entidadeTipo: "User",
      entidadeId: user.id,
      acao: "LOGIN_SUCCESS",
      atorUserId: user.id,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
    return tokens;
  }

  /** Auditoria nunca pode derrubar um login/MFA que já era válido — mesmo espírito "best-effort" de `TripsService.detectarAproximacaoBestEffort`. */
  private async recordAuditBestEffort(input: RecordAuditLogInput): Promise<void> {
    try {
      await this.auditLogService.record(input);
    } catch (error) {
      this.logger.warn(
        `Falha ao registrar auditoria (${input.acao}, ${input.entidadeTipo} ${input.entidadeId})`,
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
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

    await this.passwordResetNotifier.notify(user.email, rawToken);
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
    let companyType: CompanyType | null = null;
    if (actor.tenantId) {
      const memberships = await this.usersService.listActiveMembershipsWithCompany(user.id);
      const company = memberships.find((m) => m.companyId === actor.tenantId)?.company;
      companyName = company?.nomeFantasia ?? null;
      companyType = company?.tipo ?? null;
    }

    return this.toMeResponse(user, actor.tenantId, actor.role, companyName, companyType);
  }

  /** Reaceite de Termos/Privacidade (Dossiê 45 FRENTE 5) — chamado quando `GET /auth/me` retorna `pendingConsents` não-vazio; grava a versão vigente de cada `tipo` informado e devolve o perfil já atualizado. */
  async acceptConsent(actor: AuthenticatedUser, tipos: ConsentType[]): Promise<MeResponseDto> {
    await this.usersService.recordConsent(actor.sub, tipos);
    return this.me(actor);
  }

  /**
   * Exportação autoatendida dos dados pessoais do próprio usuário
   * (Dossiê 33 — Prompt 23, LGPD art. 18 II/V: confirmação de
   * tratamento + portabilidade). Escopo desta entrega: identidade +
   * vínculos + sessões — ver doc do `DataExportResponseDto` para o que
   * fica de fora e por quê.
   */
  async dataExport(actor: AuthenticatedUser): Promise<DataExportResponseDto> {
    const user = await this.usersService.findById(actor.sub);
    if (!user) {
      throw new UnauthorizedException();
    }

    const [memberships, sessoesAtivas] = await Promise.all([
      this.usersService.listActiveMembershipsWithCompany(user.id),
      this.listSessions(user.id, actor.sessionId),
    ]);

    return {
      geradoEm: new Date(),
      usuario: {
        id: user.id,
        nome: user.nome,
        email: user.email,
        telefone: user.telefone,
        cpf: user.cpf,
        avatarUrl: user.avatarUrl,
        criadoEm: user.createdAt,
        consentimentoLgpdAceitoEm: user.consentimentoLgpdAceitoEm,
      },
      vinculos: memberships.map((m) => ({
        empresaId: m.companyId,
        empresaNome: m.company.nomeFantasia,
        papel: m.role,
        status: m.status,
        iniciadoEm: m.iniciadoEm,
        encerradoEm: m.encerradoEm,
      })),
      sessoesAtivas,
      escopo:
        "Esta exportação cobre identidade (User), vínculos (Membership) e sessões ativas — os " +
        "dados que o módulo Auth possui diretamente. Não inclui ainda dado de outros módulos " +
        "(ex. alunos cadastrados, documentos enviados, histórico de viagens, chamados de " +
        "suporte) — cada um exigiria integrar aquele módulo aqui; ver Dossiê 33 para o escopo " +
        "completo e o plano de evolução (agregador cross-módulo).",
    };
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
  /**
   * `companyNameHint` (Dossiê 12 §7.4, otimização de latência do login):
   * quase todo chamador daqui (`login`/`register`) JÁ tem o
   * `nomeFantasia` da empresa em mãos no momento da chamada — veio de
   * `Company` recém-criada ou de um `Membership` já carregado com
   * `include: { company: true }` (`listActiveMembershipsWithCompany`).
   * Antes, `issueTokens` sempre reconsultava o banco só para achar esse
   * nome de novo — uma query redundante em TODO login com empresa,
   * exatamente no caminho mais sensível a latência percebida pelo
   * usuário. Passar o hint pronto pula essa query; só quando o
   * chamador de fato não tem o dado à mão (`refresh`, sessão restaurada
   * sem `Membership` carregado) é que ainda consultamos, `undefined`
   * sinaliza esse caso — nunca `null`, que significa "sem empresa"
   * (Responsável/Admin Rotta).
   */
  async issueTokens(
    user: User,
    tenantId: string | null,
    role: Role,
    vinculoId: string,
    meta: AuthRequestMeta,
    companyNameHint?: string | null,
    companyTypeHint?: CompanyType | null,
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
      // Ver `AdminAreaGuard`/`AdminArea` — só relevante pra ADMIN_ROTTA,
      // `undefined` (nunca gravado no JWT) pra todo outro papel.
      adminPapel: role === Role.ADMIN_ROTTA ? user.adminRottaPapel : undefined,
    };
    const accessToken = await this.jwtService.signAsync(payload);

    let companyName: string | null = companyNameHint ?? null;
    let companyType: CompanyType | null = companyTypeHint ?? null;
    if (tenantId && companyNameHint === undefined) {
      const memberships = await this.usersService.listActiveMembershipsWithCompany(user.id);
      const company = memberships.find((m) => m.companyId === tenantId)?.company;
      companyName = company?.nomeFantasia ?? null;
      companyType = company?.tipo ?? null;
    }

    return {
      accessToken,
      refreshToken: refreshTokenPlain,
      user: await this.toMeResponse(user, tenantId, role, companyName, companyType),
    };
  }

  private async toMeResponse(
    user: User,
    tenantId: string | null,
    role: Role,
    companyName: string | null,
    companyType: CompanyType | null,
  ): Promise<MeResponseDto> {
    const pendingConsents = await this.usersService.getPendingConsents(user.id);

    // Faturamento (Dossiê 26) — só Role.EMPRESA/GESTOR tem Company/
    // mensalidade (Responsável/Admin Rotta/Motorista/Monitor sempre
    // `billingBlocked: false`). Consulta própria via `withBypass` (não
    // reaproveita `companyName`/`companyType` já resolvidos acima
    // porque nem toda chamada de `issueTokens` passa por uma busca de
    // `Company` completa — ver `companyNameHint`) — mesma regra exata
    // de `TrialGuard`/`resolveTrialBloqueioMotivo`, nunca duplicada.
    let billingBlocked = false;
    let billingBlockedReason: string | null = null;
    if (tenantId && (role === Role.EMPRESA || role === Role.GESTOR)) {
      const company = await this.prisma.withBypass(
        this.prisma.company.findUnique({
          where: { id: tenantId },
          select: { status: true, trialExpiraEm: true },
        }),
      );
      const motivo = company
        ? resolveTrialBloqueioMotivo(company.status, company.trialExpiraEm)
        : null;
      billingBlocked = Boolean(motivo);
      billingBlockedReason = motivo ? TRIAL_BLOQUEIO_MENSAGENS[motivo] : null;
    }

    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      telefone: user.telefone,
      avatarUrl: user.avatarUrl,
      role,
      companyId: tenantId,
      companyName,
      companyType,
      mfaEnabled: user.totpHabilitado,
      pendingConsents,
      billingBlocked,
      billingBlockedReason,
      adminPapel: role === Role.ADMIN_ROTTA ? user.adminRottaPapel : undefined,
    };
  }
}
