import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { SchoolAdministrativeDependency, SchoolStaffRole, UserStatus } from "@prisma/client";

import type { AlunoDoDiaResponseDto, StatusDoAlunoNoDia } from "./dto/aluno-do-dia-response.dto";
import type { ContaDaEscolaResponseDto } from "./dto/conta-da-escola-response.dto";
import type { CriarContaDaEscolaDto } from "./dto/criar-conta-da-escola.dto";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";

import { PrismaService } from "@/infra/database/prisma.service";
import { UsersService } from "@/modules/users/users.service";
import { Role } from "@/shared/enums";
import { inicioDoDiaUtc } from "@/shared/utils/dia.util";

/**
 * Portal da Escola (pedido do usuário 22/09/2026: "criar a categoria de
 * escolas, que aí vão poder ver quais alunos irão nos ônibus e se eles
 * já foram, para maior controle").
 *
 * ## Por que este módulo é diferente de todos os outros
 *
 * Todo o resto da Rotta se isola por `companyId`, via RLS do Postgres
 * (`PrismaService.withTenant`). Uma escola NÃO cabe nesse modelo: ela é
 * atendida por várias transportadoras ao mesmo tempo, e no transporte
 * público isso é a regra, não a exceção. `School` sequer tem
 * `companyId` no schema, justamente por isso.
 *
 * Então aqui a leitura é `withBypass` — o MESMO caso legítimo já
 * documentado em `PrismaService.withBypass` ("o próprio usuário
 * consultando seu próprio recurso, através de tenants diferentes", hoje
 * usado pelo login para resolver `Membership`s antes de haver tenant).
 *
 * ## A regra que sustenta a segurança disto
 *
 * `withBypass` desliga a RLS. Então o filtro vira responsabilidade
 * deste arquivo, e ele tem UMA regra, sem exceção:
 *
 *   **Toda consulta filtra por `escolaId` lido do TOKEN.**
 *
 * Nunca de parâmetro, corpo ou cabeçalho da requisição. Se o
 * `escolaId` viesse do cliente, trocar um UUID na URL entregaria a
 * lista de crianças de qualquer escola do país — que é exatamente o
 * tipo de vazamento que este produto não pode ter.
 *
 * `exigirEscolaDoToken` existe para que não haja caminho de código que
 * chegue a uma consulta sem esse filtro: ele lança antes.
 */
