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
    schoolId: null,
    company: { id: "company-1", nomeFantasia: "Gama Transportes" } as InviteWithCompany["company"],
    school: null,
    ...overrides,
  };
}

/** Convite de escola — o do Portal da Escola (`Role.ESCOLA`). */
function buildSchoolInvite(overrides: Partial<InviteWithCompany> = {}): InviteWithCompany {
  return buildInvite({
    role: Role.ESCOLA,
    schoolId: "escola-1",
    school: {
      id: "escola-1",
      nomeOficial: "EMEF Jardim das Flores",
      nomeFantasia: null,
    } as InviteWithCompany["school"],
    ...overrides,
  });
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
      vincularAEscola: jest.fn(),
      recordLgpdConsent: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;

    passwordHasher = { hash: jest.fn(), verify: jest.fn() };

    prisma = {
      runInBypassTransaction: jest.fn((fn: (tx: unknown) => unknown) => fn({})),
      withBypass: jest.fn((op: unknown) => op),
      // Vínculo escola↔transportadora — por padrão existe; os testes de
      // recusa sobrescrevem para `null`.
      schoolCompanyLink: { findFirst: jest.fn().mockResolvedValue({ id: "link-1" }) },
      // Escola MUNICIPAL por padrão: o Portal da Escola só existe na
      // rede pública (25/09/2026), e é esse o caso normal do convite.
      school: {
        findFirst: jest.fn().mockResolvedValue({ dependenciaAdministrativa: "MUNICIPAL" }),
      },
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
      expect(preview).toEqual({
        companyName: "Gama Transportes",
        role: Role.MOTORISTA,
        // Só convite de escola traz nome de escola — ver Portal da Escola.
        schoolName: null,
      });
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

  /**
   * Portal da Escola (22/09/2026). Estes testes existem por causa de uma
   * assimetria que é fácil de desfazer sem perceber: o convite de escola
   * é o ÚNICO que não cria `Membership` e o único que escreve
   * `User.escolaId` — e esse campo é tudo o que `SchoolPortalService`
   * usa para decidir quais crianças a conta enxerga, com a RLS
   * desligada.
   */
  describe("convite de Escola", () => {
    it("exige a escola ao emitir um convite de ESCOLA", async () => {
      await expect(
        service.createInvite("company-1", { role: Role.ESCOLA }, "admin-1"),
      ).rejects.toThrow(BadRequestException);
      expect(inviteRepository.create).not.toHaveBeenCalled();
    });

    it("recusa schoolId em convite que não é de escola", async () => {
      // Um `schoolId` sobrando num convite de MOTORISTA seria um campo
      // que ninguém lê hoje e que alguém acabaria lendo amanhã.
      await expect(
        service.createInvite(
          "company-1",
          { role: Role.MOTORISTA, schoolId: "escola-1" },
          "admin-1",
        ),
      ).rejects.toThrow(BadRequestException);
      expect(inviteRepository.create).not.toHaveBeenCalled();
    });

    it("recusa convite de escola da rede PRIVADA — o portal é só da pública", async () => {
      // A segunda porta do Portal da Escola (25/09/2026: "portal da
      // escola quero apenas das públicas"). A primeira é
      // `SchoolPortalService.criarConta`. Bloquear só uma deixaria a
      // regra valendo pela metade — e é sempre a porta esquecida que
      // vira o caminho usado.
      (prisma.school.findFirst as jest.Mock).mockResolvedValue({
        dependenciaAdministrativa: "PRIVADA",
      });

      await expect(
        service.createInvite("company-1", { role: Role.ESCOLA, schoolId: "escola-1" }, "admin-1"),
      ).rejects.toThrow(BadRequestException);
      expect(inviteRepository.create).not.toHaveBeenCalled();
    });

    it("recusa convite para escola que não está vinculada a esta transportadora", async () => {
      // O catálogo de escolas é compartilhado entre todas as empresas —
      // sem esta checagem, qualquer uma emitiria um convite para
      // qualquer escola do país.
      (prisma.schoolCompanyLink.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(
        service.createInvite("company-1", { role: Role.ESCOLA, schoolId: "escola-1" }, "admin-1"),
      ).rejects.toThrow(BadRequestException);
      expect(inviteRepository.create).not.toHaveBeenCalled();
    });

    it("grava o schoolId no convite quando o vínculo existe", async () => {
      inviteRepository.create.mockResolvedValue(
        buildInvite({ role: Role.ESCOLA, schoolId: "escola-1" }),
      );

      await service.createInvite(
        "company-1",
        { role: Role.ESCOLA, schoolId: "escola-1" },
        "admin-1",
      );

      expect(inviteRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ role: Role.ESCOLA, schoolId: "escola-1" }),
      );
    });

    it("o preview mostra o nome da ESCOLA, não só o de quem convidou", async () => {
      inviteRepository.findByCodigo.mockResolvedValue(buildSchoolInvite());

      const preview = await service.previewByCodigo("ABC123");

      expect(preview.schoolName).toBe("EMEF Jardim das Flores");
    });

    it("conta nova nasce com escolaId e SEM vínculo com a transportadora", async () => {
      inviteRepository.findByCodigo.mockResolvedValue(buildSchoolInvite());
      usersService.findByIdentifier.mockResolvedValue(null);
      usersService.createUserWithPassword.mockResolvedValue(buildUser({ escolaId: "escola-1" }));

      await service.redeem(
        {
          codigo: "ABC123",
          nome: "Secretaria da EMEF",
          email: "secretaria@emef.com",
          telefone: "11955557777",
          cpf: "36925814755",
          senha: "SenhaForte123",
          aceiteTermos: true as const,
        },
        {},
      );

      expect(usersService.createUserWithPassword).toHaveBeenCalledWith(
        expect.objectContaining({ escolaId: "escola-1" }),
        expect.anything(),
      );
      // A escola NÃO é funcionária da transportadora: é atendida por
      // várias ao mesmo tempo, e um Membership a prenderia ao tenant de
      // quem convidou.
      expect(usersService.createMembership).not.toHaveBeenCalled();
      expect(authService.issueTokens).toHaveBeenCalledWith(
        expect.objectContaining({ escolaId: "escola-1" }),
        null,
        Role.ESCOLA,
        "user-1",
        {},
      );
    });

    it("conta que já existia é LIGADA à escola dentro da mesma transação", async () => {
      // Caso real: quem é responsável na Rotta e também trabalha na
      // secretaria. Se esta escrita falhasse fora da transação, a conta
      // logaria sem enxergar nada.
      inviteRepository.findByCodigo.mockResolvedValue(buildSchoolInvite());
      usersService.findByIdentifier.mockResolvedValue(buildUser());
      passwordHasher.verify.mockResolvedValue(true);

      await service.redeem(
        {
          codigo: "ABC123",
          nome: "João Motorista",
          email: "joao@motorista.com",
          telefone: "11955556666",
          cpf: "36925814755",
          senha: "SenhaForte123",
          aceiteTermos: true as const,
        },
        {},
      );

      expect(usersService.vincularAEscola).toHaveBeenCalledWith(
        "user-1",
        "escola-1",
        expect.anything(),
      );
      expect(usersService.createMembership).not.toHaveBeenCalled();
    });
  });
});
