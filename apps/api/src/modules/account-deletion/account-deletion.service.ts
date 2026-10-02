import { BadRequestException, ConflictException, Injectable, Logger } from "@nestjs/common";

import type { Prisma, UserStatus } from "@prisma/client";

import { PrismaService } from "@/infra/database/prisma.service";
import { AuditLogService } from "@/modules/audit/audit-log.service";

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

/** Um vínculo que impede a exclusão, já em linguagem de tela. */
export interface ImpedimentoDeExclusao {
  /** Ex.: "viagens dirigidas". */
  o_que: string;
  quantos: number;
}

/** Uma conta como a tela de exclusão a lista. */
export interface ContaDaBusca {
  userId: string;
  nome: string;
  email: string;
  telefone: string;
  cpf: string | null;
  status: UserStatus;
  criadaEm: string;
  verificacaoIdentidade: string;
  vinculos: Array<{ role: string; companyId: string; nomeFantasia: string }>;
  /** O que esta conta é na plataforma, para a tela não chutar pelo vínculo. */
  tipo: "transportadora" | "transportador" | "responsavel" | "escola" | "indefinido";
  /**
   * O que falta nesta conta, em linguagem de tela. Vazio = nada falta.
   * Pedido do usuário 02/10/2026: "mostre os cadastros não contemplados
   * também, pq aí vou saber quais são as questões faltantes".
   */
  pendencias: string[];
}

/**
 * Um pré-cadastro que nunca virou conta: alguém começou (e às vezes
 * pagou) e paramos de ver a pessoa. É o "cadastro não contemplado" que
 * nenhuma tela do painel mostrava, porque não existe `User` nenhum
 * para listar.
 */
export interface PreCadastroDaBusca {
  id: string;
  nome: string;
  email: string | null;
  telefone: string | null;
  cpfCnpj: string | null;
  status: string;
  planCode: string;
  valorCentavos: number;
  provider: string;
  pagoEm: string | null;
  expiraEm: string;
  reembolsadoEm: string | null;
  criadoEm: string;
  /** O que falta para este pré-cadastro virar uma conta de verdade. */
  pendencias: string[];
  /** `false` quando há dinheiro no registro: aí ele é fiscal, não se apaga. */
  podeExcluir: boolean;
}

export interface PreviewDeExclusaoDeConta {
  userId: string;
  nome: string;
  email: string;
  /** `true` quando nada impede: a exclusão pode ser executada. */
  podeExcluir: boolean;
  impedimentos: ImpedimentoDeExclusao[];
  /** O que será apagado junto, para o admin ver antes de confirmar. */
  seraApagado: ImpedimentoDeExclusao[];
}

export interface PreviewDeExclusaoDeEmpresa {
  companyId: string;
  nomeFantasia: string;
  cpfCnpj: string;
  seraApagado: ImpedimentoDeExclusao[];
  /** Contas que só existem nesta empresa e serão apagadas junto. */
  contasQueSeraoApagadas: Array<{ userId: string; nome: string; email: string }>;
  /** Contas com vínculo em outra empresa: ficam, só perdem este vínculo. */
  contasQueSobrevivem: Array<{ userId: string; nome: string; email: string }>;
}

export interface ResultadoDaExclusaoDeEmpresa {
  companyId: string;
  nomeFantasia: string;
  contasApagadas: string[];
  /** Contas que o admin pediu para apagar mas que ainda têm histórico em outro lugar. */
  contasMantidas: Array<{ userId: string; email: string; motivo: string }>;
  pagamentosAnonimizados: number;
}

/** Recortes da lista de contas, cada um um "o que falta" diferente. */
export type RecorteDeContas =
  | "com-pendencia"
  | "sem-transportadora"
  | "responsavel-sem-aluno"
  | "identidade-pendente"
  | "desativadas";

/**
 * Quem NÃO precisa de verificação de identidade: Responsável e conta de
 * Escola. Não é escolha desta tela, é a regra que o painel já aplica
 * para bloquear o acesso (`apps/web/src/app/(dashboard)/layout.tsx`:
 * `shouldCheckIdentity = !isResponsavel && !isEscola`). Listar "identidade
 * não iniciada" para uma família seria apontar uma pendência que
 * ninguém nunca vai resolver, porque não existe.
 */
const SEM_EXIGENCIA_DE_IDENTIDADE: Prisma.UserWhereInput = {
  isResponsavel: false,
  escolaId: null,
};

