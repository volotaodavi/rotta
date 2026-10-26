import { Injectable } from "@nestjs/common";

import type {
  DispatchRepository,
  EventoDeAlunoDoDia,
  LinhaDaEscala,
  OcorrenciaDoDia,
  RotaAtiva,
  ViagemDoDia,
} from "./dispatch.repository";

import { PrismaService } from "@/infra/database/prisma.service";

/** O veículo como o painel o identifica, sempre os mesmos campos. */
const SELECT_VEICULO = {
  id: true,
  numeroFrota: true,
  placa: true,
  modelo: true,
  rastreadorImei: true,
} as const;

@Injectable()
export class PrismaDispatchRepository implements DispatchRepository {
  constructor(private readonly prisma: PrismaService) {}

  /** Fuso da empresa, com o padrão do schema quando a linha não for encontrada. */
  async buscarFusoHorario(companyId: string): Promise<string> {
    const empresa = await this.prisma.withTenant(
      this.prisma.company.findUnique({
        where: { id: companyId },
        select: { fusoHorario: true },
      }),
    );
    return empresa?.fusoHorario ?? "America/Sao_Paulo";
  }

  async contarFrota(companyId: string): Promise<{ total: number; comRastreador: number }> {
    const [total, comRastreador] = await Promise.all([
      this.prisma.withTenant(this.prisma.vehicle.count({ where: { companyId, deletedAt: null } })),
      this.prisma.withTenant(
        this.prisma.vehicle.count({
          where: { companyId, deletedAt: null, rastreadorImei: { not: null } },
        }),
      ),
    ]);
    return { total, comRastreador };
  }

  async contarEquipe(companyId: string): Promise<{ motoristas: number; monitores: number }> {
    const [motoristas, monitores] = await Promise.all([
      this.prisma.withTenant(
        this.prisma.membership.count({ where: { companyId, role: "motorista", status: "ATIVO" } }),
      ),
      this.prisma.withTenant(
        this.prisma.membership.count({ where: { companyId, role: "monitor", status: "ATIVO" } }),
      ),
    ]);
    return { motoristas, monitores };
  }

  /**
   * As viagens do dia com a ÚLTIMA posição de cada uma.
   *
   * A posição vem de `trip_positions` e não de `Vehicle.ultimaPosicaoEm`
   * de propósito. O campo do veículo é o último sinal daquele CARRO,
   * que continua sendo escrito depois que a viagem encerra; a última
   * linha de `trip_positions` é o último sinal DAQUELA VIAGEM. Para o
   * mapa do dia as duas coincidem enquanto a viagem roda, e discordam
   * exatamente no caso que mais importa: a viagem que já acabou.
   *
   * `take: 1` com `orderBy capturadaEm desc` dentro do include é uma
   * consulta lateral por viagem, não um N+1 na aplicação: o Prisma
   * resolve as posições em uma segunda consulta para o conjunto
   * inteiro.
   */
  async listarViagensDoDia(companyId: string, dia: Date): Promise<ViagemDoDia[]> {
    const viagens = await this.prisma.withTenant(
      this.prisma.trip.findMany({
        where: { companyId, data: dia },
        include: {
          route: { select: { id: true, nome: true, turno: true } },
          veiculo: { select: SELECT_VEICULO },
          motorista: { select: { id: true, nome: true } },
          monitor: { select: { id: true, nome: true } },
          posicoes: {
            orderBy: { capturadaEm: "desc" },
            // Duas, não uma: ver a nota de `posicaoAnterior` na
            // interface. Aparelho que não informa velocidade só revela
            // movimento comparando duas posições seguidas.
            take: 2,
            select: {
              latitude: true,
              longitude: true,
              velocidadeKmh: true,
              capturadaEm: true,
            },
          },
        },
        orderBy: { iniciadaEm: "asc" },
      }),
    );

    const converter = (
      posicao: (typeof viagens)[number]["posicoes"][number] | undefined,
    ): ViagemDoDia["ultimaPosicao"] =>
      posicao
        ? {
            latitude: Number(posicao.latitude),
            longitude: Number(posicao.longitude),
            velocidadeKmh: posicao.velocidadeKmh === null ? null : Number(posicao.velocidadeKmh),
            capturadaEm: posicao.capturadaEm,
          }
        : null;

    return viagens.map((viagem) => {
      return {
        id: viagem.id,
        codigo: viagem.codigo,
        status: viagem.status,
        sentido: viagem.sentido,
        iniciadaEm: viagem.iniciadaEm,
        finalizadaEm: viagem.finalizadaEm,
        canceladaEm: viagem.canceladaEm,
        rota: viagem.route,
        veiculo: viagem.veiculo,
        motorista: viagem.motorista,
        monitor: viagem.monitor,
        ultimaPosicao: converter(viagem.posicoes[0]),
        posicaoAnterior: converter(viagem.posicoes[1]),
      };
    });
  }

