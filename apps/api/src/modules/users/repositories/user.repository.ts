import type { Prisma, User } from "@prisma/client";

/**
 * Interface de repositorio (Repository Pattern, Dossie 12 Secao 6.1) —
 * o resto da aplicacao depende apenas deste contrato, nunca do Prisma
 * diretamente (Dependency Inversion, SOLID). `User` e a identidade
 * global do Dossie 8, Secao 2 — sem `tenant_id` proprio.
 */
export interface CreateUserInput {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  passwordHash: string;
  avatarUrl?: string;
}

/** Campos de estado de autenticação atualizáveis (Dossiê 15, `AUTH-*`) — nunca um passthrough genérico de `Prisma.UserUpdateInput`. */
export interface UpdateUserAuthStateInput {
  passwordHash?: string;
  tentativasLoginFalhas?: number;
  bloqueadoAte?: Date | null;
  consentimentoLgpdAceitoEm?: Date;
}

export interface UserRepository {
  /** `tx` opcional: usado quando a criação precisa ser atômica com outras escritas (ex. Dossiê 16 — Company+User+Membership). */
  create(input: CreateUserInput, tx?: Prisma.TransactionClient): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByTelefone(telefone: string): Promise<User | null>;
  findByCpf(cpf: string): Promise<User | null>;
  updateAuthState(id: string, data: UpdateUserAuthStateInput): Promise<User>;
}