const RECORTES_DE_CONTAS: Record<RecorteDeContas, Prisma.UserWhereInput> = {
  "com-pendencia": {
    OR: [
      { status: { not: "ATIVO" } },
      { ...SEM_EXIGENCIA_DE_IDENTIDADE, identityVerificationStatus: { not: "APROVADA" } },
      { ...SEM_EXIGENCIA_DE_IDENTIDADE, memberships: { none: {} } },
      { isResponsavel: true, alunos: { none: {} } },
    ],
  },
  "sem-transportadora": { ...SEM_EXIGENCIA_DE_IDENTIDADE, memberships: { none: {} } },
  "responsavel-sem-aluno": { isResponsavel: true, alunos: { none: {} } },
  "identidade-pendente": {
    ...SEM_EXIGENCIA_DE_IDENTIDADE,
    identityVerificationStatus: { not: "APROVADA" },
  },
  /*
    `UserStatus` só tem ATIVO e INATIVO — não existe SUSPENSO para
    conta de usuário, e a primeira versão desta tela oferecia um filtro
    "Contas suspensas" (`status: "SUSPENSO"`) que o banco nunca ia
    casar: o recorte vinha sempre vazio, para qualquer base. Quem tem
    SUSPENSO é `Company`, e é lá que a suspensão de verdade acontece
    (uma transportadora suspensa trava todas as contas dela).
    Individualmente, o que existe é desativar (`INATIVO`), hoje usado
    por conta Admin e por conta de Escola.
  */
  desativadas: { status: "INATIVO" },
};

/** Papéis de `Membership` que são a transportadora, não um empregado dela. */
const PAPEIS_DA_TRANSPORTADORA = new Set(["empresa", "gestor", "admin"]);

/**
 * O que a conta é na plataforma. Olha o que o login olha, na mesma
 * ordem: `Membership` primeiro (é a verdade quando existe), e os
 * campos avulsos (`isResponsavel`/`autonomoRole`/`escolaId`) depois,
 * que é como uma conta sem `Membership` nenhum ainda consegue entrar
 * (ver as notas em `model User`).
 */
function classificarConta(conta: {
  isResponsavel: boolean;
  autonomoRole: string | null;
  escolaId: string | null;
  papeis: string[];
}): ContaDaBusca["tipo"] {
  if (conta.papeis.some((papel) => PAPEIS_DA_TRANSPORTADORA.has(papel))) return "transportadora";
  if (conta.papeis.length > 0 || conta.autonomoRole) return "transportador";
  if (conta.escolaId) return "escola";
  if (conta.isResponsavel) return "responsavel";
  return "indefinido";
}

const PENDENCIA_POR_IDENTIDADE: Record<string, string> = {
  NAO_INICIADA: "nunca começou a verificação de identidade",
  EM_ANDAMENTO: "parou no meio da verificação de identidade",
  EM_ANALISE: "verificação de identidade em análise",
  REPROVADA: "verificação de identidade reprovada",
  EXPIRADA: "verificação de identidade expirada",
};

/**
 * O que falta nesta conta, em linguagem de tela. Função pura de
 * propósito: é a regra que o admin lê na lista, então tem que ser
 * testável sem banco.
 */
export function levantarPendenciasDaConta(conta: {
  tipo: ContaDaBusca["tipo"];
  status: UserStatus;
  verificacaoIdentidade: string;
  temEmpresa: boolean;
  quantosAlunos: number;
  ultimoPedidoDeVinculo: { status: string; nomeFantasia: string } | null;
}): string[] {
  const pendencias: string[] = [];

  if (conta.status === "INATIVO") pendencias.push("conta desativada");

  const precisaDeIdentidade = conta.tipo !== "responsavel" && conta.tipo !== "escola";
  if (precisaDeIdentidade && conta.verificacaoIdentidade !== "APROVADA") {
    pendencias.push(
      PENDENCIA_POR_IDENTIDADE[conta.verificacaoIdentidade] ??
        `verificação de identidade em ${conta.verificacaoIdentidade}`,
    );
  }

  if (conta.tipo === "transportador" && !conta.temEmpresa) {
    const pedido = conta.ultimoPedidoDeVinculo;
    if (pedido?.status === "PENDENTE") {
      pendencias.push(`esperando ${pedido.nomeFantasia} aprovar o vínculo`);
    } else if (pedido?.status === "RECUSADO") {
      pendencias.push(`${pedido.nomeFantasia} recusou o vínculo`);
    } else {
      // O caso do relato de 01/10/2026: autônomo/MEI que ficou preso
      // numa tela pedindo código de transportadora.
      pendencias.push("sem transportadora: não informou código nem criou a própria");
    }
  }

  if (conta.tipo === "responsavel" && conta.quantosAlunos === 0) {
    pendencias.push("nenhum aluno cadastrado");
  }

  if (conta.tipo === "indefinido") {
    pendencias.push("cadastro não finalizado: a conta não virou nada na plataforma");
  }

  return pendencias;
}