@Injectable()
export class SchoolPortalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  // ---------------------------------------------------------------------
  // Contas do portal — quem entra, e quem pode abrir a porta para quem
  // ---------------------------------------------------------------------

  /**
   * Cria uma conta do Portal da Escola, sem convite.
   *
   * Pedido do usuário 22/09/2026, fluxo de transporte público: "não irei
   * criar escolas, irei pegar escolas existentes na planilha e irei
   * fazer com que as escolas tenham o devido painel... só terminar o
   * quesito de e-mail e senha".
   *
   * ## As duas portas, e por que a segunda existe
   *
   * - **Admin Rotta** cria o DIRETOR de qualquer escola do catálogo,
   *   informando `escolaId`.
   * - **DIRETOR** cria COORDENADOR e AJUDANTE da PRÓPRIA escola, e o
   *   `escolaId` vem do token dele, nunca do corpo da requisição.
   *
   * A segunda porta existe por aritmética: numa rede municipal com 40
   * escolas e 3 pessoas por escola são 120 contas. Se todas passassem
   * pelo Admin, o cadastro viraria o gargalo da adoção.
   *
   * ## As duas regras que sustentam o isolamento
   *
   * 1. O diretor NUNCA escolhe a escola — se escolhesse, abriria acesso
   *    às crianças de outra escola com um UUID trocado.
   * 2. O diretor NUNCA cria outro diretor — senão o cargo que controla
   *    o acesso se autoconcederia, e a distinção entre "quem o Admin
   *    nomeou" e "quem entrou depois" deixaria de existir.
   */
  async criarConta(
    dto: CriarContaDaEscolaDto,
    actor: AuthenticatedUser,
  ): Promise<ContaDaEscolaResponseDto> {
    const escolaId = this.resolverEscolaParaCriacao(dto, actor);

    const escola = await this.prisma.withBypass(
      this.prisma.school.findFirst({
        where: { id: escolaId, deletedAt: null },
        select: {
          id: true,
          nomeOficial: true,
          nomeFantasia: true,
          dependenciaAdministrativa: true,
        },
      }),
    );
    if (!escola) {
      throw new NotFoundException("Escola não encontrada.");
    }

    assertEscolaPublica(escola.dependenciaAdministrativa);

    const email = dto.email.trim().toLowerCase();
    const telefone = dto.telefone.replace(/\D/g, "");

    // Mesma checagem do cadastro público — a mensagem de conflito é a
    // mesma que a pessoa veria se tentasse se cadastrar sozinha, em vez
    // de um erro de constraint do banco.
    await this.usersService.assertNoDuplicateIdentity(email, telefone);

    const user = await this.usersService.createUserWithPassword({
      nome: dto.nome.trim(),
      email,
      telefone,
      senha: dto.senha,
      escolaId,
    });

    // O cargo é gravado à parte porque `createUserWithPassword` é o
    // cadastro genérico de qualquer papel — só o Portal da Escola tem
    // cargo interno.
    const comPapel = await this.usersService.definirPapelNaEscola(user.id, dto.papel);

    return this.toContaResponse(comPapel, escola);
  }

  /**
   * As contas de uma escola. Admin Rotta vê a de qualquer escola
   * (informando `escolaId`); uma conta de escola vê só as da própria,
   * e o parâmetro é ignorado para ela.
   */
  async listarContas(
    actor: AuthenticatedUser,
    escolaIdQuery?: string,
  ): Promise<ContaDaEscolaResponseDto[]> {
    const escolaId =
      actor.role === Role.ADMIN_ROTTA ? escolaIdQuery : this.exigirEscolaDoToken(actor);

    if (!escolaId) {
      throw new BadRequestException(
        "Informe `escolaId` para listar as contas como Admin da Rotta.",
      );
    }

    const contas = await this.prisma.withBypass(
      this.prisma.user.findMany({
        where: { escolaId, deletedAt: null },
        select: {
          id: true,
          nome: true,
          email: true,
          telefone: true,
          escolaPapel: true,
          status: true,
          escolaId: true,
          createdAt: true,
          escola: { select: { nomeOficial: true, nomeFantasia: true } },
        },
        orderBy: [{ escolaPapel: "asc" }, { nome: "asc" }],
      }),
    );

    return contas.map((conta) => this.toContaResponse(conta, conta.escola));
  }

  /**
   * Ativa/desativa uma conta do portal. Nunca apaga: a pessoa que
   * conferiu a saída das crianças ontem tem de continuar existindo no
   * histórico de hoje.
   */
  async definirStatusDaConta(
    contaId: string,
    ativo: boolean,
    actor: AuthenticatedUser,
  ): Promise<ContaDaEscolaResponseDto> {
    const conta = await this.prisma.withBypass(
      this.prisma.user.findUnique({
        where: { id: contaId },
        select: {
          id: true,
          escolaId: true,
          escolaPapel: true,
          escola: { select: { nomeOficial: true, nomeFantasia: true } },
        },
      }),
    );
    if (!conta?.escolaId) {
      throw new NotFoundException("Conta de escola não encontrada.");
    }

    if (actor.role !== Role.ADMIN_ROTTA) {
      const minhaEscola = this.exigirEscolaDoToken(actor);
      if (conta.escolaId !== minhaEscola) {
        // 404, não 403: um diretor não precisa descobrir que uma conta
        // de outra escola existe.
        throw new NotFoundException("Conta de escola não encontrada.");
      }
      this.exigirDiretor(actor);
      if (conta.escolaPapel === SchoolStaffRole.DIRETOR) {
        throw new ForbiddenException(
          "Um diretor não pode desativar outro diretor. Peça ao Admin da Rotta.",
        );
      }
      if (conta.id === actor.sub) {
        throw new BadRequestException("Você não pode desativar a própria conta.");
      }
    }

    const atualizada = await this.usersService.definirStatusDeConta(
      contaId,
      ativo ? UserStatus.ATIVO : UserStatus.INATIVO,
    );

    return this.toContaResponse({ ...atualizada, escolaId: conta.escolaId }, conta.escola);
  }

  /**
   * De qual escola será a conta nova — e é aqui que mora toda a
   * segurança desta parte.
   */
  private resolverEscolaParaCriacao(dto: CriarContaDaEscolaDto, actor: AuthenticatedUser): string {
    if (actor.role === Role.ADMIN_ROTTA) {
      if (!dto.escolaId) {
        throw new BadRequestException("Informe a escola para a qual esta conta será criada.");
      }
      return dto.escolaId;
    }

    const minhaEscola = this.exigirEscolaDoToken(actor);
    this.exigirDiretor(actor);

    // O diretor não escolhe escola. Aceitar `escolaId` do corpo aqui —
    // mesmo que coincidisse com a dele — normalizaria um parâmetro que
    // um dia alguém deixaria de validar.
    if (dto.escolaId && dto.escolaId !== minhaEscola) {
      throw new ForbiddenException("Você só pode abrir acesso para a sua própria escola.");
    }

    if (dto.papel === SchoolStaffRole.DIRETOR) {
      throw new ForbiddenException(
        "Só o Admin da Rotta nomeia um diretor. Você pode criar coordenador e ajudante.",
      );
    }

    return minhaEscola;
  }

  private exigirDiretor(actor: AuthenticatedUser): void {
    if (actor.escolaPapel !== SchoolStaffRole.DIRETOR) {
      throw new ForbiddenException("Só a direção da escola pode abrir acesso para a equipe.");
    }
  }

  private toContaResponse(
    user: {
      id: string;
      nome: string;
      email: string;
      telefone: string;
      escolaPapel: SchoolStaffRole | null;
      status: UserStatus;
      escolaId: string | null;
      createdAt: Date;
    },
    escola: { nomeOficial: string; nomeFantasia: string | null } | null,
  ): ContaDaEscolaResponseDto {
    return {
      id: user.id,
      nome: user.nome,
      email: user.email,
      telefone: user.telefone,
      papel: user.escolaPapel,
      status: user.status,
      escolaId: user.escolaId!,
      escolaNome: escola ? (escola.nomeFantasia ?? escola.nomeOficial) : null,
      createdAt: user.createdAt.toISOString(),
    };
  }

  /**
   * O `escolaId` desta sessão, ou erro.
   *
   * Recusa qualquer papel que não seja `ESCOLA` mesmo que o token
   * carregue um `escolaId` por engano — defesa em profundidade: papel e
   * escopo têm de concordar.
   */
  private exigirEscolaDoToken(actor: AuthenticatedUser): string {
    if (actor.role !== Role.ESCOLA || !actor.escolaId) {
      throw new ForbiddenException("Esta área é exclusiva de contas de escola.");
    }
    return actor.escolaId;
  }

  /**
   * Quem vai/foi de ônibus hoje, nesta escola.
   *
   * Responde a pergunta operacional da escola na hora da saída: quem
   * ainda está para embarcar, quem já embarcou, quem já desembarcou e
   * quem faltou — para não liberar criança para um ônibus que ela não
   * pega, e para saber quem ainda está esperando.
   */
  async listarAlunosDoDia(actor: AuthenticatedUser): Promise<AlunoDoDiaResponseDto[]> {
    const escolaId = this.exigirEscolaDoToken(actor);
    const hoje = inicioDoDiaUtc();

    // Um `findMany` só: alunos DESTA escola, com a viagem de hoje de
    // cada vínculo de rota e os eventos de hoje. Evita o N+1 de buscar
    // aluno por aluno — numa escola grande isso seriam centenas de
    // consultas na hora de pico da saída.
    const alunos = await this.prisma.withBypass(
      this.prisma.student.findMany({
        where: {
          // O filtro que sustenta o isolamento inteiro deste módulo.
          schoolId: escolaId,
          deletedAt: null,
        },
        select: {
          id: true,
          nome: true,
          dataNascimento: true,
          turno: true,
          eventosViagem: {
            where: { trip: { data: hoje } },
            select: {
              tipo: true,
              processadoEm: true,
              trip: {
                select: {
                  id: true,
                  status: true,
                  sentido: true,
                  route: { select: { id: true, nome: true } },
                  veiculo: { select: { placa: true, modelo: true } },
                  company: { select: { nomeFantasia: true } },
                },
              },
            },
            orderBy: { processadoEm: "asc" },
          },
        },
        orderBy: { nome: "asc" },
      }),
    );

    return alunos.map((aluno) => {
      // O evento mais recente do dia manda: AUSENTE encerra o assunto,
      // DESEMBARCOU vence EMBARCOU. Mesma precedência que o app do
      // motorista usa em `statusDoAluno` (`inicio-screen.tsx`) — se as
      // duas divergirem, escola e motorista veem coisas diferentes
      // sobre a mesma criança.
      const ausente = aluno.eventosViagem.find((e) => e.tipo === "AUSENTE");
      const desembarque = aluno.eventosViagem.find((e) => e.tipo === "DESEMBARCOU");
      const embarque = aluno.eventosViagem.find((e) => e.tipo === "EMBARCOU");
      const decisivo = ausente ?? desembarque ?? embarque ?? null;

      const status: StatusDoAlunoNoDia = ausente
        ? "AUSENTE"
        : desembarque
          ? "DESEMBARCOU"
          : embarque
            ? "EMBARCADO"
            : "AGUARDANDO";

      const viagem = decisivo?.trip ?? aluno.eventosViagem[0]?.trip ?? null;

      return {
        studentId: aluno.id,
        nome: aluno.nome,
        dataNascimento: aluno.dataNascimento.toISOString().slice(0, 10),
        turno: aluno.turno,
        status,
        ocorridoEm: decisivo?.processadoEm.toISOString() ?? null,
        tripId: viagem?.id ?? null,
        rotaNome: viagem?.route.nome ?? null,
        sentido: viagem?.sentido ?? null,
        veiculoPlaca: viagem?.veiculo.placa ?? null,
        veiculoModelo: viagem?.veiculo.modelo ?? null,
        // A escola atende várias transportadoras — sem este campo, não
        // dá para saber a quem cobrar quando uma criança não aparece.
        transportadoraNome: viagem?.company.nomeFantasia ?? null,
      };
    });
  }
}

