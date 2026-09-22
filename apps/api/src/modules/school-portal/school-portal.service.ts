import { ForbiddenException, Injectable } from "@nestjs/common";

import type { AlunoDoDiaResponseDto, StatusDoAlunoNoDia } from "./dto/aluno-do-dia-response.dto";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";

import { PrismaService } from "@/infra/database/prisma.service";
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
  constructor(private readonly prisma: PrismaService) {}

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
