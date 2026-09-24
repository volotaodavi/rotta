import { BadRequestException, ForbiddenException, Injectable } from "@nestjs/common";

import type { DefinirEscalaDto } from "./dto/definir-escala.dto";
import type { EscalaResponseDto } from "./dto/escala-response.dto";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";

import { PrismaService } from "@/infra/database/prisma.service";

/** A escala já com rota, veículo e pessoas carregadas — é sempre assim que ela é lida. */
const INCLUDE_COMPLETO = {
  route: { select: { nome: true, turno: true } },
  veiculo: { select: { numeroFrota: true, placa: true } },
  motorista: { select: { nome: true } },
  monitor: { select: { nome: true } },
} as const;

/**
 * Escala do dia — quem faz qual rota, com qual ônibus, em cada data
 * (pedido do usuário 24/09/2026).
 *
 * ## Os quatro casos que o usuário pediu, e como cada um cai aqui
 *
 * O pedido foi explícito sobre flexibilidade: "se o despachante quiser
 * trocar o veículo da rota, poderá a qualquer momento. Se ele quiser
 * colocar um veículo fixo por rota, também poderá. Se quiser colocar o
 * motorista fixo por rota, também poderá. Se quiser colocar motorista
 * rotativo ou trocar sempre de rota, também poderá."
 *
 * | O que o despachante quer | Onde isso vive |
 * |---|---|
 * | Ônibus fixo por rota | `Route.veiculoPadraoId` — sem escala nenhuma |
 * | Motorista fixo por rota | `Route.motoristaPadraoId` — idem |
 * | Rotativo, muda por dia | **Escala** (esta tabela) |
 * | Trocar a viagem de HOJE que já saiu | `TripsService.substituirVeiculo` |
 *
 * Os quatro convivem sem se atropelar porque a precedência é clara:
 * **escala do dia vence o padrão da rota; viagem já aberta vence os
 * dois** (mexer numa viagem em andamento é outro gesto, com outro
 * botão, e notifica os responsáveis).
 */
