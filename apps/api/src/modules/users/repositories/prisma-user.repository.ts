import { Injectable } from "@nestjs/common";

import type { CreateUserInput, UserRepository } from "./user.repository";
import type { Prisma, User } from "@prisma/client";

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
}
