import { randomBytes } from "node:crypto";

import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma } from "@prisma/client";

import { INVITE_REPOSITORY } from "./auth.constants";
import { AuthService, type AuthRequestMeta } from "./auth.service";

import type { AuthTokensResponseDto } from "./dto/auth-response.dto";
import type { CreateInviteDto } from "./dto/create-invite.dto";
import type { InvitePreviewResponseDto, InviteResponseDto } from "./dto/invite-response.dto";
import type { RedeemInviteDto } from "./dto/redeem-invite.dto";
import type { InviteRepository, InviteWithCompany } from "./repositories/invite.repository";
import type { Invite, User } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";
import { PasswordHasherService } from "@/infra/security/password-hasher.service";
import { UsersService } from "@/modules/users/users.service";
import { Role } from "@/shared/enums";

/** Alfabeto sem 0/O/1/I/L (Dossiê 15, briefing "Convite de Motoristas") — evita ambiguidade ao digitar o código. */
const CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 6;
const INVITE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_CODE_GENERATION_ATTEMPTS = 5;

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

/**
 * Convites de papel (Dossiê 15, briefing "Convite de Motoristas") —
 * nunca cria uma nova `Company`, apenas anexa um `Membership` ao tenant
 * convidante. Emissão de tokens ao resgatar reutiliza `AuthService.issueTokens`
 * (mesmo mecanismo do login, nunca duplicado).
 */
@Injectable()
export class InvitesService {
  constructor(
    @Inject(INVITE_REPOSITORY) private readonly inviteRepository: InviteRepository,
    private readonly usersService: UsersService,
    private readonly passwordHasher: PasswordHasherService,
    private readonly prisma: PrismaService,
    private readonly authService: AuthService,
  ) {}

  async createInvite(
    companyId: string,
    dto: CreateInviteDto,
    criadoPorId: string,
  ): Promise<InviteResponseDto> {
    const expiresAt = new Date(Date.now() + INVITE_TTL_MS);

    for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
      try {
        const invite = await this.inviteRepository.create({
          companyId,
          role: dto.role,
          codigo: this.generateCode(),
          criadoPorId,
          expiresAt,
        });
        return this.toResponse(invite);
      } catch (error) {
        const isUniqueViolation =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (!isUniqueViolation || attempt === MAX_CODE_GENERATION_ATTEMPTS - 1) {
          throw error;
        }
      }
    }

    throw new InternalServerErrorException("Não foi possível gerar um código de convite único.");
  }

  async listActive(companyId: string): Promise<InviteResponseDto[]> {
    const invites = await this.inviteRepository.listActiveByCompany(companyId);
    return invites.map((invite) => this.toResponse(invite));
  }

  async revoke(inviteId: string): Promise<void> {
    await this.inviteRepository.revoke(inviteId);
  }

  /** Tela "Já fui convidado" — antes de pedir os dados do candidato, mostra a que empresa/papel o código pertence. */
  async previewByCodigo(codigo: string): Promise<InvitePreviewResponseDto> {
    const invite = await this.prisma.runInBypassTransaction((tx) =>
      this.inviteRepository.findByCodigo(codigo, tx),
    );
    this.assertInviteValid(invite);
    return { companyName: invite.company.nomeFantasia, role: invite.role as Role };
  }

  /**
   * `AUTH-01-A1`: cria `User` (se novo) + `Membership` no tenant do
   * convite, marca o convite usado, tudo atômico via
   * `runInBypassTransaction` (rota pública, nenhum tenant ainda
   * conhecido — mesmo mecanismo de `AuthService.register`). RN-06: se o
   * e-mail/telefone/CPF já pertence a uma conta existente, a senha
   * precisa corresponder (prova de posse) e só o `Membership` é criado.
   */
  async redeem(dto: RedeemInviteDto, meta: AuthRequestMeta): Promise<AuthTokensResponseDto> {
    const email = dto.email.trim().toLowerCase();
    const telefoneDigits = onlyDigits(dto.telefone);
    const cpfDigits = onlyDigits(dto.cpf);

    const result = await this.prisma.runInBypassTransaction(async (tx) => {
      const invite = await this.inviteRepository.findByCodigo(dto.codigo, tx);
      this.assertInviteValid(invite);

      const existingUser =
        (await this.usersService.findByIdentifier(email)) ??
        (await this.usersService.findByIdentifier(telefoneDigits)) ??
        (await this.usersService.findByIdentifier(cpfDigits));

      let isNewUser = false;
      const user = existingUser
        ? await this.assertOwnership(existingUser, dto.senha)
        : await (async () => {
            isNewUser = true;
            return this.usersService.createUserWithPassword(
              { nome: dto.nome, email, telefone: telefoneDigits, cpf: cpfDigits, senha: dto.senha },
              tx,
            );
          })();

      const membership = await this.usersService.createMembership(
        {
          userId: user.id,
          companyId: invite.companyId,
          role: invite.role,
          convidadoPorId: invite.criadoPorId,
        },
        tx,
      );

      await this.inviteRepository.markUsed(invite.id, user.id, tx);

      return {
        user,
        tenantId: invite.companyId,
        role: invite.role as Role,
        membershipId: membership.id,
        isNewUser,
      };
    });

    if (result.isNewUser) {
      await this.usersService.recordLgpdConsent(result.user.id);
    }

    return this.authService.issueTokens(
      result.user,
      result.tenantId,
      result.role,
      result.membershipId,
      meta,
    );
  }

  private async assertOwnership(user: User, senha: string): Promise<User> {
    const validPassword = await this.passwordHasher.verify(user.passwordHash, senha);
    if (!validPassword) {
      throw new UnauthorizedException(
        "Esta conta já existe. Informe a senha correta para vincular este convite.",
      );
    }
    return user;
  }

  private assertInviteValid(invite: InviteWithCompany | null): asserts invite is InviteWithCompany {
    if (!invite) {
      throw new NotFoundException("Código de convite inválido.");
    }
    if (invite.revogadoEm) {
      throw new BadRequestException("Este convite foi revogado.");
    }
    if (invite.usadoEm) {
      throw new BadRequestException("Este convite já foi utilizado.");
    }
    if (invite.expiresAt.getTime() < Date.now()) {
      throw new BadRequestException("Este convite expirou. Peça um novo convite.");
    }
  }

  private generateCode(): string {
    const bytes = randomBytes(CODE_LENGTH);
    let code = "";
    for (let i = 0; i < CODE_LENGTH; i++) {
      code += CODE_ALPHABET[bytes[i]! % CODE_ALPHABET.length];
    }
    return code;
  }

  private toResponse(invite: Invite): InviteResponseDto {
    return {
      id: invite.id,
      codigo: invite.codigo,
      role: invite.role as Role,
      expiresAt: invite.expiresAt,
      createdAt: invite.createdAt,
      usadoEm: invite.usadoEm,
    };
  }
}
