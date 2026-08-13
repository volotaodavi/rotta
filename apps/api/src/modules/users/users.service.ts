import { BadRequestException, ConflictException, Inject, Injectable } from "@nestjs/common";
import { passwordEqualsIdentifier } from "@rotta/validators";

import {
  CONSENT_RECORD_REPOSITORY,
  MEMBERSHIP_REPOSITORY,
  USER_REPOSITORY,
} from "./users.constants";

import type { ConsentRecordRepository } from "./repositories/consent-record.repository";
import type {
  CreateMembershipInput,
  MembershipRepository,
  MembershipWithCompany,
} from "./repositories/membership.repository";
import type { UserRepository } from "./repositories/user.repository";
import type { ConsentType, Membership, Prisma, User } from "@prisma/client";

import { PasswordHasherService } from "@/infra/security/password-hasher.service";
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from "@/modules/auth/legal-versions";

/** Versão vigente de cada tipo de consentimento (Dossiê 45 FRENTE 5) — única fonte usada por `recordConsent`/`getPendingConsents`. */
const CURRENT_CONSENT_VERSION: Record<ConsentType, string> = {
  TERMOS_DE_USO: CURRENT_TERMS_VERSION,
  POLITICA_PRIVACIDADE: CURRENT_PRIVACY_VERSION,
};

/** `RN-AUTH-02` (Dossiê 15) — bloqueio temporário após tentativas malsucedidas. */
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;

export interface CreateUserWithPasswordInput {
  nome: string;
  email: string;
  telefone: string;
  cpf: string;
  senha: string;
  avatarUrl?: string;
  /** Ver nota em `User.isResponsavel`, `schema.prisma` (módulo Marketplace). */
  isResponsavel?: boolean;
  /** Ver nota em `User.autonomoRole`, `schema.prisma` (Frente N). */
  autonomoRole?: string;
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
    @Inject(CONSENT_RECORD_REPOSITORY)
    private readonly consentRecordRepository: ConsentRecordRepository,
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
        isResponsavel: input.isResponsavel,
        autonomoRole: input.autonomoRole,
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

  /**
   * Frente N — chamado depois que o primeiro `Membership` de um usuário
   * autônomo (`User.autonomoRole`) é criado: o campo deixa de ser
   * necessário (o login passa a ler o papel do próprio `Membership`).
   * Melhor esforço (mesmo espírito de `recordLgpdConsent`) — nunca deveria
   * derrubar a aprovação do vínculo por si só.
   */
  async clearAutonomoRole(userId: string): Promise<void> {
    await this.userRepository.updateAuthState(userId, { autonomoRole: null }).catch(() => {
      // Best-effort: um `autonomoRole` esquecido no banco não afeta o
      // login (só é lido quando `memberships.length === 0`).
    });
  }

  listMembershipsByCompany(companyId: string): Promise<Membership[]> {
    return this.membershipRepository.listByCompany(companyId);
  }

  findActiveMembership(userId: string, companyId: string): Promise<Membership | null> {
    return this.membershipRepository.findActive(userId, companyId);
  }

  findById(id: string): Promise<User | null> {
    return this.userRepository.findById(id);
  }

  /** Vínculos ativos do usuário em QUALQUER tenant (Dossiê 15, `AUTH-02` — seletor de perfil no login). */
  listActiveMembershipsWithCompany(userId: string): Promise<MembershipWithCompany[]> {
    return this.membershipRepository.listActiveByUserWithCompany(userId);
  }

  isLockedOut(user: User): boolean {
    return Boolean(user.bloqueadoAte && user.bloqueadoAte.getTime() > Date.now());
  }

  /**
   * `RN-AUTH-02`: após `MAX_FAILED_LOGIN_ATTEMPTS` tentativas malsucedidas
   * consecutivas, a conta entra em bloqueio temporário. Simplificação
   * deliberada em relação ao texto literal da regra ("em um intervalo de
   * 15 minutos"): em vez de uma janela deslizante (exigiria guardar o
   * timestamp de cada tentativa), o contador é zerado a cada bloqueio
   * aplicado — proteção equivalente na prática, sem tabela adicional.
   */
  async recordLoginFailure(user: User): Promise<void> {
    const attempts = user.tentativasLoginFalhas + 1;
    if (attempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
      await this.userRepository.updateAuthState(user.id, {
        tentativasLoginFalhas: 0,
        bloqueadoAte: new Date(Date.now() + LOCKOUT_DURATION_MS),
      });
      return;
    }
    await this.userRepository.updateAuthState(user.id, { tentativasLoginFalhas: attempts });
  }

