import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { CompanyType } from "@prisma/client";
import {
  normalizarDocumento,
  normalizarEmail,
  normalizarTelefone,
  passwordEqualsIdentifier,
} from "@rotta/validators";

import { duracaoDoBloqueioMs } from "./lockout.util";
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
import type {
  AdminRottaPapel,
  ConsentType,
  Membership,
  Prisma,
  SchoolStaffRole,
  User,
  UserStatus,
} from "@prisma/client";

import { PasswordHasherService } from "@/infra/security/password-hasher.service";
import { CURRENT_PRIVACY_VERSION, CURRENT_TERMS_VERSION } from "@/modules/auth/legal-versions";
import { Role } from "@/shared/enums";

/** Versão vigente de cada tipo de consentimento (Dossiê 45 FRENTE 5) — única fonte usada por `recordConsent`/`getPendingConsents`. */
const CURRENT_CONSENT_VERSION: Record<ConsentType, string> = {
  TERMOS_DE_USO: CURRENT_TERMS_VERSION,
  POLITICA_PRIVACIDADE: CURRENT_PRIVACY_VERSION,
};

/** `RN-AUTH-02` (Dossiê 15) — bloqueio temporário após tentativas malsucedidas. */
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
// A duração deixou de ser fixa: `RN-AUTH-02` pede bloqueio progressivo.
// Ver `lockout.util.ts` para a escala e o porquê do teto.

