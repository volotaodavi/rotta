import { Injectable } from "@nestjs/common";


import type { CreateUserInput, UpdateUserAuthStateInput, UserRepository } from "./user.repository";
import type { AdminRottaPapel, Prisma, User, UserStatus } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";

/**
 * Implementacao Prisma do `UserRepository`. `users` e tabela global (sem
 * RLS por tenant, Dossie 8 Secao 2) — nenhuma das queries abaixo depende
 * de `app.tenant_id` estar definido.
 */
@Injectable()
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(input: CreateUserInput, tx?: Prisma.TransactionClient): Promise<User> {
    return (tx ?? this.prisma).user.create({ data: input });
  }

  findById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { id } });
  }

  findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findByTelefone(telefone: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { telefone } });
  }

  findByCpf(cpf: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { cpf } });
  }

  updateAuthState(id: string, data: UpdateUserAuthStateInput): Promise<User> {
    return this.prisma.user.update({ where: { id }, data });
  }

  async listAdminRottaIds(): Promise<string[]> {
    const admins = await this.prisma.user.findMany({
      where: { isAdminRotta: true, status: "ATIVO" },
      select: { id: true },
    });
    return admins.map((admin) => admin.id);
  }

  async listActiveIds(): Promise<string[]> {
    const users = await this.prisma.user.findMany({
      where: { status: "ATIVO" },
      select: { id: true },
    });
    return users.map((user) => user.id);
  }

  async listResponsavelIds(): Promise<string[]> {
    const responsaveis = await this.prisma.user.findMany({
      where: { isResponsavel: true, status: "ATIVO" },
      select: { id: true },
    });
    return responsaveis.map((responsavel) => responsavel.id);
  }

  listAdminRottaUsers(): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { isAdminRotta: true },
      orderBy: { nome: "asc" },
    });
  }

  updateAdminRottaPapel(id: string, papel: AdminRottaPapel): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { adminRottaPapel: papel } });
  }

  updateStatus(id: string, status: UserStatus): Promise<User> {
    return this.prisma.user.update({ where: { id }, data: { status } });
  }
}