  async resetLoginFailures(userId: string): Promise<void> {
    await this.userRepository.updateAuthState(userId, {
      tentativasLoginFalhas: 0,
      bloqueadoAte: null,
    });
  }

  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    await this.userRepository.updateAuthState(userId, { passwordHash: newPasswordHash });
  }

  /**
   * Melhor esforço: nunca falha o fluxo chamador por si só (mesmo
   * espírito de `AuditLogService.record`). Continua gravando o
   * timestamp único de `consentimentoLgpdAceitoEm` (usado hoje em
   * `dataExport`) E, a partir do Dossiê 45 FRENTE 5, também um
   * `ConsentRecord` versionado para os dois documentos aceitos no
   * cadastro (Termos de Uso + Política de Privacidade) — é o único
   * ponto de aceite hoje (`aceiteTermos` nos DTOs de registro/convite),
   * daí aceitar os dois tipos de uma vez.
   */
  async recordLgpdConsent(userId: string): Promise<void> {
    await this.userRepository.updateAuthState(userId, { consentimentoLgpdAceitoEm: new Date() });
    await this.recordConsent(userId, ["TERMOS_DE_USO", "POLITICA_PRIVACIDADE"]);
  }

  /** Grava um novo aceite (versão vigente de cada `tipo`) — usado no cadastro e no reaceite (`POST /auth/me/consent`) quando a versão de um documento muda. */
  async recordConsent(userId: string, tipos: ConsentType[]): Promise<void> {
    await this.consentRecordRepository.recordAcceptance(
      userId,
      tipos.map((tipo) => ({ tipo, versao: CURRENT_CONSENT_VERSION[tipo] })),
    );
  }

  /**
   * Quais tipos de consentimento o usuário ainda não aceitou na versão
   * vigente — nunca aceitou nenhuma vez, ou aceitou uma versão anterior
   * (Dossiê 45 FRENTE 5: "reprompt quando a versão relevante mudar").
   * `listByUser` já vem ordenado do mais recente para o mais antigo
   * (`PrismaConsentRecordRepository`), então o primeiro registro de cada
   * `tipo` encontrado é sempre o aceite vigente daquele usuário.
   */
  async getPendingConsents(userId: string): Promise<ConsentType[]> {
    const records = await this.consentRecordRepository.listByUser(userId);
    const latestByTipo = new Map<ConsentType, string>();
    for (const record of records) {
      if (!latestByTipo.has(record.tipo)) {
        latestByTipo.set(record.tipo, record.versao);
      }
    }

    return (Object.keys(CURRENT_CONSENT_VERSION) as ConsentType[]).filter(
      (tipo) => latestByTipo.get(tipo) !== CURRENT_CONSENT_VERSION[tipo],
    );
  }

  /**
   * MFA/2FA por TOTP (Dossiê 43). `savePendingMfaSecret` grava o segredo
   * cifrado SEM ativar (`totpHabilitado` continua `false`) — só
   * `confirmMfaEnabled` (chamado depois do primeiro código válido) liga
   * a flag, para nunca travar a conta com um segredo nunca testado
   * contra o app autenticador de verdade.
   */
  async savePendingMfaSecret(userId: string, secretEncrypted: string): Promise<void> {
    await this.userRepository.updateAuthState(userId, { totpSecretCriptografado: secretEncrypted });
  }

  async confirmMfaEnabled(userId: string, recoveryCodeHashes: string[]): Promise<void> {
    await this.userRepository.updateAuthState(userId, {
      totpHabilitado: true,
      totpHabilitadoEm: new Date(),
      totpCodigosRecuperacaoHashes: recoveryCodeHashes,
    });
  }

  async disableMfa(userId: string): Promise<void> {
    await this.userRepository.updateAuthState(userId, {
      totpHabilitado: false,
      totpHabilitadoEm: null,
      totpSecretCriptografado: null,
      totpCodigosRecuperacaoHashes: [],
    });
  }

  /** Consome (remove) um código de recuperação já usado — uso único, RN implícita do Dossiê 43 §21/§30 do briefing. */
  async replaceMfaRecoveryCodeHashes(userId: string, remainingHashes: string[]): Promise<void> {
    await this.userRepository.updateAuthState(userId, {
      totpCodigosRecuperacaoHashes: remainingHashes,
    });
  }
}
