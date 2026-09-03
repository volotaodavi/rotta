import { BadRequestException } from "@nestjs/common";
import { AdminRottaPapel, UserStatus } from "@prisma/client";


import { AdminAccountsService } from "../admin-accounts.service";

import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { UsersService } from "@/modules/users/users.service";
import type { User } from "@prisma/client";

import { Role } from "@/shared/enums";

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: "admin-2",
    nome: "Alguém",
    email: "alguem@rottabr.com.br",
    telefone: "11999990000",
    cpf: "11111111111",
    passwordHash: "hash",
    avatarUrl: null,
    isAdminRotta: true,
    adminRottaPapel: AdminRottaPapel.SUPORTE,
    isResponsavel: false,
    autonomoRole: null,
    status: UserStatus.ATIVO,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
    ...overrides,
  } as unknown as User;
}

const actorGeral: AuthenticatedUser = {
  sub: "admin-1",
  tenantId: null,
  role: Role.ADMIN_ROTTA,
  vinculoId: "v-1",
  adminPapel: AdminRottaPapel.GERAL,
};

describe("AdminAccountsService", () => {
  let usersService: jest.Mocked<
    Pick<
      UsersService,
      | "assertNoDuplicateIdentity"
      | "createUserWithPassword"
      | "listAdminRottaAccounts"
      | "updateAdminRottaPapel"
      | "updateAdminAccountStatus"
      | "findById"
    >
  >;
  let service: AdminAccountsService;

  beforeEach(() => {
    usersService = {
      assertNoDuplicateIdentity: jest.fn().mockResolvedValue(undefined),
      createUserWithPassword: jest.fn(),
      listAdminRottaAccounts: jest.fn(),
      updateAdminRottaPapel: jest.fn(),
      updateAdminAccountStatus: jest.fn(),
      findById: jest.fn(),
    };
    service = new AdminAccountsService(usersService as unknown as UsersService);
  });

  describe("create", () => {
    it("cria a conta com isAdminRotta/adminRottaPapel e nunca vaza passwordHash na resposta", async () => {
      usersService.createUserWithPassword.mockResolvedValue(buildUser());

      const result = await service.create({
        nome: "Maria Suporte",
        email: "suporte@rottabr.com.br",
        telefone: "11987654321",
        cpf: "52998224725",
        senha: "SenhaForte123",
        papel: AdminRottaPapel.SUPORTE,
      });

      expect(usersService.assertNoDuplicateIdentity).toHaveBeenCalledWith(
        "suporte@rottabr.com.br",
        "11987654321",
        "52998224725",
      );
      expect(usersService.createUserWithPassword).toHaveBeenCalledWith(
        expect.objectContaining({ isAdminRotta: true, adminRottaPapel: AdminRottaPapel.SUPORTE }),
      );
      expect(result).not.toHaveProperty("passwordHash");
      expect(result.papel).toBe(AdminRottaPapel.SUPORTE);
    });
  });

  describe("update", () => {
    it("nunca permite o ator alterar a própria conta", async () => {
      await expect(
        service.update(actorGeral.sub, { papel: AdminRottaPapel.SUPORTE }, actorGeral),
      ).rejects.toThrow(BadRequestException);
      expect(usersService.findById).not.toHaveBeenCalled();
    });

    it("lança erro se a conta alvo não existe ou não é Admin Rotta", async () => {
      usersService.findById.mockResolvedValue(null);
      await expect(
        service.update("outro-id", { papel: AdminRottaPapel.SUPORTE }, actorGeral),
      ).rejects.toThrow(BadRequestException);
    });

    it("rebaixa SUPORTE/FINANCEIRO livremente quando existe outro GERAL ativo", async () => {
      const alvo = buildUser({ id: "admin-2", adminRottaPapel: AdminRottaPapel.GERAL });
      usersService.findById.mockResolvedValue(alvo);
      usersService.listAdminRottaAccounts.mockResolvedValue([actorGeralUser(), alvo]);
      usersService.updateAdminRottaPapel.mockResolvedValue(
        buildUser({ id: "admin-2", adminRottaPapel: AdminRottaPapel.SUPORTE }),
      );

      const result = await service.update(
        "admin-2",
        { papel: AdminRottaPapel.SUPORTE },
        actorGeral,
      );

      expect(usersService.updateAdminRottaPapel).toHaveBeenCalledWith(
        "admin-2",
        AdminRottaPapel.SUPORTE,
      );
      expect(result.papel).toBe(AdminRottaPapel.SUPORTE);
    });

    it("recusa rebaixar o ÚLTIMO Admin Geral ativo", async () => {
      const unicoGeral = buildUser({ id: "admin-2", adminRottaPapel: AdminRottaPapel.GERAL });
      usersService.findById.mockResolvedValue(unicoGeral);
      // Só ele mesmo na lista de admins — nenhum outro GERAL ativo.
      usersService.listAdminRottaAccounts.mockResolvedValue([unicoGeral]);

      await expect(
        service.update("admin-2", { papel: AdminRottaPapel.SUPORTE }, actorGeral),
      ).rejects.toThrow(BadRequestException);
      expect(usersService.updateAdminRottaPapel).not.toHaveBeenCalled();
    });

    it("recusa desativar o ÚLTIMO Admin Geral ativo", async () => {
      const unicoGeral = buildUser({ id: "admin-2", adminRottaPapel: AdminRottaPapel.GERAL });
      usersService.findById.mockResolvedValue(unicoGeral);
      usersService.listAdminRottaAccounts.mockResolvedValue([unicoGeral]);

      await expect(
        service.update("admin-2", { status: UserStatus.INATIVO }, actorGeral),
      ).rejects.toThrow(BadRequestException);
      expect(usersService.updateAdminAccountStatus).not.toHaveBeenCalled();
    });

    it("permite desativar um GERAL quando existe outro GERAL ativo", async () => {
      const alvo = buildUser({ id: "admin-2", adminRottaPapel: AdminRottaPapel.GERAL });
      usersService.findById.mockResolvedValue(alvo);
      usersService.listAdminRottaAccounts.mockResolvedValue([actorGeralUser(), alvo]);
      usersService.updateAdminAccountStatus.mockResolvedValue(
        buildUser({ id: "admin-2", status: UserStatus.INATIVO }),
      );

      const result = await service.update("admin-2", { status: UserStatus.INATIVO }, actorGeral);

      expect(usersService.updateAdminAccountStatus).toHaveBeenCalledWith(
        "admin-2",
        UserStatus.INATIVO,
      );
      expect(result.status).toBe(UserStatus.INATIVO);
    });

    it("nunca precisa checar o último GERAL pra mudar um SUPORTE/FINANCEIRO", async () => {
      const alvo = buildUser({ id: "admin-2", adminRottaPapel: AdminRottaPapel.SUPORTE });
      usersService.findById.mockResolvedValue(alvo);
      usersService.updateAdminAccountStatus.mockResolvedValue(
        buildUser({
          id: "admin-2",
          adminRottaPapel: AdminRottaPapel.SUPORTE,
          status: UserStatus.INATIVO,
        }),
      );

      await service.update("admin-2", { status: UserStatus.INATIVO }, actorGeral);

      expect(usersService.listAdminRottaAccounts).not.toHaveBeenCalled();
    });
  });
});

function actorGeralUser(): User {
  return {
    id: "admin-1",
    nome: "Admin Geral",
    email: "rottadobrasil+admin@gmail.com",
    telefone: "11900000000",
    cpf: "22222222222",
    passwordHash: "hash",
    avatarUrl: null,
    isAdminRotta: true,
    adminRottaPapel: AdminRottaPapel.GERAL,
    isResponsavel: false,
    autonomoRole: null,
    status: UserStatus.ATIVO,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    deletedAt: null,
  } as unknown as User;
}