export interface CreateUserWithPasswordInput {
  nome: string;
  email: string;
  telefone: string;
  /** Opcional desde 14/09/2026 — Responsável não informa mais CPF no cadastro (ver `User.cpf`, `schema.prisma`). */
  cpf?: string;
  senha: string;
  avatarUrl?: string;
  /** Ver nota em `User.isResponsavel`, `schema.prisma` (módulo Marketplace). */
  isResponsavel?: boolean;
  /** Ver nota em `User.autonomoRole`, `schema.prisma` (Frente N). */
  autonomoRole?: string;
  /** Ver `AdminAccountsService` — só setado ali, nunca por nenhuma rota de cadastro pública. */
  isAdminRotta?: boolean;
  adminRottaPapel?: AdminRottaPapel;
  /** Portal da Escola — só vem do resgate de um convite `Role.ESCOLA` (ver `InvitesService.redeem`). */
  escolaId?: string;
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
      /*
        `trim().toLowerCase()` pelo mesmo motivo do telefone logo
        abaixo: o e-mail é gravado assim em TODO caminho de cadastro
        (`auth.service`, `companies.service`, `invites.service`,
        `school-portal.service`), e aqui era procurado exatamente como
        a pessoa digitou.

        O teclado de celular capitaliza a primeira letra por padrão,
        então "Ana@email.com" é o que sai de um iPhone sem esforço
        nenhum, e colar o e-mail costuma trazer um espaço junto.
        Resultado: "não foi possível entrar" com a senha certa, numa
        conta que existe. A recuperação de senha já normalizava
        (`AuthService.requestPasswordReset`), então a mesma pessoa
        conseguia pedir a troca de senha e continuava sem conseguir
        entrar, o que tornava o defeito ainda mais difícil de entender.
      */
      return this.userRepository.findByEmail(identifier.trim().toLowerCase());
    }

    /*
      `normalizarTelefone` em vez de só tirar os símbolos: quem copia o
      próprio número do WhatsApp cola "+55 21 99709-9557", e quem
      aprendeu a discar com o prefixo de tronco digita "021...". Os
      dois viravam 13 e 12 dígitos, nenhum tamanho que o login
      procurava, e a pessoa levava "não foi possível entrar" com a
      senha certa. CPF não passa por aqui porque CPF não tem +55 nem
      tronco: 11 dígitos continuam sendo 11 dígitos.
    */
    const digitsOnly = normalizarTelefone(identifier);
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

  /**
   * Lanca `ConflictException` (Dossie 15 `AUTH-01`) se e-mail/telefone/CPF
   * já pertencem a outra conta. `cpf` é opcional desde 14/09/2026 (o
   * cadastro de Responsável não coleta mais CPF) — quando ausente, a
   * checagem de duplicidade por CPF é simplesmente pulada; continua
   * obrigatória pra todo chamador que ainda exige CPF no próprio DTO
   * (Empresa/Autônomo/Admin Rotta).
   */
  async assertNoDuplicateIdentity(email: string, telefone: string, cpf?: string): Promise<void> {
    /*
      Normaliza os TRÊS antes de comparar. Sem isto, "(21) 99709-9557" e
      "21997099557" são duas strings diferentes para o índice único, e
      a mesma pessoa conseguia duas contas — cada uma impossível de
      achar pela outra.

      O telefone já era normalizado aqui; e-mail e CPF não eram, e são
      identificadores de login iguais a ele. "Ana@email.com" e
      "ana@email.com" passavam como pessoas diferentes, e
      "123.456.789-00" e "12345678900" também.
    */
    const [byEmail, byTelefone, byCpf] = await Promise.all([
      this.userRepository.findByEmail(normalizarEmail(email)),
      this.userRepository.findByTelefone(normalizarTelefone(telefone)),
      cpf ? this.userRepository.findByCpf(normalizarDocumento(cpf)) : Promise.resolve(null),
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

    /*
      Normaliza na GRAVAÇÃO, e não só em cada chamador. Os decoradores
      de DTO já normalizam o que entra pela API, mas este método é o
      único portão por onde toda conta da Rotta nasce, e nem todo
      chamador lembrava: a criação de conta de Admin Rotta gravava o
      e-mail exatamente como foi digitado. Uma conta gravada com
      maiúscula é uma conta que o login, que procura em minúscula,
      nunca mais encontra.
    */
    return this.userRepository.create(
      {
        nome: input.nome,
        email: normalizarEmail(input.email),
        telefone: normalizarTelefone(input.telefone),
        cpf: input.cpf ? normalizarDocumento(input.cpf) : input.cpf,
        passwordHash,
        avatarUrl: input.avatarUrl,
        isResponsavel: input.isResponsavel,
        autonomoRole: input.autonomoRole,
        isAdminRotta: input.isAdminRotta,
        adminRottaPapel: input.adminRottaPapel,
        escolaId: input.escolaId,
      },
      tx,
    );
  }

  /**
   * Portal da Escola — liga uma conta existente a uma escola no resgate
   * de um convite `Role.ESCOLA`. Não é "melhor esforço" como
   * `clearAutonomoRole`: sem este campo a conta loga e não enxerga
   * nada, então a falha tem de derrubar o resgate inteiro (por isso é
   * chamado DENTRO da transação de `InvitesService.redeem`).
   */
  vincularAEscola(userId: string, escolaId: string, tx?: Prisma.TransactionClient): Promise<User> {
    return this.userRepository.linkToSchool(userId, escolaId, tx);
  }

  /** Portal da Escola — cargo interno. Ver `SchoolPortalService.criarConta`. */
  definirPapelNaEscola(userId: string, papel: SchoolStaffRole): Promise<User> {
    return this.userRepository.updateSchoolStaffRole(userId, papel);
  }

  /**
   * Grava o CPF de um Responsável que não tinha, para a cobrança poder
   * ser emitida.
   *
   * ## Por que isto existe
   *
   * Desde 14/09/2026 o Responsável não informa CPF no cadastro, por
   * decisão do fundador ("para os responsáveis não pegamos esses dados,
   * apenas o nome e telefone"). Só que o Asaas exige `cpfCnpj` para
   * criar o cliente da cobrança (`CustomerSaveRequestDTO`, conferido em
   * 21/10/2026: `name` e `cpfCnpj` são os dois obrigatórios). Sem o CPF
   * não existe cobrança para essa família, de nenhum jeito.
   *
   * Então o documento é coletado **no momento da cobrança**, por quem já
   * o tem em mãos (a transportadora, do contrato em papel) ou pela
   * própria família, e não de volta no cadastro de todo mundo.
   *
   * ## O que ele recusa
   *
   * CPF que já pertence a OUTRA conta. O campo é `@unique` no banco, e
   * sem esta checagem o erro apareceria como falha de constraint no meio
   * da criação da assinatura — depois de a transportadora já ter
   * apertado o botão.
   *
   * Idempotente: CPF igual ao que já está lá sai sem escrever.
   */
  async registrarCpfDoResponsavel(userId: string, cpf: string): Promise<User> {
    const normalizado = normalizarDocumento(cpf);

    const usuario = await this.userRepository.findById(userId);
    if (!usuario) {
      throw new NotFoundException("Responsável não encontrado.");
    }
    if (usuario.cpf === normalizado) return usuario;

    const deOutro = await this.userRepository.findByCpf(normalizado);
    if (deOutro && deOutro.id !== userId) {
      throw new ConflictException(
        "Este CPF já está em outra conta na Rotta. Confira o número antes de seguir.",
      );
    }

    return this.userRepository.registrarCpf(userId, normalizado);
  }

  /**
   * Ativa/desativa uma conta qualquer. Mesma escrita que
   * `updateAdminAccountStatus` faz para conta Admin — nome próprio
   * porque o Portal da Escola também precisa dela, e "AdminAccount" na
   * chamada faria o leitor achar que está mexendo em outra coisa.
   */
  definirStatusDeConta(userId: string, status: UserStatus): Promise<User> {
    return this.userRepository.updateStatus(userId, status);
  }

  /** Ver `AdminAccountsService` (GERAL-only) — tela "Contas Admin". */
  listAdminRottaAccounts(): Promise<User[]> {
    return this.userRepository.listAdminRottaUsers();
  }

  updateAdminRottaPapel(id: string, papel: AdminRottaPapel): Promise<User> {
    return this.userRepository.updateAdminRottaPapel(id, papel);
  }

  updateAdminAccountStatus(id: string, status: UserStatus): Promise<User> {
    return this.userRepository.updateStatus(id, status);
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

  /** Pra fan-out cross-tenant (Suporte, Avisos) — nunca um `:userId` de parâmetro, sempre resolvido aqui. */
  listAdminRottaUserIds(): Promise<string[]> {
    return this.userRepository.listAdminRottaIds();
  }

  /** Pra fan-out cross-tenant do público `TODOS` de um `Announcement`. */
  listAllActiveUserIds(): Promise<string[]> {
    return this.userRepository.listActiveIds();
  }

  /** Pra fan-out cross-tenant do público `RESPONSAVEIS` de um `Announcement`. */
  listResponsavelUserIds(): Promise<string[]> {
    return this.userRepository.listResponsavelIds();
  }

  /** Pra fan-out cross-tenant dos públicos `EMPRESAS`/`MOTORISTAS_MONITORES` de um `Announcement`. */
  listActiveUserIdsByRoles(roles: Role[]): Promise<string[]> {
    return this.membershipRepository.listActiveUserIdsByRoles(roles);
  }

  /** Vínculos ativos do usuário em QUALQUER tenant (Dossiê 15, `AUTH-02` — seletor de perfil no login). */
  listActiveMembershipsWithCompany(userId: string): Promise<MembershipWithCompany[]> {
    return this.membershipRepository.listActiveByUserWithCompany(userId);
  }

  /**
   * Pedido do usuário: "Quando o motorista é autônomo ou MEI, ele mesmo
   * é o próprio motorista." Achado real: quem cadastra a empresa (mesmo
   * `CompanyType.AUTONOMO`/`MEI`) recebe `Membership.role = EMPRESA`
   * (`CompaniesService.create`), nunca `MOTORISTA` — qualquer checagem
   * de "é o motorista?" baseada só em `role === MOTORISTA` rejeita esse
   * dono, mesmo sendo ele quem de fato dirige. Única fonte desta
   * checagem (antes vivia duplicada, `private`, dentro de
   * `RoutesService` — `TripsService.start`/`substituirMotorista` nunca
   * receberam a mesma correção, causando exatamente o bug relatado:
   * "aparece que não tem motorista credenciado" ao iniciar a viagem,
   * mesmo com a rota corretamente criada com o dono como motorista
   * padrão). Usado por `RoutesService` (validar `motoristaPadraoId`) e
   * `TripsService` (iniciar viagem / substituir motorista).
   */
  async isAutonomoOuMei(userId: string, companyId: string): Promise<boolean> {
    const memberships = await this.listActiveMembershipsWithCompany(userId);
    const membership = memberships.find((m) => m.companyId === companyId);
    return (
      membership?.company.tipo === CompanyType.AUTONOMO ||
      membership?.company.tipo === CompanyType.MEI
    );
  }

  /**
   * Nomes de quem ainda NÃO está com a identidade aprovada, entre os
   * informados. Lista vazia significa que todos estão aprovados.
   *
   * Existe porque, até 16/10/2026, a exigência de identidade aprovada
   * para dirigir vivia **só na interface do aplicativo**
   * (`RootNavigator`), e a API aceitava iniciar viagem sem olhar isso.
   * Bloqueio de tela não é controle: basta a resposta do status não
   * chegar para a tela deixar passar, e ela não chega justamente quando
   * a API está em partida fria, que no plano gratuito do Render leva
   * perto de 90 segundos e acontece todo dia.
   *
   * O campo tem `@default(NAO_INICIADA)` no schema, então nunca é nulo:
   * quem nunca começou a verificação reprova nesta checagem, que é o
   * comportamento que o fundador pediu em 12/09/2026 ("travar quase
   * tudo até a identidade estar de fato aprovada").
   */
  listarNaoAprovadosNaIdentidade(userIds: string[]): Promise<string[]> {
    return this.userRepository.listarNomesComIdentidadeNaoAprovada(userIds);
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
      const bloqueiosConsecutivos = user.bloqueiosConsecutivos + 1;
      await this.userRepository.updateAuthState(user.id, {
        tentativasLoginFalhas: 0,
        bloqueiosConsecutivos,
        bloqueadoAte: new Date(Date.now() + duracaoDoBloqueioMs(bloqueiosConsecutivos)),
      });
      return;
    }
    await this.userRepository.updateAuthState(user.id, { tentativasLoginFalhas: attempts });
  }

  async resetLoginFailures(userId: string): Promise<void> {
    await this.userRepository.updateAuthState(userId, {
      tentativasLoginFalhas: 0,
      // Zera a PROGRESSÃO também: quem entrou de verdade provou ser o
      // dono da conta, e não deve herdar a punição de uma tentativa de
      // invasão que sofreu antes.
      bloqueiosConsecutivos: 0,
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
