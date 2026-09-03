import { BadRequestException, Injectable } from "@nestjs/common";
import { AdminRottaPapel, UserStatus } from "@prisma/client";


import type { CreateAdminAccountDto } from "./dto/create-admin-account.dto";
import type { UpdateAdminAccountDto } from "./dto/update-admin-account.dto";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { User } from "@prisma/client";

import { UsersService } from "@/modules/users/users.service";

export interface AdminAccountSummary {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  papel: AdminRottaPapel;
  status: UserStatus;
  createdAt: Date;
}

function toSummary(user: User): AdminAccountSummary {
  return {
    id: user.id,
    nome: user.nome,
    email: user.email,
    telefone: user.telefone,
    papel: user.adminRottaPapel,
    status: user.status,
    createdAt: user.createdAt,
  };
}

/**
 * "Contas Admin" (pedido do usuário 03/09/2026: "DEPOIS, crie outros
 * acessos para o painel do admin, porém com particularidades") —
 * único jeito de criar/gerenciar uma conta `isAdminRotta: true`, já que
 * não existe (nem deveria existir, Dossiê 8 §2) nenhum cadastro
 * self-service para este papel. Restrito a `AdminRottaPapel.GERAL`
 * (`AdminAccountsController` sem `@AdminAreas` → default GERAL-only do
 * `AdminAreaGuard`).
 */
@Injectable()
export class AdminAccountsService {
  constructor(private readonly usersService: UsersService) {}

  async list(): Promise<AdminAccountSummary[]> {
    const users = await this.usersService.listAdminRottaAccounts();
    return users.map(toSummary);
  }

  async create(dto: CreateAdminAccountDto): Promise<AdminAccountSummary> {
    await this.usersService.assertNoDuplicateIdentity(dto.email, dto.telefone, dto.cpf);

    const user = await this.usersService.createUserWithPassword({
      nome: dto.nome,
      email: dto.email,
      telefone: dto.telefone,
      cpf: dto.cpf,
      senha: dto.senha,
      isAdminRotta: true,
      adminRottaPapel: dto.papel,
    });

    return toSummary(user);
  }

  async update(
    targetId: string,
    dto: UpdateAdminAccountDto,
    actor: AuthenticatedUser,
  ): Promise<AdminAccountSummary> {
    // Nunca a própria conta por aqui — evita autobloqueio (rebaixar/
    // desativar a si mesmo sem ninguém mais pra reverter). Trocar a
    // própria senha/dados continua pelo fluxo normal de perfil.
    if (actor.sub === targetId) {
      throw new BadRequestException(
        "Não é possível alterar a própria conta por aqui — peça a outro Admin Geral.",
      );
    }

    const before = await this.usersService.findById(targetId);
    if (!before || !before.isAdminRotta) {
      throw new BadRequestException("Conta Admin não encontrada.");
    }

    // Nunca deixa a Rotta sem NENHUM acesso Geral ativo — checa ANTES de
    // aplicar uma mudança que tiraria o último (rebaixar de papel OU
    // desativar).
    const wouldLoseGeralAccess =
      before.adminRottaPapel === AdminRottaPapel.GERAL &&
      before.status === UserStatus.ATIVO &&
      ((dto.papel && dto.papel !== AdminRottaPapel.GERAL) || dto.status === UserStatus.INATIVO);

    if (wouldLoseGeralAccess) {
      const todosAdmins = await this.usersService.listAdminRottaAccounts();
      const outrosGeraisAtivos = todosAdmins.filter(
        (admin) =>
          admin.id !== targetId &&
          admin.adminRottaPapel === AdminRottaPapel.GERAL &&
          admin.status === UserStatus.ATIVO,
      );
      if (outrosGeraisAtivos.length === 0) {
        throw new BadRequestException(
          "Esta é a única conta com acesso Geral ativo — crie/ative outra antes de rebaixar ou desativar esta.",
        );
      }
    }

    let updated = before;
    if (dto.papel) {
      updated = await this.usersService.updateAdminRottaPapel(targetId, dto.papel);
    }
    if (dto.status) {
      updated = await this.usersService.updateAdminAccountStatus(targetId, dto.status);
    }

    return toSummary(updated);
  }
}
