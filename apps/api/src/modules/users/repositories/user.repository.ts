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
  /** Ver nota em `User.isResponsavel`, `schema.prisma` (módulo Marketplace). */
  isResponsavel?: boolean;
  /** Ver nota em `User.autonomoRole`, `schema.prisma` (Frente N). */
  autonomoRole?: string;
}

/** Campos de estado de autenticação atualizáveis (Dossiê 15, `AUTH-*`) — nunca um passthrough genérico de `Prisma.UserUpdateInput`. */
export interface UpdateUserAuthStateInput {
  passwordHash?: string;
  tentativasLoginFalhas?: number;
  bloqueadoAte?: Date | null;
  consentimentoLgpdAceitoEm?: Date;
  /** MFA/2FA por TOTP (Dossiê 43) — ver nota completa em `schema.prisma`, model `User`. */
  totpSecretCriptografado?: string | null;
  totpHabilitado?: boolean;
  totpHabilitadoEm?: Date | null;
  totpCodigosRecuperacaoHashes?: string[];
  /** Limpo (`null`) assim que o primeiro `Membership` é criado — ver nota em `User.autonomoRole`, `schema.prisma` (Frente N). */
  autonomoRole?: string | null;
}

export interface UserRepository {
  /** `tx` opcional: usado quando a criação precisa ser atômica com outras escritas (ex. Dossiê 16 — Company+User+Membership). */
  create(input: CreateUserInput, tx?: Prisma.TransactionClient): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  findByTelefone(telefone: string): Promise<User | null>;
  findByCpf(cpf: string): Promise<User | null>;
  updateAuthState(id: string, data: UpdateUserAuthStateInput): Promise<User>;
  /** IDs de todo Admin Rotta ativo (`User.isAdminRotta`) — usado pra fan-out cross-tenant (Suporte, Avisos). */
  listAdminRottaIds(): Promise<string[]>;
}