  /**
   * As rotas ativas, com a janela de horário tirada das paradas.
   *
   * Traz só a primeira e a última parada (`ordem` crescente e
   * decrescente, uma linha cada) em vez da lista inteira: o painel só
   * precisa da janela, e uma rota urbana tem dezenas de pontos que
   * ninguém vai ler na tela inicial.
   */
  async listarRotasAtivas(companyId: string): Promise<RotaAtiva[]> {
    const rotas = await this.prisma.withTenant(
      this.prisma.route.findMany({
        where: { companyId, status: "ATIVA", deletedAt: null },
        select: {
          id: true,
          nome: true,
          turno: true,
          status: true,
          veiculoPadrao: { select: SELECT_VEICULO },
          _count: { select: { alunos: true } },
          paradas: {
            orderBy: { ordem: "asc" },
            select: { horarioPrevisto: true },
          },
        },
        orderBy: { nome: "asc" },
      }),
    );

    return rotas.map((rota) => ({
      id: rota.id,
      nome: rota.nome,
      turno: rota.turno,
      status: rota.status,
      // Rota sem parada cadastrada é o caso normal do transporte
      // público escolar, não um cadastro pela metade: sem ponto fixo
      // não há horário previsto, e o painel diz isso em vez de
      // inventar uma janela.
      horarioPrimeiraParada: rota.paradas[0]?.horarioPrevisto ?? null,
      horarioUltimaParada: rota.paradas[rota.paradas.length - 1]?.horarioPrevisto ?? null,
      alunos: rota._count.alunos,
      veiculoPadrao: rota.veiculoPadrao,
    }));
  }

  async listarEscalaDoDia(companyId: string, dia: Date): Promise<LinhaDaEscala[]> {
    const escalas = await this.prisma.withTenant(
      this.prisma.routeAssignment.findMany({
        where: { companyId, data: dia },
        select: {
          routeId: true,
          observacao: true,
          route: { select: { nome: true, turno: true } },
          veiculo: { select: SELECT_VEICULO },
          motorista: { select: { nome: true } },
          monitor: { select: { nome: true } },
        },
        orderBy: { route: { nome: "asc" } },
      }),
    );

    return escalas.map((escala) => ({
      routeId: escala.routeId,
      rotaNome: escala.route.nome,
      turno: escala.route.turno,
      veiculo: escala.veiculo,
      motoristaNome: escala.motorista.nome,
      monitorNome: escala.monitor?.nome ?? null,
      observacao: escala.observacao,
    }));
  }

  async listarOcorrenciasDesde(companyId: string, desde: Date): Promise<OcorrenciaDoDia[]> {
    const ocorrencias = await this.prisma.withTenant(
      this.prisma.vehicleOccurrence.findMany({
        where: { companyId, createdAt: { gte: desde } },
        select: {
          id: true,
          titulo: true,
          descricao: true,
          severidade: true,
          createdAt: true,
          vehicle: { select: SELECT_VEICULO },
        },
        orderBy: { createdAt: "desc" },
      }),
    );

    return ocorrencias.map((ocorrencia) => ({
      id: ocorrencia.id,
      titulo: ocorrencia.titulo,
      descricao: ocorrencia.descricao,
      severidade: ocorrencia.severidade,
      registradaEm: ocorrencia.createdAt,
      veiculo: ocorrencia.vehicle,
    }));
  }

  async listarEventosDeAlunoDesde(
    companyId: string,
    desde: Date,
    limite: number,
  ): Promise<EventoDeAlunoDoDia[]> {
    const eventos = await this.prisma.withTenant(
      this.prisma.tripStudentEvent.findMany({
        where: { companyId, processadoEm: { gte: desde } },
        select: {
          id: true,
          tipo: true,
          processadoEm: true,
          student: { select: { nome: true } },
          trip: { select: { route: { select: { nome: true } } } },
        },
        orderBy: { processadoEm: "desc" },
        take: limite,
      }),
    );

    return eventos.map((evento) => ({
      id: evento.id,
      tipo: evento.tipo,
      processadoEm: evento.processadoEm,
      alunoNome: evento.student.nome,
      rotaNome: evento.trip.route.nome,
    }));
  }
}