/** O que falta para um pré-cadastro virar conta. Pura, mesma razão da de cima. */
export function levantarPendenciasDoPreCadastro(registro: {
  status: string;
  paidAt: Date | null;
  expiresAt: Date;
  refundedAt: Date | null;
  email: string | null;
  cpfCnpj: string | null;
  telefone: string | null;
}): string[] {
  const pendencias: string[] = [];
  const expirado = registro.expiresAt.getTime() < Date.now();

  if (registro.refundedAt) {
    pendencias.push("reembolsado: não vira conta, pode ser apagado");
  } else if (registro.paidAt || registro.status === "PAGO") {
    pendencias.push("pagou e nunca completou o cadastro");
  } else if (expirado) {
    pendencias.push("checkout abandonado e expirado: nunca foi pago");
  } else {
    pendencias.push("checkout criado, aguardando o pagamento");
  }

  // Sem nenhum destes três, nem o próprio dono consegue reivindicar o
  // pré-cadastro: `AuthService.register` casa o pagamento com o
  // cadastro novo justamente por e-mail, CPF/CNPJ ou telefone.
  if (!registro.email && !registro.cpfCnpj && !registro.telefone) {
    pendencias.push("sem e-mail, CPF/CNPJ ou telefone: não há como ligar a uma conta");
  }

  return pendencias;
}

/** Quem não pode ser apagado por este caminho, nunca. */
const MOTIVO_ADMIN_ROTTA =
  "Contas de Admin Rotta não são excluídas por aqui: use a tela Contas de Admin, " +
  "que preserva a cadeia de auditoria dos documentos legais.";

/**
 * Exclusão DEFINITIVA de contas e transportadoras (pedido do usuário,
 * 02/10/2026: "um botão para poder fazer definitivamente a exclusão",
 * para cadastros ativos, não finalizados e suspensos).
 *
 * ## Por que apagar de verdade, e não marcar `deletedAt`
 *
 * `User.email`, `User.telefone`, `User.cpf` e `Company.cpfCnpj` são
 * `@unique` no banco. Uma suspensão (o que já existia) mantém a linha
 * lá, então a pessoa fica impedida de se cadastrar de novo com os
 * próprios documentos — é justamente o que acontecia com as contas de
 * teste. Exclusão definitiva libera esses identificadores.
 *
 * ## O que é preservado
 *
 * Duas coisas sobrevivem de propósito:
 *
 * 1. O `AuditLog` da própria exclusão, gravado com `companyId: null`.
 *    Gravá-lo no tenant excluído seria apagar a prova junto com o
 *    dado (`AuditLog.companyId` é `onDelete: Cascade`).
 * 2. Os pagamentos de pré-cadastro (`PendingSubscription`, as cobranças
 *    Asaas de quem assinou antes de ter conta) são ANONIMIZADOS, nunca
 *    apagados: nome/e-mail/telefone/CPF saem, valor, data e os ids do
 *    provedor ficam. É o registro fiscal de dinheiro que entrou de
 *    verdade — apagá-lo criaria um furo na conciliação com o Asaas.
 *
 * ## O que IMPEDE a exclusão de uma conta avulsa
 *
 * Histórico operacional que pertence a uma transportadora que CONTINUA
 * existindo: viagens dirigidas, escalas, checklists, documentos de
 * veículo, contratos assinados. Apagar a conta apagaria esses registros
 * de terceiros em cascata (as FKs são `Restrict` justamente por isso).
 * Nesses casos a exclusão é recusada com a lista do que impede, e o
 * caminho certo é excluir a transportadora inteira.
 */