@Injectable()
export class RouteAssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Cria ou atualiza a escala de uma rota num dia.
   *
   * É `upsert` por `[routeId, data]`, e isso é o desenho, não um
   * atalho: designar de novo a mesma rota no mesmo dia é EDITAR, que é
   * exatamente o que o despachante faz quando o motorista falta às 5h
   * da manhã. Criar uma segunda escala deixaria duas intenções
   * conflitantes para o mesmo dia, e o rastreador teria de adivinhar
   * qual vale.
   */
  async definir(dto: DefinirEscalaDto, actor: AuthenticatedUser): Promise<EscalaResponseDto> {
    const companyId = this.exigirTenant(actor);
    const data = this.diaSemHora(dto.data);

    // A rota tem de ser desta empresa. Sem esta checagem, um `routeId`
    // de outra transportadora criaria uma escala no tenant errado — e a
    // RLS não pegaria, porque o `companyId` gravado seria o do ator.
    const rota = await this.prisma.withTenant(
      this.prisma.route.findFirst({
        where: { id: dto.routeId, companyId, deletedAt: null },
        select: { id: true },
      }),
    );
    if (!rota) {
      throw new BadRequestException("Rota não encontrada nesta transportadora.");
    }

    const veiculo = await this.prisma.withTenant(
      this.prisma.vehicle.findFirst({
        where: { id: dto.veiculoId, companyId, deletedAt: null },
        select: { id: true },
      }),
    );
    if (!veiculo) {
      throw new BadRequestException("Ônibus não encontrado nesta transportadora.");
    }

    // O mesmo ônibus não pode estar em duas rotas no mesmo dia se elas
    // se sobrepõem — mas rotas de turnos diferentes são justamente o
    // caso normal (manhã e tarde). Então o que se checa aqui é só o
    // conflito ÓBVIO: mesma rota já tem escala, o que o upsert resolve;
    // e o mesmo ônibus na MESMA rota, que é o próprio registro.
    const escala = await this.prisma.withTenant(
      this.prisma.routeAssignment.upsert({
        where: { routeId_data: { routeId: dto.routeId, data } },
        create: {
          companyId,
          routeId: dto.routeId,
          data,
          veiculoId: dto.veiculoId,
          motoristaId: dto.motoristaId,
          monitorId: dto.monitorId ?? null,
          observacao: dto.observacao?.trim() || null,
          criadoPorId: actor.sub,
        },
        update: {
          veiculoId: dto.veiculoId,
          motoristaId: dto.motoristaId,
          monitorId: dto.monitorId ?? null,
          observacao: dto.observacao?.trim() || null,
        },
        include: INCLUDE_COMPLETO,
      }),
    );

    return this.toResponse(escala);
  }

  /** A grade do dia: todas as rotas designadas naquela data. */
  async listarPorDia(dataISO: string, actor: AuthenticatedUser): Promise<EscalaResponseDto[]> {
    this.exigirTenant(actor);
    const data = this.diaSemHora(dataISO);

    const escalas = await this.prisma.withTenant(
      this.prisma.routeAssignment.findMany({
        where: { data },
        include: INCLUDE_COMPLETO,
        orderBy: { route: { nome: "asc" } },
      }),
    );

    return escalas.map((escala) => this.toResponse(escala));
  }

  /**
   * "Qual a minha escala?", do lado do motorista — hoje e os próximos
   * dias.
   *
   * É o que sustenta o pedido do dia 22: "um dia anterior no app
   * aparece para o motorista a rota que ele pegará no dia seguinte,
   * assim ele já vai até o posto de trabalho sabendo dessa rota".
   */
  async minhasEscalas(actor: AuthenticatedUser, dias = 7): Promise<EscalaResponseDto[]> {
    this.exigirTenant(actor);

    const hoje = this.diaSemHora(new Date().toISOString());
    const limite = new Date(hoje);
    limite.setUTCDate(limite.getUTCDate() + dias);

    const escalas = await this.prisma.withTenant(
      this.prisma.routeAssignment.findMany({
        where: {
          data: { gte: hoje, lt: limite },
          // Monitor vê a escala em que ELE é o monitor; motorista, a
          // dele. Ninguém vê a escala dos colegas por esta rota.
          OR: [{ motoristaId: actor.sub }, { monitorId: actor.sub }],
        },
        include: INCLUDE_COMPLETO,
        orderBy: [{ data: "asc" }, { route: { nome: "asc" } }],
      }),
    );

    return escalas.map((escala) => this.toResponse(escala));
  }

  async remover(id: string, actor: AuthenticatedUser): Promise<void> {
    const companyId = this.exigirTenant(actor);
    // `deleteMany` com o `companyId` junto do id: uma escala de outra
    // empresa simplesmente não apaga nada, em vez de apagar a errada.
    await this.prisma.withTenant(
      this.prisma.routeAssignment.deleteMany({ where: { id, companyId } }),
    );
  }

  private exigirTenant(actor: AuthenticatedUser): string {
    if (!actor.tenantId) {
      throw new ForbiddenException("Esta operação exige uma transportadora.");
    }
    return actor.tenantId;
  }

  /**
   * `data` é `@db.Date` (sem hora). Converter com `new Date("2026-09-25")`
   * já dá meia-noite UTC — mas passar um ISO completo com hora gravaria
   * o dia errado para quem está em UTC-3 depois das 21h. Truncar aqui
   * evita que a escala de amanhã vire a de hoje dependendo da hora em
   * que o despachante clicou.
   */
  private diaSemHora(iso: string): Date {
    const data = new Date(iso);
    if (Number.isNaN(data.getTime())) {
      throw new BadRequestException("Data inválida.");
    }
    return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), data.getUTCDate()));
  }

  private toResponse(escala: {
    id: string;
    data: Date;
    routeId: string;
    veiculoId: string;
    motoristaId: string;
    monitorId: string | null;
    observacao: string | null;
    route: { nome: string; turno: string };
    veiculo: { numeroFrota: string | null; placa: string };
    motorista: { nome: string };
    monitor: { nome: string } | null;
  }): EscalaResponseDto {
    return {
      id: escala.id,
      data: escala.data.toISOString().slice(0, 10),
      routeId: escala.routeId,
      rotaNome: escala.route.nome,
      rotaTurno: escala.route.turno,
      veiculoId: escala.veiculoId,
      // Mesma regra do Painel do Despachante: número primeiro, placa
      // como alternativa. Os dois públicos nunca veem rótulos
      // diferentes do mesmo carro.
      veiculoIdentificacao: escala.veiculo.numeroFrota ?? escala.veiculo.placa,
      motoristaId: escala.motoristaId,
      motoristaNome: escala.motorista.nome,
      monitorId: escala.monitorId,
      monitorNome: escala.monitor?.nome ?? null,
      observacao: escala.observacao,
    };
  }
}
