import { BadRequestException, ForbiddenException, UnauthorizedException } from "@nestjs/common";
import { CompanyType, UserStatus } from "@prisma/client";
import { authenticator } from "otplib";

import { AuthService } from "../auth.service";
import { MfaService } from "../mfa.service";

import type { PasswordResetNotifierService } from "../password-reset-notifier.service";
import type { PasswordResetTokenRepository } from "../repositories/password-reset-token.repository";
import type { SessionRepository } from "../repositories/session.repository";
import type { PrismaService } from "@/infra/database/prisma.service";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { CompaniesService } from "@/modules/companies/companies.service";
import type { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import type { StudentPreRegistrationsService } from "@/modules/student-pre-registrations/student-pre-registrations.service";
import type { MembershipWithCompany } from "@/modules/users/repositories/membership.repository";
import type { UsersService } from "@/modules/users/users.service";
import type { ConfigService } from "@nestjs/config";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import type { JwtService } from "@nestjs/jwt";
import type { Session, User } from "@prisma/client";

import { PasswordHasherService } from "@/infra/security/password-hasher.service";
import { SecretCipherService } from "@/infra/security/secret-cipher.service";
import { Role } from "@/shared/enums";

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    nome: "Carla Gama",
    email: "carla@gama.com.br",
    telefone: "11944442222",
    cpf: "11122233396",
    passwordHash: "hashed",
    status: UserStatus.ATIVO,
    avatarUrl: null,
    tentativasLoginFalhas: 0,
    bloqueadoAte: null,
    consentimentoLgpdAceitoEm: null,
    isAdminRotta: false,
    isResponsavel: false,
    totpSecretCriptografado: null,
    totpHabilitado: false,
    totpHabilitadoEm: null,
    totpCodigosRecuperacaoHashes: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function buildSession(overrides: Partial<Session> = {}): Session {
  return {
    id: "session-1",
    userId: "user-1",
    refreshTokenHash: "hash",
    deviceName: null,
    ip: null,
    userAgent: null,
    tenantId: "company-1",
    role: Role.EMPRESA,
    vinculoId: "membership-1",
    createdAt: new Date(),
    lastUsedAt: new Date(),
    expiresAt: new Date(Date.now() + 60_000),
    revokedAt: null,
    ...overrides,
  };
}

function buildMembership(overrides: Partial<MembershipWithCompany> = {}): MembershipWithCompany {
  return {
    id: "membership-1",
    userId: "user-1",
    companyId: "company-1",
    role: Role.EMPRESA,
    status: "ATIVO",
    convidadoPorId: null,
    iniciadoEm: new Date(),
    encerradoEm: null,
    company: {
      id: "company-1",
      nomeFantasia: "Gama Transportes",
      tipo: CompanyType.LTDA,
    } as MembershipWithCompany["company"],
    ...overrides,
  };
}

describe("AuthService", () => {
  let service: AuthService;
  let usersService: jest.Mocked<UsersService>;
  let companiesService: jest.Mocked<CompaniesService>;
  let passwordHasher: jest.Mocked<PasswordHasherService>;
  let jwtService: jest.Mocked<JwtService>;
  let configService: jest.Mocked<ConfigService>;
  let prisma: jest.Mocked<PrismaService>;
  let passwordResetNotifier: jest.Mocked<PasswordResetNotifierService>;
  let sessionRepository: jest.Mocked<SessionRepository>;
  let passwordResetTokenRepository: jest.Mocked<PasswordResetTokenRepository>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let messagePersonalizationService: jest.Mocked<MessagePersonalizationService>;
  let mfaService: MfaService;
  let auditLogService: jest.Mocked<AuditLogService>;
  let studentPreRegistrationsService: jest.Mocked<StudentPreRegistrationsService>;

  beforeEach(() => {
    usersService = {
      findByIdentifier: jest.fn(),
      findById: jest.fn(),
      findActiveMembership: jest.fn(),
      listActiveMembershipsWithCompany: jest.fn(),
      isLockedOut: jest.fn().mockReturnValue(false),
      recordLoginFailure: jest.fn(),
      resetLoginFailures: jest.fn(),
      updatePassword: jest.fn(),
      recordLgpdConsent: jest.fn(),
      recordConsent: jest.fn(),
      getPendingConsents: jest.fn().mockResolvedValue([]),
      savePendingMfaSecret: jest.fn(),
      confirmMfaEnabled: jest.fn(),
      disableMfa: jest.fn(),
      replaceMfaRecoveryCodeHashes: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    companiesService = {
      create: jest.fn(),
    } as unknown as jest.Mocked<CompaniesService>;

    passwordHasher = {
      hash: jest.fn(),
      verify: jest.fn(),
    };

    jwtService = {
      signAsync: jest.fn().mockResolvedValue("signed.jwt.token"),
      verifyAsync: jest.fn(),
    } as unknown as jest.Mocked<JwtService>;

    configService = {
      get: jest.fn().mockReturnValue({
        refreshTokenTtl: "30d",
        // 32 bytes válidos para AES-256 (SecretCipherService) — determinístico só para os testes.
        mfaEncryptionKey: Buffer.alloc(32, 7).toString("base64"),
      }),
    } as unknown as jest.Mocked<ConfigService>;

    prisma = {
      runWithTenantContext: jest.fn((_ctx: unknown, fn: () => unknown) => fn()),
    } as unknown as jest.Mocked<PrismaService>;

    passwordResetNotifier = {
      notify: jest.fn(),
    } as unknown as jest.Mocked<PasswordResetNotifierService>;

    sessionRepository = {
      create: jest.fn().mockResolvedValue(buildSession()),
      findByRefreshTokenHash: jest.fn(),
      findById: jest.fn(),
      listActiveByUser: jest.fn(),
      revoke: jest.fn(),
      revokeAllForUser: jest.fn(),
      touchLastUsedAt: jest.fn(),
    };

    passwordResetTokenRepository = {
      create: jest.fn(),
      findByTokenHash: jest.fn(),
      markUsed: jest.fn(),
      invalidateAllForUser: jest.fn(),
    };

    eventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;

    messagePersonalizationService = {
      novoResponsavel: jest.fn().mockReturnValue({ titulo: "Novo responsável", corpo: "..." }),
    } as unknown as jest.Mocked<MessagePersonalizationService>;

    // MfaService real (não mockado): TOTP/hash são deterministicos o
    // suficiente dado o mesmo segredo/relógio, e usar a implementação de
    // verdade é o que permite os testes de `setupMfa`/`enableMfa`/
    // `verifyMfaLogin` gerarem um código válido de verdade (ver
    // `generateValidTotpCode`, mais abaixo).
    mfaService = new MfaService(
      new SecretCipherService(configService),
      new PasswordHasherService(),
    );

    auditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditLogService>;

    studentPreRegistrationsService = {
      claim: jest.fn(),
    } as unknown as jest.Mocked<StudentPreRegistrationsService>;

    service = new AuthService(
      usersService,
      companiesService,
      passwordHasher,
      jwtService,
      configService,
      prisma,
      passwordResetNotifier,
      sessionRepository,
      passwordResetTokenRepository,
      eventEmitter,
      messagePersonalizationService,
      mfaService,
      auditLogService,
      studentPreRegistrationsService,
    );
  });

  describe("login", () => {
    it("rejeita identificador inexistente com mensagem genérica (não-enumeração)", async () => {
      usersService.findByIdentifier.mockResolvedValue(null);
      await expect(service.login({ identificador: "x", senha: "y" }, {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("rejeita conta com soft delete", async () => {
      usersService.findByIdentifier.mockResolvedValue(buildUser({ deletedAt: new Date() }));
      await expect(service.login({ identificador: "x", senha: "y" }, {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("rejeita conta bloqueada por tentativas excessivas", async () => {
      usersService.findByIdentifier.mockResolvedValue(buildUser());
      usersService.isLockedOut.mockReturnValue(true);
      const user = buildUser({ bloqueadoAte: new Date(Date.now() + 5 * 60_000) });
      usersService.findByIdentifier.mockResolvedValue(user);
      await expect(service.login({ identificador: "x", senha: "y" }, {})).rejects.toThrow(
        /Muitas tentativas/,
      );
    });

    it("registra falha e rejeita com mensagem genérica em senha incorreta", async () => {
      usersService.findByIdentifier.mockResolvedValue(buildUser());
      passwordHasher.verify.mockResolvedValue(false);
      await expect(service.login({ identificador: "x", senha: "errada" }, {})).rejects.toThrow(
        UnauthorizedException,
      );
      expect(usersService.recordLoginFailure).toHaveBeenCalledTimes(1);
    });

    it("Admin Rotta SEM MFA ativado recebe tokens direto — MFA deixou de ser obrigatório (pedido do usuário em produção)", async () => {
      usersService.findByIdentifier.mockResolvedValue(
        buildUser({ isAdminRotta: true, totpHabilitado: false }),
      );
      passwordHasher.verify.mockResolvedValue(true);

      const result = await service.login({ identificador: "x", senha: "y" }, {});

      expect("accessToken" in result).toBe(true);
      expect(sessionRepository.create).toHaveBeenCalled();
    });

    it("Admin Rotta COM MFA configurado de antes também recebe tokens direto — login nunca mais checa totpHabilitado (pedido do usuário em produção)", async () => {
      usersService.findByIdentifier.mockResolvedValue(
        buildUser({ isAdminRotta: true, totpHabilitado: true }),
      );
      passwordHasher.verify.mockResolvedValue(true);

      const result = await service.login({ identificador: "x", senha: "y" }, {});

      expect("accessToken" in result).toBe(true);
      expect(sessionRepository.create).toHaveBeenCalled();
    });

    it("rejeita usuário sem nenhum vínculo ativo", async () => {
      usersService.findByIdentifier.mockResolvedValue(buildUser());
      passwordHasher.verify.mockResolvedValue(true);
      usersService.listActiveMembershipsWithCompany.mockResolvedValue([]);
      await expect(service.login({ identificador: "x", senha: "y" }, {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("emite tokens diretamente quando há exatamente um vínculo ativo", async () => {
      usersService.findByIdentifier.mockResolvedValue(buildUser());
      passwordHasher.verify.mockResolvedValue(true);
      usersService.listActiveMembershipsWithCompany.mockResolvedValue([buildMembership()]);

      const result = await service.login({ identificador: "x", senha: "y" }, {});

      expect("accessToken" in result).toBe(true);
      expect(usersService.resetLoginFailures).toHaveBeenCalledWith("user-1");
    });

    it("propaga companyType (AUTONOMO/MEI) para user.companyType — Frente G, alternador Visão completa/Modo Ação do Painel Web depende disto", async () => {
      usersService.findByIdentifier.mockResolvedValue(buildUser());
      passwordHasher.verify.mockResolvedValue(true);
      usersService.listActiveMembershipsWithCompany.mockResolvedValue([
        buildMembership({
          company: {
            id: "company-1",
            nomeFantasia: "Zé Motorista MEI",
            tipo: CompanyType.MEI,
          } as MembershipWithCompany["company"],
        }),
      ]);

      const result = await service.login({ identificador: "x", senha: "y" }, {});

      expect("accessToken" in result).toBe(true);
      if ("accessToken" in result) {
        expect(result.user.companyType).toBe(CompanyType.MEI);
      }
    });

    it("retorna seletor de perfil quando há múltiplos vínculos e nenhum companyId informado", async () => {
      usersService.findByIdentifier.mockResolvedValue(buildUser());
      passwordHasher.verify.mockResolvedValue(true);
      usersService.listActiveMembershipsWithCompany.mockResolvedValue([
        buildMembership({ id: "m1", companyId: "company-1" }),
        buildMembership({ id: "m2", companyId: "company-2", role: Role.GESTOR }),
      ]);

      const result = await service.login({ identificador: "x", senha: "y" }, {});

      expect(result).toMatchObject({ requiresProfileSelection: true });
      if ("requiresProfileSelection" in result) {
        expect(result.profiles).toHaveLength(2);
      }
      expect(sessionRepository.create).not.toHaveBeenCalled();
    });

    it("emite tokens para o vínculo escolhido quando companyId é informado", async () => {
      usersService.findByIdentifier.mockResolvedValue(buildUser());
      passwordHasher.verify.mockResolvedValue(true);
      usersService.listActiveMembershipsWithCompany.mockResolvedValue([
        buildMembership({ id: "m1", companyId: "company-1" }),
        buildMembership({ id: "m2", companyId: "company-2", role: Role.GESTOR }),
      ]);

      const result = await service.login(
        { identificador: "x", senha: "y", companyId: "company-2" },
        {},
      );

      expect("accessToken" in result).toBe(true);
      expect(sessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: "company-2", role: Role.GESTOR }),
      );
    });

    it("Motorista/Monitor autônomo (Frente N) sem Membership ainda reemite o mesmo papel em vez de recusar", async () => {
      usersService.findByIdentifier.mockResolvedValue(buildUser({ autonomoRole: Role.MOTORISTA }));
      passwordHasher.verify.mockResolvedValue(true);
      usersService.listActiveMembershipsWithCompany.mockResolvedValue([]);

      const result = await service.login({ identificador: "x", senha: "y" }, {});

      expect("accessToken" in result).toBe(true);
      expect(sessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ tenantId: null, role: Role.MOTORISTA }),
      );
    });

    it("rejeita companyId que não pertence ao usuário", async () => {
      usersService.findByIdentifier.mockResolvedValue(buildUser());
      passwordHasher.verify.mockResolvedValue(true);
      usersService.listActiveMembershipsWithCompany.mockResolvedValue([
        buildMembership({ id: "m1", companyId: "company-1" }),
        buildMembership({ id: "m2", companyId: "company-2", role: Role.GESTOR }),
      ]);

      await expect(
        service.login({ identificador: "x", senha: "y", companyId: "company-999" }, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("refresh", () => {
    it("rejeita refresh token desconhecido", async () => {
      sessionRepository.findByRefreshTokenHash.mockResolvedValue(null);
      await expect(service.refresh({ refreshToken: "abc" }, {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("revoga TODAS as sessões do usuário ao detectar reuso de um token já revogado", async () => {
      sessionRepository.findByRefreshTokenHash.mockResolvedValue(
        buildSession({ revokedAt: new Date() }),
      );
      await expect(service.refresh({ refreshToken: "abc" }, {})).rejects.toThrow(
        UnauthorizedException,
      );
      expect(sessionRepository.revokeAllForUser).toHaveBeenCalledWith("user-1");
    });

    it("rejeita sessão expirada", async () => {
      sessionRepository.findByRefreshTokenHash.mockResolvedValue(
        buildSession({ expiresAt: new Date(Date.now() - 1000) }),
      );
      await expect(service.refresh({ refreshToken: "abc" }, {})).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("rotaciona: revoga a sessão antiga e emite um novo par preservando tenant/role/vínculo", async () => {
      sessionRepository.findByRefreshTokenHash.mockResolvedValue(buildSession());
      usersService.findById.mockResolvedValue(buildUser());
      usersService.listActiveMembershipsWithCompany.mockResolvedValue([buildMembership()]);

      const result = await service.refresh({ refreshToken: "abc" }, {});

      expect(sessionRepository.revoke).toHaveBeenCalledWith("session-1");
      expect(sessionRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: "company-1",
          role: Role.EMPRESA,
          vinculoId: "membership-1",
        }),
      );
      expect("accessToken" in result).toBe(true);
    });
  });

  describe("logout", () => {
    it("revoga a sessão do refresh token apresentado", async () => {
      sessionRepository.findByRefreshTokenHash.mockResolvedValue(buildSession());
      await service.logout("abc");
      expect(sessionRepository.revoke).toHaveBeenCalledWith("session-1");
    });

    it("é idempotente quando o token já não existe", async () => {
      sessionRepository.findByRefreshTokenHash.mockResolvedValue(null);
      await expect(service.logout("abc")).resolves.toBeUndefined();
      expect(sessionRepository.revoke).not.toHaveBeenCalled();
    });
  });

  describe("sessões", () => {
    it("nunca permite revogar a sessão atual", async () => {
      await expect(service.revokeSession("user-1", "session-1", "session-1")).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejeita revogar sessão de outro usuário", async () => {
      sessionRepository.findById.mockResolvedValue(buildSession({ userId: "outro-user" }));
      await expect(service.revokeSession("user-1", "session-1", "session-2")).rejects.toThrow();
    });

    it("marca isCurrentSession corretamente na listagem", async () => {
      sessionRepository.listActiveByUser.mockResolvedValue([
        buildSession({ id: "s1" }),
        buildSession({ id: "s2" }),
      ]);
      const sessions = await service.listSessions("user-1", "s2");
      expect(sessions.find((s) => s.id === "s2")?.isCurrentSession).toBe(true);
      expect(sessions.find((s) => s.id === "s1")?.isCurrentSession).toBe(false);
    });
  });

  describe("dataExport (Dossiê 33 — autoatendimento LGPD)", () => {
    it("rejeita quando o usuário do token não existe mais", async () => {
      usersService.findById.mockResolvedValue(null);

      await expect(
        service.dataExport({
          sub: "user-1",
          tenantId: "company-1",
          role: Role.EMPRESA,
          vinculoId: "membership-1",
        }),
      ).rejects.toThrow(UnauthorizedException);
    });

    it("nunca inclui passwordHash e agrega identidade + vínculos + sessões", async () => {
      usersService.findById.mockResolvedValue(buildUser());
      usersService.listActiveMembershipsWithCompany.mockResolvedValue([buildMembership()]);
      sessionRepository.listActiveByUser.mockResolvedValue([buildSession()]);

      const result = await service.dataExport({
        sub: "user-1",
        tenantId: "company-1",
        role: Role.EMPRESA,
        vinculoId: "membership-1",
        sessionId: "session-1",
      });

      expect(result.usuario).not.toHaveProperty("passwordHash");
      expect(result.usuario.cpf).toBe("11122233396");
      expect(result.vinculos).toHaveLength(1);
      expect(result.vinculos[0]).toMatchObject({ empresaId: "company-1", papel: Role.EMPRESA });
      expect(result.sessoesAtivas).toHaveLength(1);
      expect(result.sessoesAtivas[0]!.isCurrentSession).toBe(true);
      expect(result.escopo).toContain("Não inclui ainda dado de outros módulos");
    });
  });

  describe("changePassword", () => {
    it("rejeita senha atual incorreta sem alterar nada", async () => {
      usersService.findById.mockResolvedValue(buildUser());
      passwordHasher.verify.mockResolvedValue(false);
      await expect(
        service.changePassword(
          { sub: "user-1", tenantId: "company-1", role: Role.EMPRESA, vinculoId: "m1" },
          { senhaAtual: "errada", novaSenha: "NovaSenha123" },
        ),
      ).rejects.toThrow(BadRequestException);
      expect(usersService.updatePassword).not.toHaveBeenCalled();
    });

    it("atualiza a senha e revoga as demais sessões ao suceder", async () => {
      usersService.findById.mockResolvedValue(buildUser());
      passwordHasher.verify.mockResolvedValue(true);
      passwordHasher.hash.mockResolvedValue("novo-hash");

      await service.changePassword(
        {
          sub: "user-1",
          tenantId: "company-1",
          role: Role.EMPRESA,
          vinculoId: "m1",
          sessionId: "current",
        },
        { senhaAtual: "atual", novaSenha: "NovaSenha123" },
      );

      expect(usersService.updatePassword).toHaveBeenCalledWith("user-1", "novo-hash");
      expect(sessionRepository.revokeAllForUser).toHaveBeenCalledWith("user-1", "current");
    });
  });

  describe("forgotPassword / resetPassword", () => {
    it("não notifica nada para e-mail inexistente", async () => {
      usersService.findByIdentifier.mockResolvedValue(null);
      await service.forgotPassword({ email: "naoexiste@teste.com" });
      expect(passwordResetNotifier.notify).not.toHaveBeenCalled();
      expect(passwordResetTokenRepository.create).not.toHaveBeenCalled();
    });

    it("gera e notifica um token para e-mail existente, invalidando tokens anteriores", async () => {
      usersService.findByIdentifier.mockResolvedValue(buildUser());
      await service.forgotPassword({ email: "carla@gama.com.br" });
      expect(passwordResetTokenRepository.invalidateAllForUser).toHaveBeenCalledWith("user-1");
      expect(passwordResetTokenRepository.create).toHaveBeenCalledTimes(1);
      expect(passwordResetNotifier.notify).toHaveBeenCalledTimes(1);
    });

    it("rejeita token de redefinição expirado", async () => {
      passwordResetTokenRepository.findByTokenHash.mockResolvedValue({
        id: "t1",
        userId: "user-1",
        tokenHash: "hash",
        expiresAt: new Date(Date.now() - 1000),
        usedAt: null,
        createdAt: new Date(),
      });
      await expect(
        service.resetPassword({ token: "abc", novaSenha: "NovaSenha123" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejeita token já utilizado", async () => {
      passwordResetTokenRepository.findByTokenHash.mockResolvedValue({
        id: "t1",
        userId: "user-1",
        tokenHash: "hash",
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: new Date(),
        createdAt: new Date(),
      });
      await expect(
        service.resetPassword({ token: "abc", novaSenha: "NovaSenha123" }),
      ).rejects.toThrow(BadRequestException);
    });

    it("atualiza a senha e revoga TODAS as sessões (RN-AUTH-04) em redefinição bem-sucedida", async () => {
      passwordResetTokenRepository.findByTokenHash.mockResolvedValue({
        id: "t1",
        userId: "user-1",
        tokenHash: "hash",
        expiresAt: new Date(Date.now() + 60_000),
        usedAt: null,
        createdAt: new Date(),
      });
      passwordHasher.hash.mockResolvedValue("novo-hash");

      await service.resetPassword({ token: "abc", novaSenha: "NovaSenha123" });

      expect(usersService.updatePassword).toHaveBeenCalledWith("user-1", "novo-hash");
      expect(passwordResetTokenRepository.markUsed).toHaveBeenCalledWith("t1");
      expect(sessionRepository.revokeAllForUser).toHaveBeenCalledWith("user-1");
    });
  });

  describe("MFA (Dossiê 43 — Admin Rotta)", () => {
    it("setupMfa gera um segredo pendente sem ativar o MFA", async () => {
      const admin = buildUser({ isAdminRotta: true, totpHabilitado: false });
      usersService.findById.mockResolvedValue(admin);
      jwtService.verifyAsync.mockResolvedValue({ sub: admin.id, purpose: "mfa_setup" });

      const result = await service.setupMfa({ mfaSetupToken: "token" });

      expect(result.secret).toEqual(expect.any(String));
      expect(result.otpauthUrl).toContain("otpauth://totp/");
      expect(result.qrCodeDataUrl).toContain("data:image/png;base64,");
      expect(usersService.savePendingMfaSecret).toHaveBeenCalledWith(admin.id, expect.any(String));
    });

    it("setupMfa rejeita um token com purpose diferente de mfa_setup", async () => {
      jwtService.verifyAsync.mockResolvedValue({ sub: "user-1", purpose: "mfa_challenge" });
      await expect(service.setupMfa({ mfaSetupToken: "token" })).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it("setupMfa rejeita quando o MFA já está ativado", async () => {
      const admin = buildUser({ isAdminRotta: true, totpHabilitado: true });
      usersService.findById.mockResolvedValue(admin);
      jwtService.verifyAsync.mockResolvedValue({ sub: admin.id, purpose: "mfa_setup" });

      await expect(service.setupMfa({ mfaSetupToken: "token" })).rejects.toThrow(
        BadRequestException,
      );
    });

    it("enableMfa ativa o MFA com um código válido, gera 10 códigos de recuperação e emite tokens", async () => {
      // Timeout maior: gera e faz bcrypt de verdade de 10 códigos de
      // recuperação — observado próximo de 1s sob contenção de CPU quando a
      // suíte inteira roda em paralelo, não é falha de lógica.
      const secretPlain = mfaService.generateSecret();
      const admin = buildUser({
        isAdminRotta: true,
        totpHabilitado: false,
        totpSecretCriptografado: mfaService.encryptSecret(secretPlain),
      });
      usersService.findById.mockResolvedValue(admin);
      jwtService.verifyAsync.mockResolvedValue({ sub: admin.id, purpose: "mfa_setup" });

      const validCode = authenticator.generate(secretPlain);
      const result = await service.enableMfa({ mfaSetupToken: "token", code: validCode }, {});

      expect(result.recoveryCodes).toHaveLength(10);
      expect("accessToken" in result.tokens).toBe(true);
      expect(usersService.confirmMfaEnabled).toHaveBeenCalledWith(admin.id, expect.any(Array));
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ acao: "MFA_ENABLED" }),
      );
    }, 15000);

    it("enableMfa rejeita código inválido e não ativa nada", async () => {
      const secretPlain = mfaService.generateSecret();
      const admin = buildUser({
        isAdminRotta: true,
        totpHabilitado: false,
        totpSecretCriptografado: mfaService.encryptSecret(secretPlain),
      });
      usersService.findById.mockResolvedValue(admin);
      jwtService.verifyAsync.mockResolvedValue({ sub: admin.id, purpose: "mfa_setup" });

      await expect(
        service.enableMfa({ mfaSetupToken: "token", code: "000000" }, {}),
      ).rejects.toThrow(BadRequestException);
      expect(usersService.confirmMfaEnabled).not.toHaveBeenCalled();
    });

    it("verifyMfaLogin emite tokens com o código TOTP correto", async () => {
      const secretPlain = mfaService.generateSecret();
      const admin = buildUser({
        isAdminRotta: true,
        totpHabilitado: true,
        totpSecretCriptografado: mfaService.encryptSecret(secretPlain),
      });
      usersService.findById.mockResolvedValue(admin);
      jwtService.verifyAsync.mockResolvedValue({ sub: admin.id, purpose: "mfa_challenge" });

      const validCode = authenticator.generate(secretPlain);
      const result = await service.verifyMfaLogin(
        { mfaChallengeToken: "token", code: validCode },
        {},
      );

      expect("accessToken" in result).toBe(true);
    });

    it("verifyMfaLogin rejeita código TOTP incorreto e audita MFA_LOGIN_FAILED", async () => {
      const secretPlain = mfaService.generateSecret();
      const admin = buildUser({
        isAdminRotta: true,
        totpHabilitado: true,
        totpSecretCriptografado: mfaService.encryptSecret(secretPlain),
      });
      usersService.findById.mockResolvedValue(admin);
      jwtService.verifyAsync.mockResolvedValue({ sub: admin.id, purpose: "mfa_challenge" });

      await expect(
        service.verifyMfaLogin({ mfaChallengeToken: "token", code: "000000" }, {}),
      ).rejects.toThrow(UnauthorizedException);
      expect(auditLogService.record).toHaveBeenCalledWith(
        expect.objectContaining({ acao: "MFA_LOGIN_FAILED" }),
      );
    });

    it("verifyMfaLogin aceita um código de recuperação válido e o consome (uso único)", async () => {
      // Timeout maior: hashRecoveryCodes faz bcrypt de verdade (10 hashes),
      // observado passando de 1s sob contenção de CPU quando a suíte inteira
      // roda em paralelo — não é falha de lógica, é custo real do bcrypt.
      const secretPlain = mfaService.generateSecret();
      const recoveryCodes = mfaService.generateRecoveryCodes();
      const hashes = await mfaService.hashRecoveryCodes(recoveryCodes);
      const admin = buildUser({
        isAdminRotta: true,
        totpHabilitado: true,
        totpSecretCriptografado: mfaService.encryptSecret(secretPlain),
        totpCodigosRecuperacaoHashes: hashes,
      });
      usersService.findById.mockResolvedValue(admin);
      jwtService.verifyAsync.mockResolvedValue({ sub: admin.id, purpose: "mfa_challenge" });

      const result = await service.verifyMfaLogin(
        { mfaChallengeToken: "token", recoveryCode: recoveryCodes[0] },
        {},
      );

      expect("accessToken" in result).toBe(true);
      expect(usersService.replaceMfaRecoveryCodeHashes).toHaveBeenCalledWith(
        admin.id,
        expect.any(Array),
      );
      const remainingHashes = usersService.replaceMfaRecoveryCodeHashes.mock.calls[0]![1];
      expect(remainingHashes).toHaveLength(9);
    }, 15000);

    it("verifyMfaLogin rejeita um código de recuperação inválido", async () => {
      // Timeout maior: hashRecoveryCodes faz bcrypt de verdade (10 hashes),
      // observado passando de 1s sob contenção de CPU quando a suíte inteira
      // roda em paralelo — não é falha de lógica, é custo real do bcrypt.
      const secretPlain = mfaService.generateSecret();
      const hashes = await mfaService.hashRecoveryCodes(mfaService.generateRecoveryCodes());
      const admin = buildUser({
        isAdminRotta: true,
        totpHabilitado: true,
        totpSecretCriptografado: mfaService.encryptSecret(secretPlain),
        totpCodigosRecuperacaoHashes: hashes,
      });
      usersService.findById.mockResolvedValue(admin);
      jwtService.verifyAsync.mockResolvedValue({ sub: admin.id, purpose: "mfa_challenge" });

      await expect(
        service.verifyMfaLogin({ mfaChallengeToken: "token", recoveryCode: "ZZZZ-9999" }, {}),
      ).rejects.toThrow(UnauthorizedException);
      expect(usersService.replaceMfaRecoveryCodeHashes).not.toHaveBeenCalled();
    }, 15000);

    it("disableMfa exige o código TOTP atual e desativa", async () => {
      const secretPlain = mfaService.generateSecret();
      usersService.findById.mockResolvedValue(
        buildUser({
          totpHabilitado: true,
          totpSecretCriptografado: mfaService.encryptSecret(secretPlain),
        }),
      );
      const validCode = authenticator.generate(secretPlain);

      await service.disableMfa(
        { sub: "user-1", tenantId: null, role: Role.ADMIN_ROTTA, vinculoId: "user-1" },
        { code: validCode },
      );

      expect(usersService.disableMfa).toHaveBeenCalledWith("user-1");
    });

    it("disableMfa rejeita código incorreto e não desativa nada", async () => {
      const secretPlain = mfaService.generateSecret();
      usersService.findById.mockResolvedValue(
        buildUser({
          totpHabilitado: true,
          totpSecretCriptografado: mfaService.encryptSecret(secretPlain),
        }),
      );

      await expect(
        service.disableMfa(
          { sub: "user-1", tenantId: null, role: Role.ADMIN_ROTTA, vinculoId: "user-1" },
          { code: "000000" },
        ),
      ).rejects.toThrow(BadRequestException);
      expect(usersService.disableMfa).not.toHaveBeenCalled();
    });

    it("disableMfa rejeita quando o MFA não está ativado", async () => {
      usersService.findById.mockResolvedValue(buildUser({ totpHabilitado: false }));

      await expect(
        service.disableMfa(
          { sub: "user-1", tenantId: null, role: Role.ADMIN_ROTTA, vinculoId: "user-1" },
          { code: "123456" },
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
