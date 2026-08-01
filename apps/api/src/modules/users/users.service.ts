import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import { passwordEqualsIdentifier } from "@rotta/validators";

import { MEMBERSHIP_REPOSITORY, USER_REPOSITORY } from "./users.constants";

import type {
  CreateMembershipInput,
  MembershipRepository,
} from "./repositories/membership.repository";
import type { UserRepository } from "./repositories/user.repository";
import type { Membership, Prisma, User } from "@prisma/client";

import { PasswordHasherService } from "@/infra/security/password-hasher.service";

export interface CreateUserWithPasswordInput {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  senha: string;
  avatarUrl?: string;
}

/**
 * Fundacao de identidade compartilhada por qualquer modulo que precise
 * criar um `User` ou um `Membership` (hoje: Empresas — Dossie 16; no
 * futuro: Auth, Dossie 15). Nao expoe um `UsersController` publico
 * ainda — o CRUD completo de usuario (perfil, troca de senha, etc.) e
 * escopo do modulo Auth, fora do escopo desta entrega (Dossie 16 trata
 * apenas da criacao do primeiro usuario administrador de uma Empresa).
 */
@Injectable()
export class UsersService {
  constructor(
    @Inject(USER_REPOSITORY) private readonly userRepository: UserRepository,
    @Inject(MEMBERSHIP_REPOSITORY) private readonly membershipRepository: MembershipRepository,
    private readonly passwordHasher: PasswordHasherService,
  ) {}

  findByIdentifier(identifier: string): Promise<User | null> {
    if (identifier.includes("@")) {
      return this.userRepository.findByEmail(identifier);
    }

    const digitsOnly = identifier.replace(/\D/g, "");
    if (digitsOnly.length === 11) {
      // CPF e celular brasileiro tem o mesmo tamanho (11 digitos) —
      // tenta CPF primeiro (Dossie 15 `AUTH-02`: "login por CPF resolve
      // o Usuario da mesma forma que telefone/e-mail"), depois telefone.
      return this.userRepository
        .findByCpf(digitsOnly)
        .then((user) => user ?? this.userRepository.findByTelefone(digitsOnly));
    }

    return this.userRepository.findByTelefone(digitsOnly);
  }

  /** Lanca `ConflictException` (Dossie 15 `AUTH-01`) se e-mail/telefone/CPF já pertencem a outra conta. */
  async assertNoDuplicateIdentity(email: string, telefone: string, cpf: string): Promise<void> {
    const [byEmail, byTelefone, byCpf] = await Promise.all([
      this.userRepository.findByEmail(email),
      this.userRepository.findByTelefone(telefone),
      this.userRepository.findByCpf(cpf),
    ]);

    if (byEmail) {
      throw new ConflictException("Este e-mail já possui uma conta. Fazer login?");
    }
    if (byTelefone) {
      throw new ConflictException("Este telefone já possui uma conta. Fazer login?");
    }
    if (byCpf) {
      throw new ConflictException("Este CPF já possui uma conta. Fazer login?");
    }
  }

  /**
   * Cria a identidade global (`User`). O formato da senha (mínimo 8
   * caracteres, 1 letra, 1 número) já foi validado no DTO
   * (`class-validator` + `@rotta/validators`); aqui verificamos a regra
   * que só pode ser checada com os outros campos em mãos ("nunca igual
   * ao identificador de login", Dossiê 15 `AUTH-01`) e persistimos o
   * hash — nunca a senha em texto puro, nem em log, nem em memória além
   * do necessário.
   */
  async createUserWithPassword(
    input: CreateUserWithPasswordInput,
    tx?: Prisma.TransactionClient,
  ): Promise<User> {
    if (passwordEqualsIdentifier(input.senha, [input.email, input.telefone, input.cpf])) {
      throw new BadRequestException("A senha não pode ser igual ao seu e-mail, telefone ou CPF.");
    }

    const passwordHash = await this.passwordHasher.hash(input.senha);

    return this.userRepository.create(
      {
        nome: input.nome,
        email: input.email,
        telefone: input.telefone,
        cpf: input.cpf,
        passwordHash,
        avatarUrl: input.avatarUrl,
      },
      tx,
    );
  }

  createMembership(
    input: CreateMembershipInput,
    tx?: Prisma.TransactionClient,
  ): Promise<Membership> {
    return this.membershipRepository.create(input, tx);
  }

  listMembershipsByCompany(companyId: string): Promise<Membership[]> {
    return this.membershipRepository.listByCompany(companyId);
  }
}