/**
 * As redes que a secretaria de educação trata como públicas.
 *
 * Filantrópica e comunitária ficam de fora junto com a privada: são a
 * mesma coisa na prática para quem opera o transporte — não é a
 * prefeitura quem manda nelas.
 */
const REDES_PUBLICAS: SchoolAdministrativeDependency[] = [
  SchoolAdministrativeDependency.FEDERAL,
  SchoolAdministrativeDependency.ESTADUAL,
  SchoolAdministrativeDependency.MUNICIPAL,
];

/**
 * O Portal da Escola existe só para escola da rede PÚBLICA — pedido do
 * usuário (25/09/2026): "portal da escola quero apenas das públicas".
 *
 * ## Por que a regra mora na ESCOLA, e não na tag da transportadora
 *
 * O portal é da escola: são o diretor, os coordenadores e os ajudantes
 * DELA que entram. E a mesma escola pode ser atendida por várias
 * transportadoras ao mesmo tempo — é a regra do transporte público,
 * não a exceção. Amarrar o portal à habilitação da empresa obrigaria a
 * inventar qual empresa decide: a primeira credenciada? qualquer uma
 * licitada? todas? Qualquer resposta seria arbitrária, e o portal da
 * escola apareceria e sumiria conforme a lista de transportadoras dela
 * mudasse — sem ninguém ter mexido na escola.
 *
 * `dependenciaAdministrativa` é do próprio registro da escola, vem
 * preenchida do Censo Escolar para as 100 mil escolas já importadas, e
 * não muda quando um contrato de transporte muda.
 *
 * ## Só barra a CRIAÇÃO
 *
 * Contas que já existem continuam entrando e trabalhando. Uma regra
 * nova não pode derrubar do sistema um diretor que já usa o painel —
 * para tirar alguém do ar existe o status da conta, que é o gesto
 * certo e tem quem o audite.
 */
function assertEscolaPublica(dependencia: SchoolAdministrativeDependency): void {
  if (REDES_PUBLICAS.includes(dependencia)) return;

  throw new ForbiddenException(
    "O Portal da Escola existe apenas para escolas da rede pública (federal, estadual ou municipal). " +
      "Esta escola é da rede privada — o acompanhamento das famílias dela é feito pelo app do responsável.",
  );
}
