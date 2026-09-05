import { BadRequestException, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { Prisma, UserStatus } from "@prisma/client";

import { InvitesService } from "../invites.service";

import type { AuthService } from "../auth.service";
import type { InviteRepository, InviteWithCompany } from "../repositories/invite.repository";
import type { PrismaService } from "@/infra/database/prisma.service";
import type { PasswordHasherService } from "@/infra/security/password-hasher.service";
import type { UsersService } from "@/modules/users/users.service";
import type { User } from "@prisma/client";

import { Role } from "@/shared/enums";

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: "user-1",
    nome: "João Motorista",
    email: "joao@motorista.com",
    telefone: "11955556666",
    cpf: "36925814755",
    passwordHash: "hashed",
    status: UserStatus.ATIVO,
    avatarUrl: null,
    tentativasLoginFalhas: 0,
    bloqueadoAte: null,
    consentimentoLgpdAceitoEm: null,
    isAdminRotta: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function buildInvite(overrides: Partial<InviteWithCompany> = {}): InviteWithCompany {
  return {
    id: "invite-1",
    companyId: "company-1",
    role: Role.MOTORISTA,
    codigo: "ABC123",
    criadoPorId: "admin-1",
    usadoPorId: null,
    expiresAt: new Date(Date.now() + 60_000),
    usadoEm: null,
    revogadoEm: null,
    createdAt: new Date(),
    company: { id: "company-1", nomeFantasia: "Gama Transportes" } as InviteWithCompany["company"],
    ...overrides,
  };
}

describe("InvitesService", () => {
  let service: InvitesService;
  let inviteRepository: jest.Mocked<InviteRepository>;
  let usersService: jest.Mocked<UsersService>;
  let passwordHasher: jest.Mocked<PasswordHasherService>;
  let prisma: jest.Mocked<PrismaService>;
  let authService: jest.Mocked<AuthService>;

  beforeEach(() => {
    inviteRepository = {
      create: jest.fn(),
      findByCodigo: jest.fn(),
      listActiveByCompany: jest.fn(),
      markUsed: jest.fn(),
      revoke: jest.fn(),
    };

    usersService = {
      findByIdentifier: jest.fn(),
      createUserWithPassword: jest.fn(),
      createMembership: jest.fn(),
      recordLgpdConsent: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    passwordHasher = { hash: jest.fn(), verify: jest.fn() };

    prisma = {
      runInBypassTransaction: jest.fn((fn: (tx: unknown) => unknown) => fn({})),
    } as unknown as jest.Mocked<PrismaService>;

    authService = {
      issueTokens: jest.fn().mockResolvedValue({ accessToken: "a", refreshToken: "b", user: {} }),
    } as unknown as jest.Mocked<AuthService>;

    service = new InvitesService(
      inviteRepository,
      usersService,
      passwordHasher,
      prisma,
      authService,
    );
  });

  describe("createInvite", () => {
    it("cria um convite com código gerado e expiração futura", async () => {
      inviteRepository.create.mockResolvedValue({
        id: "invite-1",
        companyId: "company-1",
        role: Role.MOTORISTA,
        codigo: "AB12CD",
        criadoPorId: "admin-1",
        usadoPorId: null,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        usadoEm: null,
        revogadoEm: null,
        createdAt: new Date(),
      });

      const result = await service.createInvite("company-1", { role: Role.MOTORISTA }, "admin-1");

      expect(result.codigo).toBe("AB12CD");
      expect(inviteRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: "company-1",
          role: Role.MOTORISTA,
          criadoPorId: "admin-1",
        }),
      );
    });

    it("tenta novamente ao colidir um código já existente (P2002)", async () => {
      const uniqueViolation = new Prisma.PrismaClientKnownRequestError("duplicado", {
        code: "P2002",
        clientVersion: "6.19.3",
      });
      inviteRepository.create.mockRejectedValueOnce(uniqueViolation).mockResolvedValueOnce({
        id: "invite-1",
        companyId: "company-1",
        role: Role.MOTORISTA,
        codigo: "XY99ZZ",
        criadoPorId: "admin-1",
        usadoPorId: null,
        expiresAt: new Date(Date.now() + 1000),
        usadoEm: null,
        revogadoEm: null,
        createdAt: new Date(),
      });

      const result = await service.createInvite("company-1", { role: Role.MOTORISTA }, "admin-1");

      expect(result.codigo).toBe("XY99ZZ");
      expect(inviteRepository.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("previewByCodigo", () => {
    it("rejeita código inexistente", async () => {
      inviteRepository.findByCodigo.mockResolvedValue(null);
      await expect(service.previewByCodigo("XXXXXX")).rejects.toThrow(NotFoundException);
    });

    it("rejeita convite expirado", async () => {
      inviteRepository.findByCodigo.mockResolvedValue(
        buildInvite({ expiresAt: new Date(Date.now() - 1000) }),
      );
      await expect(service.previewByCodigo("ABC123")).rejects.toThrow(BadRequestException);
    });

    it("rejeita convite já utilizado", async () => {
      inviteRepository.findByCodigo.mockResolvedValue(buildInvite({ usadoEm: new Date() }));
      await expect(service.previewByCodigo("ABC123")).rejects.toThrow(BadRequestException);
    });

    it("rejeita convite revogado", async () => {
      inviteRepository.findByCodigo.mockResolvedValue(buildInvite({ revogadoEm: new Date() }));
      await expect(service.previewByCodigo("ABC123")).rejects.toThrow(BadRequestException);
    });

    it("retorna nome da empresa e papel para convite válido", async () => {
      inviteRepository.findByCodigo.mockResolvedValue(buildInvite());
      const preview = await service.previewByCodigo("ABC123");
      expect(preview).toEqual({ companyName: "Gama Transportes", role: Role.MOTORISTA });
    });
  });

  describe("redeem", () => {
    const redeemDto = {
      codigo: "ABC123",
      nome: "João Motorista",
      email: "joao@motorista.com",
      telefone: "11955556666",
      cpf: "36925814755",
      senha: "SenhaForte123",
      aceiteTermos: true as const,
    };

    it("rejeita convite inválido antes de tocar em qualquer usuário", async () => {
      inviteRepository.findByCodigo.mockResolvedValue(null);
      await expect(service.redeem(redeemDto, {})).rejects.toThrow(NotFoundException);
      expect(usersService.createUserWithPassword).not.toHaveBeenCalled();
      expect(usersService.createMembership).not.toHaveBeenCalled();
    });

    it("cria um novo usuário + vínculo quando ninguém possui os identificadores ainda", async () => {
      inviteRepository.findByCodigo.mockResolvedValue(buildInvite());
      usersService.findByIdentifier.mockResolvedValue(null);
      usersService.createUserWithPassword.mockResolvedValue(buildUser());
      usersService.createMembership.mockResolvedValue({
        id: "membership-1",
        userId: "user-1",
        companyId: "company-1",
        role: Role.MOTORISTA,
        status: "ATIVO",
        convidadoPorId: "admin-1",
        iniciadoEm: new Date(),
        encerradoEm: null,
      });

      await service.redeem(redeemDto, {});

      expect(usersService.createUserWithPassword).toHaveBeenCalledTimes(1);
      expect(usersService.createMembership).toHaveBeenCalledWith(
        expect.objectContaining({ userId: "user-1", companyId: "company-1", role: Role.MOTORISTA }),
        expect.anything(),
      );
      expect(inviteRepository.markUsed).toHaveBeenCalledWith(
        "invite-1",
        "user-1",
        expect.anything(),
      );
      expect(usersService.recordLgpdConsent).toHaveBeenCalledWith("user-1");
      expect(authService.issueTokens).toHaveBeenCalledWith(
        expect.objectContaining({ id: "user-1" }),
        "company-1",
        Role.MOTORISTA,
        "membership-1",
        {},
      );
    });

    it("RN-06: anexa um novo vínculo a uma conta já existente quando a senha corresponde (prova de posse)", async () => {
      inviteRepository.findByCodigo.mockResolvedValue(buildInvite());
      usersService.findByIdentifier.mockResolvedValue(buildUser());
      passwordHasher.verify.mockResolvedValue(true);
      usersService.createMembership.mockResolvedValue({
        id: "membership-2",
        userId: "user-1",
        companyId: "company-1",
        role: Role.MOTORISTA,
        status: "ATIVO",
        convidadoPorId: "admin-1",
        iniciadoEm: new Date(),
        encerradoEm: null,
      });

      await service.redeem(redeemDto, {});

      expect(usersService.createUserWithPassword).not.toHaveBeenCalled();
      expect(usersService.createMembership).toHaveBeenCalled();
      expect(usersService.recordLgpdConsent).not.toHaveBeenCalled();
    });

    it("rejeita quando a conta já existe mas a senha não corresponde", async () => {
      inviteRepository.findByCodigo.mockResolvedValue(buildInvite());
      usersService.findByIdentifier.mockResolvedValue(buildUser());
      passwordHasher.verify.mockResolvedValue(false);

      await expect(service.redeem(redeemDto, {})).rejects.toThrow(UnauthorizedException);
      expect(usersService.createMembership).not.toHaveBeenCalled();
      expect(inviteRepository.markUsed).not.toHaveBeenCalled();
    });
  });
});