@Injectable()
export class AccountDeletionService {
  private readonly logger = new Logger(AccountDeletionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ---------------------------------------------------------------- contas

  /**
   * Busca de contas para a tela de exclusão. Existe porque o Admin não
   * tinha NENHUMA lista de usuários: só via quem já apareceu em
   * verificação de identidade ou em alguma empresa, então um cadastro
   * abandonado no meio do caminho era invisível e, por isso,
   * impossível de apagar.
   *
   * Cada linha vem com `tipo` e `pendencias` (pedido do usuário
   * 02/10/2026: "mostre os cadastros não contemplados também, pq aí vou
   * saber quais são as questões faltantes"). O `tipo` não é enfeite: a
   * primeira versão desta tela tratava "sem empresa" como sinônimo de
   * cadastro não finalizado, e isso é falso para a maior categoria de
   * conta da plataforma — um Responsável NUNCA tem `Membership` (ver
   * `AuthService.registerPessoal`: cria o `User` e nada mais), então a
   * lista chamava toda família de cadastro incompleto. Agora quem diz
   * se falta algo é a regra de cada tipo.
   */
  async listarContas(filtro: {
    q?: string;
    recorte?: RecorteDeContas;
    limit: number;
  }): Promise<{ items: ContaDaBusca[]; total: number }> {
    const termo = filtro.q?.trim();
    const where: Prisma.UserWhereInput = {
      isAdminRotta: false,
      ...(filtro.recorte ? RECORTES_DE_CONTAS[filtro.recorte] : {}),
      ...(termo
        ? {
            OR: [
              { nome: { contains: termo, mode: "insensitive" } },
              { email: { contains: termo, mode: "insensitive" } },
              { telefone: { contains: termo } },
              { cpf: { contains: termo } },
            ],
          }
        : {}),
    };

    return this.prisma.runInTenantTransaction(async (tx) => {
      const [total, users] = await Promise.all([
        tx.user.count({ where }),
        tx.user.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: filtro.limit,
          select: {
            id: true,
            nome: true,
            email: true,
            telefone: true,
            cpf: true,
            status: true,
            createdAt: true,
            identityVerificationStatus: true,
            isResponsavel: true,
            autonomoRole: true,
            escolaId: true,
            memberships: {
              select: { role: true, company: { select: { id: true, nomeFantasia: true } } },
            },
            // O último pedido de vínculo responde a pergunta que mais
            // importa num transportador sem empresa: ele está esperando
            // alguém aprovar, foi recusado, ou nunca pediu nada?
            joinRequestsFeitos: {
              orderBy: { createdAt: "desc" },
              take: 1,
              select: { status: true, company: { select: { nomeFantasia: true } } },
            },
            _count: { select: { alunos: true } },
          },
        }),
      ]);

      return {
        total,
        items: users.map((user) => {
          const vinculos = user.memberships.map((vinculo) => ({
            role: vinculo.role,
            companyId: vinculo.company.id,
            nomeFantasia: vinculo.company.nomeFantasia,
          }));
          const tipo = classificarConta({
            isResponsavel: user.isResponsavel,
            autonomoRole: user.autonomoRole,
            escolaId: user.escolaId,
            papeis: vinculos.map((vinculo) => vinculo.role),
          });

          return {
            userId: user.id,
            nome: user.nome,
            email: user.email,
            telefone: user.telefone,
            cpf: user.cpf,
            status: user.status,
            criadaEm: user.createdAt.toISOString(),
            verificacaoIdentidade: user.identityVerificationStatus,
            vinculos,
            tipo,
            pendencias: levantarPendenciasDaConta({
              tipo,
              status: user.status,
              verificacaoIdentidade: user.identityVerificationStatus,
              temEmpresa: vinculos.length > 0,
              quantosAlunos: user._count.alunos,
              ultimoPedidoDeVinculo: user.joinRequestsFeitos[0]
                ? {
                    status: user.joinRequestsFeitos[0].status,
                    nomeFantasia: user.joinRequestsFeitos[0].company.nomeFantasia,
                  }
                : null,
            }),
          };
        }),
      };
    });
  }

  /**
   * Pré-cadastros que nunca viraram conta (pedido do usuário
   * 02/10/2026: "mostre os cadastros não contemplados também").
   *
   * `PendingSubscription` é onde mora o caso mais caro de todos: a
   * pessoa pagou a assinatura no checkout público e nunca completou o
   * cadastro. Não existe `User` nem `Company`, então ela não aparecia
   * em NENHUMA tela do painel: nem aqui, nem em Empresas, nem em
   * Aprovações. O dinheiro entrou e a pessoa ficou invisível.
   *
   * `linkedCompanyId` preenchido é o fim feliz (virou empresa), e sai
   * da lista por isso.
   */
  async listarPreCadastros(filtro: {
    q?: string;
    limit: number;
  }): Promise<{ items: PreCadastroDaBusca[]; total: number }> {
    const termo = filtro.q?.trim();
    const where: Prisma.PendingSubscriptionWhereInput = {
      linkedCompanyId: null,
      ...(termo
        ? {
            OR: [
              { nome: { contains: termo, mode: "insensitive" } },
              { email: { contains: termo, mode: "insensitive" } },
              { telefone: { contains: termo } },
              { cpfCnpj: { contains: termo } },
            ],
          }
        : {}),
    };

    // `PendingSubscription` não tem `companyId` (nem FK nenhuma): é
    // pré-cadastro, existe antes de qualquer tenant. Daí `withBypass`,
    // e não `runInTenantTransaction`.
    const [total, registros] = await Promise.all([
      this.prisma.withBypass(this.prisma.pendingSubscription.count({ where })),
      this.prisma.withBypass(
        this.prisma.pendingSubscription.findMany({
          where,
          orderBy: { createdAt: "desc" },
          take: filtro.limit,
        }),
      ),
    ]);

    return {
      total,
      items: registros.map((registro) => ({
        id: registro.id,
        nome: registro.nome,
        email: registro.email,
        telefone: registro.telefone,
        cpfCnpj: registro.cpfCnpj,
        status: registro.status,
        planCode: registro.planCode,
        valorCentavos: registro.valorCentavos,
        provider: registro.provider,
        pagoEm: registro.paidAt?.toISOString() ?? null,
        expiraEm: registro.expiresAt.toISOString(),
        reembolsadoEm: registro.refundedAt?.toISOString() ?? null,
        criadoEm: registro.createdAt.toISOString(),
        pendencias: levantarPendenciasDoPreCadastro(registro),
        podeExcluir: registro.paidAt === null && registro.status !== "PAGO",
      })),
    };
  }

  /**
   * Apaga um pré-cadastro que não tem dinheiro nenhum atrás dele.
   *
   * Com pagamento confirmado é recusado de propósito: aí o registro é
   * o rastro fiscal da cobrança no Asaas/AbacatePay, a mesma razão por
   * que a exclusão de empresa o ANONIMIZA em vez de apagar
   * (`anonimizarPagamentos`). Um checkout abandonado sem pagamento, ao
   * contrário, é lixo de formulário: ocupa o e-mail/CPF na busca e não
   * serve de prova de nada.
   */
  async excluirPreCadastro(
    id: string,
    atorUserId: string,
    meta: RequestMeta,
  ): Promise<{ id: string; nome: string }> {
    const registro = await this.prisma.withBypass(
      this.prisma.pendingSubscription.findUnique({ where: { id } }),
    );
    if (!registro) {
      throw new ConflictException("Pré-cadastro não encontrado.");
    }
    if (registro.linkedCompanyId) {
      throw new ConflictException(
        "Este pré-cadastro já virou uma transportadora. Para apagar, exclua a transportadora.",
      );
    }
    if (registro.paidAt !== null || registro.status === "PAGO") {
      throw new ConflictException(
        "Este pré-cadastro tem pagamento confirmado e é registro fiscal: não se apaga. " +
          "Ele é anonimizado junto da exclusão da transportadora, quando houver uma.",
      );
    }

    await this.prisma.withBypass(this.prisma.pendingSubscription.delete({ where: { id } }));

    await this.registrarAuditoria({
      entidadeTipo: "PendingSubscription",
      entidadeId: id,
      atorUserId,
      meta,
      dados: {
        nome: registro.nome,
        email: registro.email,
        cpfCnpj: registro.cpfCnpj,
        status: registro.status,
        valorCentavos: registro.valorCentavos,
      },
    });

    return { id, nome: registro.nome };
  }

  async previewConta(userId: string): Promise<PreviewDeExclusaoDeConta> {
    const user = await this.prisma.withBypass(
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, nome: true, email: true, isAdminRotta: true },
      }),
    );
    if (!user) {
      throw new ConflictException("Conta não encontrada.");
    }

    const impedimentos = user.isAdminRotta
      ? [{ o_que: MOTIVO_ADMIN_ROTTA, quantos: 1 }]
      : await this.levantarImpedimentos(userId);

    return {
      userId: user.id,
      nome: user.nome,
      email: user.email,
      podeExcluir: impedimentos.length === 0,
      impedimentos,
      seraApagado: await this.levantarDadosProprios(userId),
    };
  }

  async excluirConta(
    userId: string,
    atorUserId: string,
    meta: RequestMeta,
  ): Promise<{ userId: string; email: string }> {
    if (userId === atorUserId) {
      throw new BadRequestException("Você não pode excluir a sua própria conta.");
    }

    const preview = await this.previewConta(userId);
    if (!preview.podeExcluir) {
      throw new ConflictException(
        `Esta conta não pode ser excluída porque ainda tem histórico vinculado: ${preview.impedimentos
          .map((item) => `${item.quantos} ${item.o_que}`)
          .join(", ")}. Para apagar tudo, exclua a transportadora.`,
      );
    }

    await this.prisma.runInTenantTransaction(async (tx) => {
      await this.apagarDadosProprios(tx, userId);
      await tx.user.delete({ where: { id: userId } });
    });

    // Fora do tenant excluído de propósito — ver nota da classe.
    await this.registrarAuditoria({
      entidadeTipo: "User",
      entidadeId: userId,
      atorUserId,
      dados: { email: preview.email, nome: preview.nome, origem: "exclusao-definitiva-admin" },
      meta,
    });

    return { userId, email: preview.email };
  }

  // -------------------------------------------------------------- empresas

  async previewEmpresa(companyId: string): Promise<PreviewDeExclusaoDeEmpresa> {
    const company = await this.prisma.withBypass(
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { id: true, nomeFantasia: true, cpfCnpj: true },
      }),
    );
    if (!company) {
      throw new ConflictException("Transportadora não encontrada.");
    }

    const memberships = await this.prisma.withBypass(
      this.prisma.membership.findMany({
        where: { companyId },
        select: { userId: true, user: { select: { nome: true, email: true } } },
      }),
    );
    const userIds = [...new Set(memberships.map((m) => m.userId))];

    const outrosVinculos = await this.prisma.withBypass(
      this.prisma.membership.findMany({
        where: { userId: { in: userIds }, companyId: { not: companyId } },
        select: { userId: true },
      }),
    );
    const temOutraEmpresa = new Set(outrosVinculos.map((m) => m.userId));

    const porUserId = new Map(
      memberships.map((m) => [m.userId, { userId: m.userId, ...m.user }] as const),
    );

    return {
      companyId: company.id,
      nomeFantasia: company.nomeFantasia,
      cpfCnpj: company.cpfCnpj,
      seraApagado: await this.levantarDadosDaEmpresa(companyId),
      contasQueSeraoApagadas: userIds
        .filter((id) => !temOutraEmpresa.has(id))
        .map((id) => porUserId.get(id)!),
      contasQueSobrevivem: userIds
        .filter((id) => temOutraEmpresa.has(id))
        .map((id) => porUserId.get(id)!),
    };
  }

  async excluirEmpresa(
    companyId: string,
    atorUserId: string,
    meta: RequestMeta,
  ): Promise<ResultadoDaExclusaoDeEmpresa> {
    const preview = await this.previewEmpresa(companyId);

    const pagamentosAnonimizados = await this.anonimizarPagamentos(companyId, preview.cpfCnpj);

    await this.prisma.runInTenantTransaction(async (tx) => {
      // A carteira da empresa cai em cascata com ela, mas o extrato e os
      // saques apontam para a carteira com `Restrict` — sem apagar o
      // extrato primeiro, o `delete` da empresa falha no banco.
      await this.apagarExtratoDasCarteiras(tx, { companyId });
      await tx.company.delete({ where: { id: companyId } });
    });

    // Só agora: com a empresa fora, o histórico que travava cada conta
    // (viagens, escalas, checklists daquele tenant) já não existe.
    const contasApagadas: string[] = [];
    const contasMantidas: ResultadoDaExclusaoDeEmpresa["contasMantidas"] = [];
    for (const conta of preview.contasQueSeraoApagadas) {
      try {
        await this.excluirConta(conta.userId, atorUserId, meta);
        contasApagadas.push(conta.email);
      } catch (causa) {
        // Uma conta que ainda tem rastro em OUTRO lugar não derruba a
        // exclusão da empresa: ela fica, e o admin vê por quê.
        const motivo = causa instanceof Error ? causa.message : "Motivo desconhecido.";
        contasMantidas.push({ userId: conta.userId, email: conta.email, motivo });
        this.logger.warn(`Conta ${conta.email} mantida após excluir ${companyId}: ${motivo}`);
      }
    }

    await this.registrarAuditoria({
      entidadeTipo: "Company",
      entidadeId: companyId,
      atorUserId,
      dados: {
        nomeFantasia: preview.nomeFantasia,
        cpfCnpj: preview.cpfCnpj,
        contasApagadas,
        pagamentosAnonimizados,
        origem: "exclusao-definitiva-admin",
      },
      meta,
    });

    return {
      companyId,
      nomeFantasia: preview.nomeFantasia,
      contasApagadas,
      contasMantidas,
      pagamentosAnonimizados,
    };
  }

  // ------------------------------------------------------------- internos

  /**
   * Registros de terceiros que a exclusão da conta levaria junto. Cada
   * contagem aqui corresponde a uma FK `Restrict` apontando para `User`
   * no schema — a lista é o espelho dela, não uma escolha de produto.
   */
  private async levantarImpedimentos(userId: string): Promise<ImpedimentoDeExclusao[]> {
    // Uma transação só, contagens em sequência: as ~24 perguntas em
    // paralelo abririam 24 transações e esgotariam o pool de conexões.
    return this.prisma.runInTenantTransaction(async (tx) => {
      const alunos = await tx.student.findMany({
        where: { responsavelId: userId },
        select: { id: true },
      });
      const alunoIds = alunos.map((aluno) => aluno.id);

      return this.contar([
        ["viagens dirigidas", () => tx.trip.count({ where: { motoristaId: userId } })],
        [
          "escalas como motorista ou monitor",
          () =>
            tx.routeAssignment.count({
              where: { OR: [{ motoristaId: userId }, { monitorId: userId }] },
            }),
        ],
        [
          "checklists de veículo",
          () => tx.vehicleChecklist.count({ where: { motoristaId: userId } }),
        ],
        [
          "documentos de veículo enviados",
          () => tx.vehicleDocument.count({ where: { uploadedByUserId: userId } }),
        ],
        [
          "manutenções registradas",
          () => tx.vehicleMaintenance.count({ where: { registradoPorId: userId } }),
        ],
        [
          "ocorrências de veículo",
          () => tx.vehicleOccurrence.count({ where: { reportadoPorId: userId } }),
        ],
        [
          "eventos de viagem processados",
          () => tx.tripStudentEvent.count({ where: { processadoPorId: userId } }),
        ],
        [
          "contratos como responsável",
          () => tx.contract.count({ where: { responsavelId: userId } }),
        ],
        ["convites criados", () => tx.invite.count({ where: { criadoPorId: userId } })],
        [
          "pré-cadastros de equipe criados",
          () => tx.companyJoinPreRegistration.count({ where: { criadoPorId: userId } }),
        ],
        [
          "pré-cadastros de aluno criados",
          () => tx.studentPreRegistration.count({ where: { criadoPorId: userId } }),
        ],
        [
          "escolas vinculadas",
          () => tx.schoolCompanyLink.count({ where: { vinculadoPorId: userId } }),
        ],
        ["avisos publicados", () => tx.announcement.count({ where: { criadoPorUserId: userId } })],
        ["avisos de plano", () => tx.planNotice.count({ where: { criadoPorUserId: userId } })],
        [
          "versões de documento legal",
          () =>
            tx.legalDocumentVersion.count({
              where: { OR: [{ autorId: userId }, { aprovadoPorId: userId }] },
            }),
        ],
        [
          "saques solicitados",
          () => tx.withdrawalRequest.count({ where: { solicitadoPorUserId: userId } }),
        ],
        [
          "mensagens em conversas de contrato",
          () => tx.conversationMessage.count({ where: { autorUserId: userId } }),
        ],
        [
          "desvios de endereço lançados",
          () => tx.studentAddressOverride.count({ where: { criadoPorUserId: userId } }),
        ],
        [
          "recorrências de desvio lançadas",
          () => tx.studentAddressOverrideRecurrence.count({ where: { criadoPorUserId: userId } }),
        ],
        [
          "faltas lançadas",
          () => tx.studentDailyAbsence.count({ where: { criadoPorUserId: userId } }),
        ],
        // Histórico dos ALUNOS da conta: o aluno é apagado junto com o
        // responsável, e esses registros apontam para ele com `Restrict`.
        [
          "eventos de viagem dos alunos",
          () =>
            alunoIds.length === 0
              ? Promise.resolve(0)
              : tx.tripStudentEvent.count({ where: { studentId: { in: alunoIds } } }),
        ],
        [
          "contratos dos alunos",
          () =>
            alunoIds.length === 0
              ? Promise.resolve(0)
              : tx.contract.count({ where: { studentId: { in: alunoIds } } }),
        ],
        // Mensagens de suporte escritas em chamados que a conta NÃO abriu
        // (tipicamente respostas de atendimento): são de outra pessoa.
        [
          "respostas em chamados de terceiros",
          () =>
            tx.supportMessage.count({
              where: { autorUserId: userId, ticket: { abertoPorUserId: { not: userId } } },
            }),
        ],
      ]);
    });
  }

  /** O que a conta tem de próprio e vai embora com ela. */
  private async levantarDadosProprios(userId: string): Promise<ImpedimentoDeExclusao[]> {
    return this.prisma.runInTenantTransaction((tx) =>
      this.contar([
        ["alunos", () => tx.student.count({ where: { responsavelId: userId } })],
        [
          "pedidos de transporte",
          () => tx.transportRequest.count({ where: { responsavelId: userId } }),
        ],
        ["avaliações feitas", () => tx.rating.count({ where: { responsavelId: userId } })],
        [
          "chamados de suporte",
          () => tx.supportTicket.count({ where: { abertoPorUserId: userId } }),
        ],
        ["vínculos com empresa", () => tx.membership.count({ where: { userId } })],
        ["pedidos de vínculo", () => tx.companyJoinRequest.count({ where: { userId } })],
        ["documentos de motorista", () => tx.driverDocument.count({ where: { userId } })],
        ["notificações", () => tx.notification.count({ where: { userId } })],
      ]),
    );
  }

  private async levantarDadosDaEmpresa(companyId: string): Promise<ImpedimentoDeExclusao[]> {
    return this.prisma.runInTenantTransaction((tx) =>
      this.contar([
        ["contratos", () => tx.contract.count({ where: { companyId } })],
        ["veículos", () => tx.vehicle.count({ where: { companyId } })],
        ["rotas", () => tx.route.count({ where: { companyId } })],
        ["viagens", () => tx.trip.count({ where: { companyId } })],
        ["escalas", () => tx.routeAssignment.count({ where: { companyId } })],
        ["chamados de suporte", () => tx.supportTicket.count({ where: { companyId } })],
        ["registros de auditoria", () => tx.auditLog.count({ where: { companyId } })],
      ]),
    );
  }

  /** Conta em sequência e devolve só o que tem linha, já rotulado. */
  private async contar(
    perguntas: Array<[string, () => Promise<number>]>,
  ): Promise<ImpedimentoDeExclusao[]> {
    const achados: ImpedimentoDeExclusao[] = [];
    for (const [o_que, contagem] of perguntas) {
      const quantos = await contagem();
      if (quantos > 0) achados.push({ o_que, quantos });
    }
    return achados;
  }

  /**
   * Dados próprios da conta, na ordem que o banco aceita: o que aponta
   * para o aluno antes do aluno, o extrato antes da carteira. O resto
   * (sessões, tokens, vínculos, notificações, consentimentos) cai em
   * cascata junto com o `User`.
   */
  private async apagarDadosProprios(tx: Prisma.TransactionClient, userId: string): Promise<void> {
    const alunos = await tx.student.findMany({
      where: { responsavelId: userId },
      select: { id: true },
    });
    const alunoIds = alunos.map((aluno) => aluno.id);

    await this.apagarExtratoDasCarteiras(tx, { motoristaId: userId });

    if (alunoIds.length > 0) {
      await tx.transportRequest.deleteMany({ where: { studentId: { in: alunoIds } } });
    }
    await tx.transportRequest.deleteMany({ where: { responsavelId: userId } });
    await tx.rating.deleteMany({ where: { responsavelId: userId } });
    await tx.student.deleteMany({ where: { responsavelId: userId } });
    await tx.supportTicket.deleteMany({ where: { abertoPorUserId: userId } });
  }

  /** Extrato e saques das carteiras do dono informado (`Restrict` na carteira). */
  private async apagarExtratoDasCarteiras(
    tx: Prisma.TransactionClient,
    dono: { companyId: string } | { motoristaId: string },
  ): Promise<void> {
    const carteiras = await tx.wallet.findMany({ where: dono, select: { id: true } });
    if (carteiras.length === 0) return;
    const walletIds = carteiras.map((carteira) => carteira.id);

    await tx.walletTransaction.deleteMany({ where: { walletId: { in: walletIds } } });
    await tx.withdrawalRequest.deleteMany({ where: { walletId: { in: walletIds } } });
    await tx.wallet.deleteMany({ where: { id: { in: walletIds } } });
  }

  /**
   * Cobranças de pré-cadastro: PII fora, dinheiro registrado. Ver a nota
   * "O que é preservado" na classe.
   */
  private async anonimizarPagamentos(companyId: string, cpfCnpj: string): Promise<number> {
    const { count } = await this.prisma.withBypass(
      this.prisma.pendingSubscription.updateMany({
        where: {
          OR: [{ linkedCompanyId: companyId }, { cpfCnpj }],
          // Não reanonimiza o que já passou por aqui.
          NOT: { cpfCnpj: null, email: null, telefone: null },
        },
        data: { nome: "Conta excluída", email: null, telefone: null, cpfCnpj: null },
      }),
    );
    return count;
  }

  private async registrarAuditoria(entrada: {
    entidadeTipo: string;
    entidadeId: string;
    atorUserId: string;
    dados: Record<string, unknown>;
    meta: RequestMeta;
  }): Promise<void> {
    try {
      await this.auditLogService.record({
        // `companyId` omitido de propósito: ver a nota da classe.
        entidadeTipo: entrada.entidadeTipo,
        entidadeId: entrada.entidadeId,
        acao: "DELETED",
        atorUserId: entrada.atorUserId,
        dadosAntes: entrada.dados,
        ip: entrada.meta.ip,
        userAgent: entrada.meta.userAgent,
      });
    } catch (causa) {
      // A exclusão já aconteceu: falhar aqui não a desfaz, e engolir em
      // silêncio esconderia que a prova não ficou registrada.
      this.logger.error(
        `Exclusão de ${entrada.entidadeTipo} ${entrada.entidadeId} CONCLUÍDA, mas a auditoria não foi gravada.`,
        causa instanceof Error ? causa.stack : undefined,
      );
    }
  }
}
