import { randomBytes } from "node:crypto";

import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnauthorizedException,
} from "@nestjs/common";
import { Prisma, SchoolAdministrativeDependency } from "@prisma/client";

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
    const schoolId = await this.resolverEscolaDoConvite(companyId, dto);

    for (let attempt = 0; attempt < MAX_CODE_GENERATION_ATTEMPTS; attempt++) {
      try {
        const invite = await this.inviteRepository.create({
          companyId,
          role: dto.role,
          codigo: this.generateCode(),
          criadoPorId,
          expiresAt,
          schoolId,
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
    return {
      companyName: invite.company.nomeFantasia,
      role: invite.role as Role,
      // Quem trabalha na secretaria precisa ver a ESCOLA antes de
      // aceitar: o nome da transportadora não diz nada a ele, e aceitar
      // o convite errado significaria ver as crianças de outra escola.
      schoolName: invite.school ? (invite.school.nomeFantasia ?? invite.school.nomeOficial) : null,
    };
  }

  /**
   * Regra de emissão de convite de escola.
   *
   * Duas checagens, e as duas são de segurança, não de conveniência:
   *
   * 1. Papel e escopo têm de concordar — `ESCOLA` exige `schoolId`, e
   *    qualquer outro papel o proíbe. Um `schoolId` sobrando num
   *    convite de MOTORISTA seria um campo que ninguém lê hoje e que
   *    alguém acabaria lendo amanhã.
   * 2. A escola tem de estar VINCULADA a esta transportadora, e o
   *    vínculo tem de estar vivo (`desvinculadoEm: null`). Sem isso,
   *    qualquer empresa poderia emitir um convite para qualquer escola
   *    do catálogo — que é compartilhado entre todas — e criar uma
   *    conta que enxerga as crianças de uma escola com a qual ela não
   *    tem relação nenhuma.
   */
  private async resolverEscolaDoConvite(
    companyId: string,
    dto: CreateInviteDto,
  ): Promise<string | null> {
    if (dto.role !== Role.ESCOLA) {
      if (dto.schoolId) {
        throw new BadRequestException("schoolId só é aceito em convite de Escola.");
      }
      return null;
    }

    if (!dto.schoolId) {
      throw new BadRequestException("Informe a escola para a qual este convite será emitido.");
    }

    // `withBypass`: `schools` é catálogo compartilhado (sem `companyId`
    // próprio) — o isolamento aqui é o vínculo ativo exigido logo
    // abaixo, não a RLS.
    const vinculo = await this.prisma.withBypass(
      this.prisma.schoolCompanyLink.findFirst({
        where: { companyId, schoolId: dto.schoolId, desvinculadoEm: null },
        select: { id: true },
      }),
    );
    if (!vinculo) {
      throw new BadRequestException(
        "Esta escola não está vinculada à sua transportadora. Vincule-a antes de convidar.",
      );
    }

    // A SEGUNDA PORTA do Portal da Escola (25/09/2026: "portal da
    // escola quero apenas das públicas"). A primeira é
    // `SchoolPortalService.criarConta`, onde o Admin cria a conta do
    // diretor; esta é o convite emitido pela transportadora. Bloquear
    // só uma deixaria a regra valendo pela metade — e é sempre a porta
    // esquecida que vira o caminho usado.
    const escola = await this.prisma.withBypass(
      this.prisma.school.findFirst({
        where: { id: dto.schoolId, deletedAt: null },
        select: { dependenciaAdministrativa: true },
      }),
    );
    if (!escola) {
      throw new BadRequestException("Escola não encontrada.");
    }
    if (!REDES_PUBLICAS_DO_PORTAL.includes(escola.dependenciaAdministrativa)) {
      throw new BadRequestException(
        "O Portal da Escola existe apenas para escolas da rede pública (federal, estadual ou municipal). " +
          "Nas escolas particulares, o acompanhamento é feito pelo app do responsável.",
      );
    }

    return dto.schoolId;
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

      // Convite de escola: a conta nasce ligada à escola já na criação,
      // dentro da mesma transação — nunca "cria e depois liga", que
      // deixaria, se a segunda escrita falhasse, uma conta de escola
      // capaz de logar e incapaz de ver qualquer coisa.
      // `Invite.role` é `String` no schema (nunca virou enum do Prisma),
      // daí o cast — mesma convenção do `invite.role as Role` já usado
      // no retorno logo abaixo.
      const escolaDoConvite = (invite.role as Role) === Role.ESCOLA ? invite.schoolId : null;

      let isNewUser = false;
      const user = existingUser
        ? await this.assertOwnership(existingUser, dto.senha)
        : await (async () => {
            isNewUser = true;
            return this.usersService.createUserWithPassword(
              {
                nome: dto.nome,
                email,
                telefone: telefoneDigits,
                cpf: cpfDigits,
                senha: dto.senha,
                ...(escolaDoConvite ? { escolaId: escolaDoConvite } : {}),
              },
              tx,
            );
          })();

      if (escolaDoConvite) {
        // Conta que JÁ existia (o caso real: quem é responsável na
        // Rotta e também trabalha na secretaria) — aqui o vínculo com
        // a escola é uma segunda escrita, ainda dentro da transação.
        if (!isNewUser) {
          await this.usersService.vincularAEscola(user.id, escolaDoConvite, tx);
        }

        await this.inviteRepository.markUsed(invite.id, user.id, tx);

        // Nenhum `Membership`, de propósito: a escola NÃO é funcionária
        // da transportadora. Ela é atendida por várias ao mesmo tempo,
        // e um `Membership` a prenderia ao tenant de quem convidou —
        // exatamente o contrário do que o Portal da Escola precisa.
        // Sem tenant, o `vinculoId` do token é o próprio usuário, igual
        // ao ramo de login de escola em `AuthService.login`.
        return {
          user: { ...user, escolaId: escolaDoConvite },
          tenantId: null,
          role: Role.ESCOLA,
          membershipId: user.id,
          isNewUser,
        };
      }

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

/**
 * As redes que a secretaria de educação trata como públicas — mesma
 * lista de `school-portal.service.ts` (o Portal da Escola tem duas
 * portas de entrada e as duas checam o mesmo).
 *
 * Filantrópica e comunitária ficam de fora junto com a privada: na
 * prática são a mesma coisa para quem opera o transporte, não é a
 * prefeitura quem manda nelas.
 */
const REDES_PUBLICAS_DO_PORTAL: SchoolAdministrativeDependency[] = [
  SchoolAdministrativeDependency.FEDERAL,
  SchoolAdministrativeDependency.ESTADUAL,
  SchoolAdministrativeDependency.MUNICIPAL,
];
