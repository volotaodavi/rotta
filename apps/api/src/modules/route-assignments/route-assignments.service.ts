import { BadRequestException, ForbiddenException, Inject, Injectable } from "@nestjs/common";

import { ROUTE_ASSIGNMENT_REPOSITORY } from "./route-assignments.constants";

import type { DefinirEscalaDto } from "./dto/definir-escala.dto";
import type { EscalaResponseDto } from "./dto/escala-response.dto";
import type {
  EscalaCompleta,
  RouteAssignmentRepository,
} from "./repositories/route-assignment.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { RouteRepository } from "@/modules/routes/repositories/route.repository";
import type { VehicleRepository } from "@/modules/vehicles/repositories/vehicle.repository";

import { ROUTE_REPOSITORY } from "@/modules/routes/routes.constants";
import { VEHICLE_REPOSITORY } from "@/modules/vehicles/vehicles.constants";

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
  constructor(
    @Inject(ROUTE_ASSIGNMENT_REPOSITORY)
    private readonly escalas: RouteAssignmentRepository,
    @Inject(ROUTE_REPOSITORY) private readonly routes: RouteRepository,
    @Inject(VEHICLE_REPOSITORY) private readonly vehicles: VehicleRepository,
  ) {}

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

    // A rota e o ônibus têm de ser DESTA empresa. `findById` já roda
    // sob `withTenant`, então a RLS sozinha bastaria — a comparação
    // explícita de `companyId` logo abaixo é defesa em profundidade
    // (Dossiê 8, Seção 1.2), a mesma que existia antes desta consulta
    // virar repositório. Sem ela, um `routeId` de outra transportadora
    // criaria uma escala no tenant errado com o `companyId` do ator.
    const rota = await this.routes.findById(dto.routeId);
    if (!rota || rota.companyId !== companyId) {
      throw new BadRequestException("Rota não encontrada nesta transportadora.");
    }

    const veiculo = await this.vehicles.findById(dto.veiculoId);
    if (!veiculo || veiculo.companyId !== companyId) {
      throw new BadRequestException("Ônibus não encontrado nesta transportadora.");
    }

    // O mesmo ônibus não pode estar em duas rotas no mesmo dia se elas
    // se sobrepõem — mas rotas de turnos diferentes são justamente o
    // caso normal (manhã e tarde). Então o que se checa aqui é só o
    // conflito ÓBVIO: mesma rota já tem escala, o que o upsert resolve;
    // e o mesmo ônibus na MESMA rota, que é o próprio registro.
    const escala = await this.escalas.definir({
      companyId,
      routeId: dto.routeId,
      data,
      veiculoId: dto.veiculoId,
      motoristaId: dto.motoristaId,
      monitorId: dto.monitorId ?? null,
      observacao: dto.observacao?.trim() || null,
      criadoPorId: actor.sub,
    });

    return this.toResponse(escala);
  }

  /** A grade do dia: todas as rotas designadas naquela data. */
  async listarPorDia(dataISO: string, actor: AuthenticatedUser): Promise<EscalaResponseDto[]> {
    this.exigirTenant(actor);
    const data = this.diaSemHora(dataISO);

    const escalas = await this.escalas.listByData(data);

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

    // Ninguém vê a escala dos colegas por esta rota — o filtro por
    // pessoa é contrato do repositório.
    const escalas = await this.escalas.listDaPessoaNoPeriodo(actor.sub, hoje, limite);

    return escalas.map((escala) => this.toResponse(escala));
  }

  async remover(id: string, actor: AuthenticatedUser): Promise<void> {
    const companyId = this.exigirTenant(actor);
    // Os dois ids juntos: uma escala de outra empresa simplesmente não
    // apaga nada, em vez de apagar a errada (ver o repositório).
    await this.escalas.deleteByIdAndCompany(id, companyId);
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

  private toResponse(escala: EscalaCompleta): EscalaResponseDto {
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
