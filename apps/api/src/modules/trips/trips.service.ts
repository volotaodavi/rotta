import { randomBytes } from "node:crypto";

import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotificationEventType, Prisma, type Trip } from "@prisma/client";

import { toMapVehicleResponseDto } from "./mappers/map-vehicle.mapper";
import { toTripPositionResponseDto } from "./mappers/trip-position.mapper";
import { toTripStudentEventResponseDto } from "./mappers/trip-student-event.mapper";
import { toListTripsResponseDto, toTripResponseDto } from "./mappers/trip.mapper";
import {
  TRIP_POSITION_REPOSITORY,
  TRIP_REPOSITORY,
  TRIP_STUDENT_EVENT_REPOSITORY,
} from "./trips.constants";

import type { CreateTripStudentEventDto } from "./dto/create-trip-student-event.dto";
import type { IngestPositionDto, IngestPositionsBatchDto } from "./dto/ingest-position.dto";
import type { MapVehicleResponseDto } from "./dto/map-vehicle-response.dto";
import type { NextEtaResponseDto } from "./dto/next-eta-response.dto";
import type { StartTripDto } from "./dto/start-trip.dto";
import type { StudentAttendanceTodayResponseDto } from "./dto/student-attendance-today-response.dto";
import type { SubstituirMonitorDto } from "./dto/substituir-monitor.dto";
import type { SubstituirMotoristaDto } from "./dto/substituir-motorista.dto";
import type { SubstituirVeiculoDto } from "./dto/substituir-veiculo.dto";
import type { TripPositionResponseDto } from "./dto/trip-position-response.dto";
import type { ListTripsResponseDto, TripResponseDto } from "./dto/trip-response.dto";
import type { TripStudentEventResponseDto } from "./dto/trip-student-event-response.dto";
import type { TripPositionRepository } from "./repositories/trip-position.repository";
import type { TripStudentEventRepository } from "./repositories/trip-student-event.repository";
import type { CreateTripData, TripRepository } from "./repositories/trip.repository";
import type { RouteStopResponseDto } from "../routes/dto/route-stop-response.dto";
import type { RouteStudentResponseDto } from "../routes/dto/route-student-response.dto";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";

import { AuditLogService } from "@/modules/audit/audit-log.service";
import { CompaniesService } from "@/modules/companies/companies.service";
import { GeoEngineService } from "@/modules/geo/geo-engine.service";
import { ContractsService } from "@/modules/marketplace/contracts.service";
import { COMMUNICATION_REQUESTED_EVENT } from "@/modules/notifications/events/communication-requested.event";
import { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import { RoutesService } from "@/modules/routes/routes.service";
import { StudentsService } from "@/modules/students/students.service";
import { UsersService } from "@/modules/users/users.service";
import { VehiclesService } from "@/modules/vehicles/vehicles.service";
import { Role } from "@/shared/enums";
import { haversineDistanceKm } from "@/shared/utils/geo.util";

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

/** Início do dia corrente em UTC — `Trip.data` é `@db.Date` (sem hora), então a hora local do servidor não deve vazar para a chave de unicidade `[routeId, data]`. */
function today(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/**
 * Raio de geofencing "veículo se aproximando" (Prompt "Rotta Geo
 * Platform" §25 — "VEHICLE_APPROACHING... utilizar tolerância
 * geográfica"). 400m é conservador o bastante para não disparar em
 * ruas paralelas/quadras vizinhas na maioria das cidades brasileiras,
 * mas ainda dar alguns minutos de aviso ao responsável — sem dado de
 * uso real ainda para calibrar por cidade/velocidade, um valor único e
 * documentado é preferível a fingir uma calibração que não existe.
 */
const GEOFENCE_APPROACHING_METERS = 400;

/**
 * Código único e legível da viagem (pedido do usuário: "o código da
 * viagem - único") — mesmo alfabeto/tamanho/mecanismo de retry já
 * usado em `InvitesService.generateCode` (sem `0`/`O`/`1`/`I`, fáceis de
 * confundir ditando por telefone), reaproveitado aqui em vez de
 * reinventado.
 */
const TRIP_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const TRIP_CODE_LENGTH = 6;
const MAX_TRIP_CODE_GENERATION_ATTEMPTS = 5;

/**
 * Núcleo de negócio do módulo Trips (GPS-01/02/03/06 + EMB-01/05 +
 * DESEMB-01/03, Dossiê 13 Seção 11 / Especificação Funcional Parte 4) —
 * execução concreta de uma rota em um dia: abrir/encerrar viagem,
 * ingestão de posição GPS e checklist manual de embarque/desembarque.
 *
 * ESCOPO DESTA ENTREGA: ciclo de vida da viagem, ingestão de posição
 * (unitária e em lote — a fila OFFLINE em si, GPS-04, é um recurso do
 * APP MOBILE que ainda não existe; este backend já aceita lotes
 * atrasados via `capturadaEm` explícito, então o cliente mobile poderá
 * consumir este mesmo endpoint quando for implementado), checklist
 * manual EMBARCOU/AUSENTE/DESEMBARCOU e substituição PONTUAL ("só hoje")
 * de motorista/veículo/monitor de uma viagem EM_ANDAMENTO
 * (`substituirMotorista`/`substituirVeiculo`/`substituirMonitor`, tarefa
 * #102) — grava só nas colunas da própria `Trip`, nunca no padrão da
 * `Route` (esse fluxo é `RoutesService.update`), e reaproveita
 * `RoutesService.notifyActiveStudents`/`assertVeiculoCapacidade` em vez
 * de duplicar a lógica de notificação/validação de capacidade, e
 * recálculo de ETA por ausência de aluno (`recalcularProximasEtas`,
 * tarefa #99) — quando um aluno é marcado AUSENTE, a parada dele sai da
 * lista de pendências e o `GeoEngineService` (única porta de saída para
 * o OSRM) recalcula o trajeto a partir da última posição GPS conhecida
 * até as paradas que ainda faltam, notificando os responsáveis da
 * PRÓXIMA parada com o novo horário estimado (reaproveita
 * `MessagePersonalizationService.veiculoProximo`, que já existia mas
 * nunca tinha um chamador real). FORA DE ESCOPO (documentado, não
 * omitido): reotimizar a ORDEM das paradas (`RottaAiService.
 * suggestRouteOptimization`, ROT-08, stub honesto — problema diferente
 * de só recalcular tempo/distância do trajeto já definido) e
 * `OCORRENCIA`/`EMERGENCIA` (já cobertas por `VehicleOccurrence`, módulo
 * Vehicles).
 */
@Injectable()
export class TripsService {
  private readonly logger = new Logger(TripsService.name);

  constructor(
    @Inject(TRIP_REPOSITORY) private readonly tripRepository: TripRepository,
    @Inject(TRIP_POSITION_REPOSITORY) private readonly positionRepository: TripPositionRepository,
    @Inject(TRIP_STUDENT_EVENT_REPOSITORY)
    private readonly studentEventRepository: TripStudentEventRepository,
    private readonly routesService: RoutesService,
    private readonly vehiclesService: VehiclesService,
    private readonly contractsService: ContractsService,
    private readonly studentsService: StudentsService,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
    private readonly eventEmitter: EventEmitter2,
    private readonly messagePersonalizationService: MessagePersonalizationService,
    private readonly geoEngineService: GeoEngineService,
    private readonly companiesService: CompaniesService,
  ) {}

  // ---------------------------------------------------------------------
  // Helpers privados
  // ---------------------------------------------------------------------

  private async recordAudit(input: {
    companyId: string;
    entidadeId: string;
    acao: string;
    atorUserId: string;
    dadosAntes?: Record<string, unknown>;
    dadosDepois?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.auditLogService.record({ ...input, entidadeTipo: "Trip" });
    } catch (error) {
      this.logger.warn(
        `Falha ao registrar auditoria (Trip ${input.entidadeId}, ação ${input.acao})`,
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }

  /** Mesmo alfabeto/`randomBytes` de `InvitesService.generateCode` — nunca reinventado. */
  private generateTripCode(): string {
    const bytes = randomBytes(TRIP_CODE_LENGTH);
    let code = "";
    for (let i = 0; i < TRIP_CODE_LENGTH; i++) {
      code += TRIP_CODE_ALPHABET[bytes[i]! % TRIP_CODE_ALPHABET.length];
    }
    return code;
  }

  /**
   * Gera o `codigo` único da viagem e só então insere — mesmo padrão de
   * retry-em-colisão de `InvitesService.create` (a chance real de duas
   * tentativas colidirem em 32^6 combinações é desprezível, mas o
   * `@unique` do schema é a garantia de verdade, nunca só a
   * probabilidade).
   */
  private async createTripWithUniqueCode(data: Omit<CreateTripData, "codigo">): Promise<Trip> {
    for (let attempt = 0; attempt < MAX_TRIP_CODE_GENERATION_ATTEMPTS; attempt++) {
      try {
        return await this.tripRepository.create({ ...data, codigo: this.generateTripCode() });
      } catch (error) {
        const isUniqueViolation =
          error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
        if (!isUniqueViolation || attempt === MAX_TRIP_CODE_GENERATION_ATTEMPTS - 1) {
          throw error;
        }
      }
    }
    throw new Error("Não foi possível gerar um código único de viagem.");
  }

  /** 404 (não 403) fora do escopo — mesmo princípio de não-enumeração usado no resto do backend. */
  private async fetchOrThrow(id: string, actor: AuthenticatedUser): Promise<Trip> {
    const trip = await this.tripRepository.findById(id);
    if (!trip || (actor.role !== Role.ADMIN_ROTTA && trip.companyId !== actor.tenantId)) {
      throw new NotFoundException("Viagem não encontrada.");
    }
    if (
      (actor.role === Role.MOTORISTA && trip.motoristaId !== actor.sub) ||
      (actor.role === Role.MONITOR && trip.monitorId !== actor.sub)
    ) {
      throw new NotFoundException("Viagem não encontrada.");
    }
    return trip;
  }

  private assertCanOperateTrip(trip: Trip, actor: AuthenticatedUser): void {
    const isManager =
      actor.role === Role.ADMIN_ROTTA || actor.role === Role.EMPRESA || actor.role === Role.GESTOR;
    const isDriver = actor.role === Role.MOTORISTA && trip.motoristaId === actor.sub;
    const isMonitor = actor.role === Role.MONITOR && trip.monitorId === actor.sub;
    if (!isManager && !isDriver && !isMonitor) {
      throw new ForbiddenException("Você não pode operar esta viagem.");
    }
  }

  /** "A viagem de {nomeAluno} começou/terminou" — um evento por aluno ATIVO na rota. */
  private async notifyActiveStudentsOfRoute(
    routeId: string,
    actor: AuthenticatedUser,
    eventType: NotificationEventType,
    build: (nomeResponsavel: string, nomeAluno: string) => { titulo: string; corpo: string },
  ): Promise<void> {
    const vinculos = await this.routesService.listStudents(routeId, actor);
    for (const vinculo of vinculos) {
      try {
        const [contract, student] = await Promise.all([
          this.contractsService.findRawByIdOrThrow(vinculo.contractId, actor),
          this.studentsService.findRawById(vinculo.studentId),
        ]);
        if (!student) continue;
        const responsavel = await this.usersService.findById(contract.responsavelId);
        if (!responsavel) continue;
        const message = build(responsavel.nome, student.nome);
        this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
          userId: contract.responsavelId,
          companyId: contract.companyId,
          tipo: eventType,
          titulo: message.titulo,
          corpo: message.corpo,
          dadosContexto: { routeId, studentId: vinculo.studentId },
        });
      } catch (error) {
        this.logger.warn(
          `Falha ao notificar responsável do vínculo ${vinculo.id} sobre ${eventType}.`,
        );
        this.logger.warn(error instanceof Error ? error.message : String(error));
      }
    }
  }

  // ---------------------------------------------------------------------
  // Ciclo de vida da viagem (GPS-01)
  // ---------------------------------------------------------------------

  async start(
    dto: StartTripDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<TripResponseDto> {
    const route = await this.routesService.findByIdOrThrow(dto.routeId, actor);
    if (route.status !== "ATIVA") {
      throw new BadRequestException("Só é possível iniciar viagem de uma rota ATIVA.");
    }

    const motoristaId =
      actor.role === Role.MOTORISTA ? actor.sub : (dto.motoristaId ?? route.motoristaPadraoId);
    if (!motoristaId) {
      throw new BadRequestException("Informe motoristaId (rota sem motorista padrão).");
    }
    if (actor.role !== Role.MOTORISTA) {
      const membership = await this.usersService.findActiveMembership(motoristaId, route.companyId);
      // Dono AUTONOMO/MEI é o próprio motorista (`Membership.role =
      // EMPRESA`, nunca `MOTORISTA` — mesmo achado de sempre) — mesma
      // exceção já aplicada em `RoutesService.assertValidDefaultResources`
      // ao validar `motoristaPadraoId` na criação da rota. Faltava aqui,
      // em `start`, causando exatamente o bug relatado: a rota já é
      // criada corretamente com o dono como motorista padrão, mas
      // iniciar a viagem sempre rejeitava com "motoristaId não possui
      // vínculo ativo de Motorista nesta empresa".
      const isSelfAsOwnerDriver =
        (membership?.role as Role | undefined) === Role.EMPRESA &&
        motoristaId === actor.sub &&
        (await this.usersService.isAutonomoOuMei(actor.sub, route.companyId));
      if (!membership || ((membership.role as Role) !== Role.MOTORISTA && !isSelfAsOwnerDriver)) {
        throw new BadRequestException(
          "motoristaId não possui vínculo ativo de Motorista nesta empresa.",
        );
      }
    }

    const veiculoId = dto.veiculoId ?? route.veiculoPadraoId;
    if (!veiculoId) {
      throw new BadRequestException("Informe veiculoId (rota sem veículo padrão).");
    }
    // Valida que o veículo pertence à empresa e é acessível ao ator
    // (para Motorista, restrito ao veículo atualmente vinculado a ele —
    // mesma regra de `VehiclesService.fetchOrThrow`).
    await this.vehiclesService.findByIdOrThrow(veiculoId, actor);

    const monitorId = dto.monitorId ?? route.monitorPadraoId ?? undefined;
    if (monitorId) {
      const membership = await this.usersService.findActiveMembership(monitorId, route.companyId);
      if (!membership || (membership.role as Role) !== Role.MONITOR) {
        throw new BadRequestException(
          "monitorId não possui vínculo ativo de Monitor nesta empresa.",
        );
      }
    }

    const data = today();
    const existing = await this.tripRepository.findByRouteAndDate(dto.routeId, data);
    // Pedido do usuário: "rotas não são feitas para ser finalizadas
    // concretamente... são finalizadas temporariamente até o
    // transportador acionar de novo" — só bloqueia se já houver uma
    // viagem ATIVA agora mesmo pra esta rota; uma já finalizada/
    // cancelada nunca impede iniciar outra no mesmo dia (ida de manhã,
    // volta à tarde, por exemplo).
    if (existing && (existing.status === "EM_ANDAMENTO" || existing.status === "PAUSADA")) {
      throw new ConflictException("Já existe uma viagem em andamento para esta rota hoje.");
    }

    const trip = await this.createTripWithUniqueCode({
      companyId: route.companyId,
      routeId: dto.routeId,
      data,
      veiculoId,
      motoristaId,
      monitorId,
    });

    await this.vehiclesService.setCurrentTrip(veiculoId, trip.id);

    await this.recordAudit({
      companyId: route.companyId,
      entidadeId: trip.id,
      acao: "STARTED",
      atorUserId: actor.sub,
      dadosDepois: { routeId: dto.routeId, veiculoId, motoristaId },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    // "A van está em serviço" (texto literal pedido pelo usuário) vale
    // pra TODOS os responsáveis da rota, sempre com o mesmo texto — por
    // isso ignora `nomeResponsavel`/`nomeAluno` do build padrão e fecha
    // sobre `nomeTransportador` já resolvido uma vez antes do loop.
    const nomeTransportador =
      (await this.companiesService.getNomeFantasia(route.companyId)) ?? "sua transportadora";
    await this.notifyActiveStudentsOfRoute(
      dto.routeId,
      actor,
      NotificationEventType.VIAGEM_INICIADA,
      () => this.messagePersonalizationService.viagemIniciada(nomeTransportador),
    );

    await this.notificarVezDoAlunoBestEffort(trip, actor);

    return toTripResponseDto(trip);
  }

  async finish(id: string, actor: AuthenticatedUser, meta: RequestMeta): Promise<TripResponseDto> {
    const trip = await this.fetchOrThrow(id, actor);
    this.assertCanOperateTrip(trip, actor);
    if (trip.status !== "EM_ANDAMENTO") {
      throw new BadRequestException("Esta viagem não está em andamento.");
    }

    const updated = await this.tripRepository.update(id, {
      status: "FINALIZADA",
      finalizadaEm: new Date(),
    });
    await this.vehiclesService.setCurrentTrip(trip.veiculoId, null);

    await this.recordAudit({
      companyId: trip.companyId,
      entidadeId: id,
      acao: "FINISHED",
      atorUserId: actor.sub,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    await this.notifyActiveStudentsOfRoute(
      trip.routeId,
      actor,
      NotificationEventType.VIAGEM_ENCERRADA,
      (nomeResponsavel, nomeAluno) =>
        this.messagePersonalizationService.viagemEncerrada(nomeResponsavel, nomeAluno),
    );

    return toTripResponseDto(updated);
  }

  /**
   * Prompt Mestre da Rotta, Seção 8 ("PAUSADO" é um estado real, não um
   * apelido de EM_ANDAMENTO): interrompe o envio de posição/checklist
   * sem encerrar a viagem — o motorista retoma depois de onde parou
   * (`resume`), nunca precisa reiniciar. Mesmas regras de quem pode
   * operar de `finish`/`cancel` (`assertCanOperateTrip`).
   */
  async pause(id: string, actor: AuthenticatedUser, meta: RequestMeta): Promise<TripResponseDto> {
    const trip = await this.fetchOrThrow(id, actor);
    this.assertCanOperateTrip(trip, actor);
    if (trip.status !== "EM_ANDAMENTO") {
      throw new BadRequestException("Esta viagem não está em andamento.");
    }

    const updated = await this.tripRepository.update(id, {
      status: "PAUSADA",
      pausadaEm: new Date(),
    });

    await this.recordAudit({
      companyId: trip.companyId,
      entidadeId: id,
      acao: "PAUSED",
      atorUserId: actor.sub,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toTripResponseDto(updated);
  }

  async resume(id: string, actor: AuthenticatedUser, meta: RequestMeta): Promise<TripResponseDto> {
    const trip = await this.fetchOrThrow(id, actor);
    this.assertCanOperateTrip(trip, actor);
    if (trip.status !== "PAUSADA") {
      throw new BadRequestException("Esta viagem não está pausada.");
    }

    const updated = await this.tripRepository.update(id, {
      status: "EM_ANDAMENTO",
      pausadaEm: null,
    });

    await this.recordAudit({
      companyId: trip.companyId,
      entidadeId: id,
      acao: "RESUMED",
      atorUserId: actor.sub,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toTripResponseDto(updated);
  }

  /**
   * "Existe viagem hoje para esta rota?" (qualquer status) — o app do
   * Motorista usa isto para decidir entre mostrar "Iniciar viagem" ou
   * retomar o acompanhamento de uma viagem já criada, sem precisar
   * tentar `start` só para descobrir pelo 409 (`ConflictException`).
   * `null` quando nenhuma viagem foi registrada hoje ainda.
   */
  async findTodayByRoute(
    routeId: string,
    actor: AuthenticatedUser,
  ): Promise<TripResponseDto | null> {
    // Valida acesso à rota (RBAC/tenant) antes de expor a viagem dela.
    await this.routesService.findByIdOrThrow(routeId, actor);
    const trip = await this.tripRepository.findByRouteAndDate(routeId, today());
    return trip ? toTripResponseDto(trip) : null;
  }

  async cancel(id: string, actor: AuthenticatedUser, meta: RequestMeta): Promise<TripResponseDto> {
    const trip = await this.fetchOrThrow(id, actor);
    this.assertCanOperateTrip(trip, actor);
    if (trip.status !== "EM_ANDAMENTO") {
      throw new BadRequestException("Esta viagem não está em andamento.");
    }

    const updated = await this.tripRepository.update(id, {
      status: "CANCELADA",
      canceladaEm: new Date(),
    });
    await this.vehiclesService.setCurrentTrip(trip.veiculoId, null);

    await this.recordAudit({
      companyId: trip.companyId,
      entidadeId: id,
      acao: "CANCELLED",
      atorUserId: actor.sub,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toTripResponseDto(updated);
  }

  // ---------------------------------------------------------------------
  // Substituição pontual do dia (ROT-05/06, tarefa #102)
  // ---------------------------------------------------------------------

  /**
   * Só quem gerencia (Admin Rotta/Empresa/Gestor) decide uma substituição
   * — nunca o próprio Motorista/Monitor, mesmo que operem a viagem
   * (`assertCanOperateTrip` é sobre GPS/checklist, não sobre trocar quem
   * está na viagem). Só é permitida com a viagem EM_ANDAMENTO: uma
   * viagem que ainda não começou é resolvida por `start` (que já aceita
   * `motoristaId`/`veiculoId`/`monitorId` explícitos), e uma já
   * finalizada/cancelada não tem mais o que substituir.
   */
  private assertCanManageTrip(trip: Trip, actor: AuthenticatedUser): void {
    const isManager =
      actor.role === Role.ADMIN_ROTTA || actor.role === Role.EMPRESA || actor.role === Role.GESTOR;
    if (!isManager) {
      throw new ForbiddenException("Você não pode alterar motorista/veículo/monitor desta viagem.");
    }
    if (trip.status !== "EM_ANDAMENTO") {
      throw new BadRequestException(
        "Só é possível substituir motorista/veículo/monitor de uma viagem em andamento.",
      );
    }
  }

  async substituirMotorista(
    id: string,
    dto: SubstituirMotoristaDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<TripResponseDto> {
    const trip = await this.fetchOrThrow(id, actor);
    this.assertCanManageTrip(trip, actor);

    if (dto.motoristaId === trip.motoristaId) {
      return toTripResponseDto(trip);
    }

    const membership = await this.usersService.findActiveMembership(
      dto.motoristaId,
      trip.companyId,
    );
    // Mesma exceção de `start` acima: o dono AUTONOMO/MEI pode ser
    // colocado de volta como motorista da própria viagem mesmo com
    // `Membership.role = EMPRESA`.
    const isSelfAsOwnerDriver =
      (membership?.role as Role | undefined) === Role.EMPRESA &&
      dto.motoristaId === actor.sub &&
      (await this.usersService.isAutonomoOuMei(actor.sub, trip.companyId));
    if (!membership || ((membership.role as Role) !== Role.MOTORISTA && !isSelfAsOwnerDriver)) {
      throw new BadRequestException(
        "motoristaId não possui vínculo ativo de Motorista nesta empresa.",
      );
    }

    const updated = await this.tripRepository.update(id, { motoristaId: dto.motoristaId });

    await this.recordAudit({
      companyId: trip.companyId,
      entidadeId: id,
      acao: "MOTORISTA_SUBSTITUIDO",
      atorUserId: actor.sub,
      dadosDepois: { motoristaId: dto.motoristaId, motivo: dto.motivo },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const motorista = await this.usersService.findById(dto.motoristaId);
    if (motorista) {
      await this.routesService.notifyActiveStudents(
        trip.routeId,
        (nomeAluno) =>
          this.messagePersonalizationService.motoristaAlterado(nomeAluno, motorista.nome),
        NotificationEventType.MOTORISTA_ALTERADO,
        actor,
      );
    }

    return toTripResponseDto(updated);
  }

  async substituirVeiculo(
    id: string,
    dto: SubstituirVeiculoDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<TripResponseDto> {
    const trip = await this.fetchOrThrow(id, actor);
    this.assertCanManageTrip(trip, actor);

    if (dto.veiculoId === trip.veiculoId) {
      return toTripResponseDto(trip);
    }

    // Mesma checagem de capacidade (RN-CAP-01) usada pela substituição
    // PERMANENTE — `routeId` garante que a validação conta os alunos
    // realmente vinculados à rota desta viagem.
    await this.routesService.assertVeiculoCapacidade(dto.veiculoId, actor, trip.routeId);

    const previousVeiculoId = trip.veiculoId;
    const updated = await this.tripRepository.update(id, { veiculoId: dto.veiculoId });

    // O veículo anterior deixa de estar "em viagem"; o novo passa a estar.
    await this.vehiclesService.setCurrentTrip(previousVeiculoId, null);
    await this.vehiclesService.setCurrentTrip(dto.veiculoId, id);

    await this.recordAudit({
      companyId: trip.companyId,
      entidadeId: id,
      acao: "VEICULO_SUBSTITUIDO",
      atorUserId: actor.sub,
      dadosAntes: { veiculoId: previousVeiculoId },
      dadosDepois: { veiculoId: dto.veiculoId, motivo: dto.motivo },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    const veiculo = await this.vehiclesService.findByIdOrThrow(dto.veiculoId, actor);
    await this.routesService.notifyActiveStudents(
      trip.routeId,
      (nomeAluno) => this.messagePersonalizationService.veiculoAlterado(nomeAluno, veiculo.placa),
      NotificationEventType.VEICULO_ALTERADO,
      actor,
    );

    return toTripResponseDto(updated);
  }

  async substituirMonitor(
    id: string,
    dto: SubstituirMonitorDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<TripResponseDto> {
    const trip = await this.fetchOrThrow(id, actor);
    this.assertCanManageTrip(trip, actor);

    const monitorId = dto.monitorId ?? null;
    if (monitorId === trip.monitorId) {
      return toTripResponseDto(trip);
    }

    if (monitorId) {
      const membership = await this.usersService.findActiveMembership(monitorId, trip.companyId);
      if (!membership || (membership.role as Role) !== Role.MONITOR) {
        throw new BadRequestException(
          "monitorId não possui vínculo ativo de Monitor nesta empresa.",
        );
      }
    }

    const updated = await this.tripRepository.update(id, { monitorId });

    await this.recordAudit({
      companyId: trip.companyId,
      entidadeId: id,
      acao: "MONITOR_SUBSTITUIDO",
      atorUserId: actor.sub,
      dadosAntes: { monitorId: trip.monitorId },
      dadosDepois: { monitorId, motivo: dto.motivo },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    if (monitorId) {
      const monitor = await this.usersService.findById(monitorId);
      if (monitor) {
        await this.routesService.notifyActiveStudents(
          trip.routeId,
          (nomeAluno) =>
            this.messagePersonalizationService.monitorAlterado(nomeAluno, monitor.nome),
          NotificationEventType.MONITOR_ALTERADO,
          actor,
        );
      }
    }

    return toTripResponseDto(updated);
  }

  async findByIdOrThrow(id: string, actor: AuthenticatedUser): Promise<TripResponseDto> {
    const trip = await this.fetchOrThrow(id, actor);
    return toTripResponseDto(trip);
  }

  /** Histórico de viagens de uma rota (mais recentes primeiro). */
  async listByRoute(
    routeId: string,
    actor: AuthenticatedUser,
    page: number,
    pageSize: number,
  ): Promise<ListTripsResponseDto> {
    await this.routesService.findByIdOrThrow(routeId, actor);
    const result = await this.tripRepository.listByRoute(routeId, page, pageSize);
    return toListTripsResponseDto(result, page, pageSize);
  }

  // ---------------------------------------------------------------------
  // Posições GPS (GPS-02/03/06)
  // ---------------------------------------------------------------------

  async ingestPosition(
    tripId: string,
    dto: IngestPositionDto,
    actor: AuthenticatedUser,
  ): Promise<TripPositionResponseDto> {
    const trip = await this.fetchOrThrow(tripId, actor);
    this.assertCanOperateTrip(trip, actor);
    if (trip.status !== "EM_ANDAMENTO") {
      throw new BadRequestException("Só é possível registrar posição de uma viagem em andamento.");
    }

    const capturadaEm = new Date(dto.capturadaEm);
    const position = await this.positionRepository.create({
      tripId,
      companyId: trip.companyId,
      latitude: dto.latitude,
      longitude: dto.longitude,
      precisaoMetros: dto.precisaoMetros,
      velocidadeKmh: dto.velocidadeKmh,
      capturadaEm,
      simuladoSuspeito: dto.simuladoSuspeito,
    });

    await this.vehiclesService.updateLocationFromTrip(trip.veiculoId, {
      latitude: dto.latitude,
      longitude: dto.longitude,
      capturadaEm,
      viagemId: tripId,
    });

    await this.detectarAproximacaoBestEffort(trip, actor, dto.latitude, dto.longitude);

    return toTripPositionResponseDto(position);
  }

  /**
   * Ingestão em lote (GPS-04 — reconciliação da fila offline do app
   * mobile, ainda não implementado no cliente, mas já suportado aqui).
   * Só a posição de MAIOR `capturadaEm` do lote atualiza a última
   * posição conhecida do veículo — as demais só entram no histórico
   * bruto (`TripPosition`, nunca sobrescrito).
   */
  async ingestPositionsBatch(
    tripId: string,
    dto: IngestPositionsBatchDto,
    actor: AuthenticatedUser,
  ): Promise<TripPositionResponseDto[]> {
    const trip = await this.fetchOrThrow(tripId, actor);
    this.assertCanOperateTrip(trip, actor);
    if (trip.status !== "EM_ANDAMENTO") {
      throw new BadRequestException("Só é possível registrar posição de uma viagem em andamento.");
    }

    const positions = await this.positionRepository.createMany(
      dto.posicoes.map((item) => ({
        tripId,
        companyId: trip.companyId,
        latitude: item.latitude,
        longitude: item.longitude,
        precisaoMetros: item.precisaoMetros,
        velocidadeKmh: item.velocidadeKmh,
        capturadaEm: new Date(item.capturadaEm),
        simuladoSuspeito: item.simuladoSuspeito,
      })),
    );

    const latest = positions.reduce((a, b) => (a.capturadaEm > b.capturadaEm ? a : b));
    await this.vehiclesService.updateLocationFromTrip(trip.veiculoId, {
      latitude: Number(latest.latitude),
      longitude: Number(latest.longitude),
      capturadaEm: latest.capturadaEm,
      viagemId: tripId,
    });

    await this.detectarAproximacaoBestEffort(
      trip,
      actor,
      Number(latest.latitude),
      Number(latest.longitude),
    );

    return positions.map(toTripPositionResponseDto);
  }

  async listPositions(
    tripId: string,
    actor: AuthenticatedUser,
  ): Promise<TripPositionResponseDto[]> {
    await this.fetchOrThrow(tripId, actor);
    const positions = await this.positionRepository.listByTrip(tripId);
    return positions.map(toTripPositionResponseDto);
  }

  // ---------------------------------------------------------------------
  // Checklist de embarque/desembarque (EMB-01/05 + DESEMB-01/03)
  // ---------------------------------------------------------------------

  async addStudentEvent(
    tripId: string,
    dto: CreateTripStudentEventDto,
    actor: AuthenticatedUser,
  ): Promise<TripStudentEventResponseDto> {
    const trip = await this.fetchOrThrow(tripId, actor);
    this.assertCanOperateTrip(trip, actor);
    if (trip.status !== "EM_ANDAMENTO") {
      throw new BadRequestException(
        "Só é possível registrar embarque/desembarque de uma viagem em andamento.",
      );
    }
    const vinculos = await this.routesService.listStudents(trip.routeId, actor);
    const vinculo = vinculos.find((v) => v.studentId === dto.studentId);
    if (!vinculo) {
      throw new BadRequestException("Este aluno não está vinculado à rota desta viagem.");
    }

    // `routeStopId` é sempre derivado do vínculo — nunca vem do cliente (ver nota do DTO).
    const routeStopId =
      dto.tipo === "DESEMBARCOU" ? vinculo.paradaDesembarqueId : vinculo.paradaEmbarqueId;

    if (dto.tipo === "DESEMBARCOU") {
      const embarque = await this.studentEventRepository.findByTripStudentAndTipo(
        tripId,
        dto.studentId,
        "EMBARCOU",
      );
      if (!embarque) {
        throw new BadRequestException(
          "Não é possível registrar desembarque sem um embarque prévio nesta viagem.",
        );
      }
    }

    const existing = await this.studentEventRepository.findByTripStudentAndTipo(
      tripId,
      dto.studentId,
      dto.tipo,
    );
    if (existing) {
      throw new ConflictException(
        `Já existe um evento ${dto.tipo} registrado para este aluno nesta viagem.`,
      );
    }

    const event = await this.studentEventRepository.create({
      tripId,
      companyId: trip.companyId,
      studentId: dto.studentId,
      routeStopId,
      tipo: dto.tipo,
      motivoAusencia: dto.motivoAusencia,
      processadoPorId: actor.sub,
    });

    await this.notifyStudentEvent(vinculo.contractId, dto.studentId, dto.tipo, actor);

    if (dto.tipo === "AUSENTE") {
      await this.recalcularEnotificarBestEffort(trip, actor);
    }

    // Qualquer checklist (EMBARCOU/AUSENTE/DESEMBARCOU) muda quem é a
    // próxima parada pendente — reavalia a "vez do aluno" depois de
    // TODO evento, não só de ausência (diferente do recálculo de ETA
    // acima, que só faz sentido reagir a AUSENTE).
    await this.notificarVezDoAlunoBestEffort(trip, actor);

    return toTripStudentEventResponseDto(event);
  }

  private async notifyStudentEvent(
    contractId: string,
    studentId: string,
    tipo: CreateTripStudentEventDto["tipo"],
    actor: AuthenticatedUser,
  ): Promise<void> {
    try {
      const [contract, student] = await Promise.all([
        this.contractsService.findRawByIdOrThrow(contractId, actor),
        this.studentsService.findRawById(studentId),
      ]);
      if (!student) return;

      const message =
        tipo === "EMBARCOU"
          ? this.messagePersonalizationService.alunoEmbarcou(student.nome)
          : tipo === "DESEMBARCOU"
            ? this.messagePersonalizationService.alunoDesembarcou(student.nome)
            : this.messagePersonalizationService.alunoAusente(student.nome);

      const eventType =
        tipo === "EMBARCOU"
          ? NotificationEventType.ALUNO_EMBARCOU
          : tipo === "DESEMBARCOU"
            ? NotificationEventType.ALUNO_DESEMBARCOU
            : NotificationEventType.ALUNO_AUSENTE;

      this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
        userId: contract.responsavelId,
        companyId: contract.companyId,
        tipo: eventType,
        titulo: message.titulo,
        corpo: message.corpo,
        dadosContexto: { studentId },
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao notificar responsável sobre evento ${tipo} do aluno ${studentId}.`,
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }

  async listStudentEvents(
    tripId: string,
    actor: AuthenticatedUser,
  ): Promise<TripStudentEventResponseDto[]> {
    await this.fetchOrThrow(tripId, actor);
    const events = await this.studentEventRepository.listByTrip(tripId);
    return events.map(toTripStudentEventResponseDto);
  }

  // ---------------------------------------------------------------------
  // Recálculo de ETA por ausência de aluno (tarefa #99)
  // ---------------------------------------------------------------------

  /**
   * ETA recalculado para cada parada AINDA PENDENTE hoje, a partir da
   * última posição GPS conhecida do veículo — usado pelo endpoint `GET
   * /trips/:id/proximas-etas` (chamada explícita, sob demanda) e,
   * internamente, pelo disparo automático em `addStudentEvent` (ver
   * `recalcularEnotificarBestEffort` abaixo). Lança se a viagem não
   * estiver em andamento ou se o `GeoEngineService` falhar — quem quiser
   * uma versão que nunca lança usa o método best-effort.
   */
  async recalcularProximasEtas(
    id: string,
    actor: AuthenticatedUser,
  ): Promise<NextEtaResponseDto[]> {
    const trip = await this.fetchOrThrow(id, actor);
    if (trip.status !== "EM_ANDAMENTO") {
      throw new BadRequestException("Só é possível recalcular ETAs de uma viagem em andamento.");
    }
    return this.computeProximasEtas(trip, actor);
  }

  // ---------------------------------------------------------------------
  // Presença do dia (fluxo novo de Rotas — "Frente 1": ao reiniciar a
  // rota pra pegar os alunos NA escola, quem faltou de manhã não deve
  // aparecer como pendente de embarque)
  // ---------------------------------------------------------------------

  /**
   * Para cada `studentId`, diz se ele foi marcado `AUSENTE` HOJE em
   * QUALQUER viagem/rota da MESMA empresa do ator — nunca cross-tenant
   * (o repositório usa `withTenant`, RLS de verdade no Postgres, não só
   * um filtro de aplicação). `actor` não é usado diretamente aqui além
   * de já ter passado pelo `@Roles` do controller — a própria RLS de
   * `withTenant` é quem decide o que é visível, mesmo padrão de
   * `listByTrip`/`create` deste repositório.
   */
  async getStudentsAttendanceToday(
    studentIds: string[],
    _actor: AuthenticatedUser,
  ): Promise<StudentAttendanceTodayResponseDto[]> {
    const ausentesIds = new Set(
      await this.studentEventRepository.listStudentIdsAusenteToday(studentIds, today()),
    );
    return studentIds.map((studentId) => ({
      studentId,
      ausenteHoje: ausentesIds.has(studentId),
    }));
  }

  /**
   * Um item por aluno que ainda não passou por sua próxima etapa hoje:
   * `EMBARQUE` (sem EMBARCOU/AUSENTE registrado) ou `DESEMBARQUE` (com
   * EMBARCOU mas sem DESEMBARCOU — um aluno AUSENTE nunca gera pendência
   * de desembarque). Extraído de `listParadasPendentes` pra ser
   * reaproveitado por `notificarVezDoAlunoBestEffort`, que precisa saber
   * exatamente QUAIS alunos (não só quais paradas) estão pendentes na
   * próxima parada da fila — evita notificar de novo o responsável de um
   * aluno que já embarcou só porque a parada dele coincide com a de
   * outro aluno ainda pendente.
   */
  /**
   * `waypointId` é o identificador EFETIVO da parada pro resto do
   * pipeline (ordenação/ETA/geofencing/"vez do aluno") — normalmente é
   * o próprio `routeStopId`, mas vira um id sintético
   * (`override:{overrideId}`) quando o aluno tem um `StudentAddressOverride`
   * ativo pra data da viagem que se aplica a este `tipo` (`AMBOS` ou o
   * mesmo trecho). `routeStopId` continua sempre o FK permanente (nunca
   * o sintético) — é o que `addStudentEvent` grava em
   * `TripStudentEvent.routeStopId`. Dois alunos na mesma parada física,
   * um com desvio hoje e outro sem, viram dois waypoints distintos —
   * nunca notificam/calculam ETA como se fossem o mesmo ponto.
   */
  private async listPendenciasPorAluno(
    trip: Trip,
    actor: AuthenticatedUser,
  ): Promise<
    Array<{
      vinculo: RouteStudentResponseDto;
      tipo: "EMBARQUE" | "DESEMBARQUE";
      routeStopId: string;
      waypointId: string;
      latitude: number;
      longitude: number;
      endereco: string;
      horarioPrevisto: string;
    }>
  > {
    const [vinculos, eventos, stops] = await Promise.all([
      this.routesService.listStudents(trip.routeId, actor),
      this.studentEventRepository.listByTrip(trip.id),
      this.routesService.listStops(trip.routeId, actor),
    ]);
    const stopsById = new Map(stops.map((stop) => [stop.id, stop]));
    const overridesByStudent = await this.studentsService.listAddressOverridesByStudentsAndDate(
      vinculos.map((v) => v.studentId),
      trip.data,
    );

    const resolverPendencia = (
      vinculo: RouteStudentResponseDto,
      tipo: "EMBARQUE" | "DESEMBARQUE",
      routeStopId: string,
    ) => {
      const stop = stopsById.get(routeStopId);
      const override = overridesByStudent.get(vinculo.studentId);
      const trechoAplica = !!override && (override.trecho === "AMBOS" || override.trecho === tipo);
      if (override && trechoAplica) {
        return {
          vinculo,
          tipo,
          routeStopId,
          waypointId: `override:${override.id}`,
          latitude: override.latitude,
          longitude: override.longitude,
          endereco: `${override.logradouro}, ${override.numero} - ${override.bairro}, ${override.cidade}/${override.estado}`,
          horarioPrevisto: stop?.horarioPrevisto ?? "",
        };
      }
      return {
        vinculo,
        tipo,
        routeStopId,
        waypointId: routeStopId,
        latitude: stop?.latitude ?? 0,
        longitude: stop?.longitude ?? 0,
        endereco: stop?.endereco ?? "",
        horarioPrevisto: stop?.horarioPrevisto ?? "",
      };
    };

    const pendencias: Array<ReturnType<typeof resolverPendencia>> = [];
    for (const vinculo of vinculos) {
      const embarqueOuAusente = eventos.find(
        (e) => e.studentId === vinculo.studentId && (e.tipo === "EMBARCOU" || e.tipo === "AUSENTE"),
      );
      if (!embarqueOuAusente) {
        pendencias.push(resolverPendencia(vinculo, "EMBARQUE", vinculo.paradaEmbarqueId));
        continue;
      }
      if (embarqueOuAusente.tipo === "EMBARCOU") {
        const jaDesembarcou = eventos.some(
          (e) => e.studentId === vinculo.studentId && e.tipo === "DESEMBARCOU",
        );
        if (!jaDesembarcou) {
          pendencias.push(resolverPendencia(vinculo, "DESEMBARQUE", vinculo.paradaDesembarqueId));
        }
      }
    }
    return pendencias;
  }

  /**
   * "Pendente" = tem pelo menos um aluno ativo que ainda não passou por
   * esta parada hoje (ver `listPendenciasPorAluno`). Agrupa por
   * `waypointId` (não mais por `routeStopId` cru): um aluno com desvio
   * de endereço ativo pra hoje vira sua PRÓPRIA entrada sintética,
   * separada da parada física compartilhada — nunca mistura o endereço
   * de hoje dele com o de outro aluno que embarca no mesmo ponto de
   * sempre. Itera `stops` na ordem cadastrada (`RouteStopRepository.
   * listByRoute`) pra preservar a ordem original o quanto der; o desvio
   * dentro do grupo de cada parada segue a ordem de `pendencias`.
   * Compartilhado com o geofencing (`detectarAproximacaoBestEffort`) e
   * com `notificarVezDoAlunoBestEffort`, ambos precisam da mesma
   * "próxima parada pendente" sem o custo de uma chamada OSRM a cada
   * ping de GPS (Prompt "Rotta Geo Platform" §29 — "evitar consultas
   * pesadas").
   */
  private async listParadasPendentes(
    trip: Trip,
    actor: AuthenticatedUser,
  ): Promise<RouteStopResponseDto[]> {
    const [stops, pendencias] = await Promise.all([
      this.routesService.listStops(trip.routeId, actor),
      this.listPendenciasPorAluno(trip, actor),
    ]);

    const pendenciasPorRouteStop = new Map<string, typeof pendencias>();
    for (const pendencia of pendencias) {
      const lista = pendenciasPorRouteStop.get(pendencia.routeStopId) ?? [];
      lista.push(pendencia);
      pendenciasPorRouteStop.set(pendencia.routeStopId, lista);
    }

    const resultado: RouteStopResponseDto[] = [];
    const waypointsVistos = new Set<string>();
    for (const stop of stops) {
      for (const pendencia of pendenciasPorRouteStop.get(stop.id) ?? []) {
        if (waypointsVistos.has(pendencia.waypointId)) continue;
        waypointsVistos.add(pendencia.waypointId);
        resultado.push(
          pendencia.waypointId === stop.id
            ? stop
            : {
                id: pendencia.waypointId,
                routeId: stop.routeId,
                ordem: stop.ordem,
                endereco: pendencia.endereco,
                latitude: pendencia.latitude,
                longitude: pendencia.longitude,
                horarioPrevisto: pendencia.horarioPrevisto,
                schoolId: null,
                createdAt: stop.createdAt,
                updatedAt: stop.updatedAt,
              },
        );
      }
    }
    return resultado;
  }

  /**
   * Reordena paradas pendentes pela mais PRÓXIMA da posição atual do
   * veículo primeiro (vizinho-mais-próximo guloso, Haversine — pedido do
   * usuário: "a Rotta AI vai direcionar para o aluno/responsável mais
   * próximo... assim vai ficar melhor para o GPS"). Antes desta função,
   * a ordem era sempre a `ordem` fixa definida na criação/reordenação da
   * rota — nunca recalculada durante a viagem em si. Distância em linha
   * reta, não OSRM: mesmo raciocínio já documentado em
   * `detectarAproximacaoBestEffort` (roda a cada ping de GPS, uma
   * chamada de roteamento aqui seria cara demais) — o traçado/ETA de
   * verdade continua vindo do OSRM depois, só a ORDEM de visita muda.
   * Não é o TSP ótimo (isso exigiria `GeoEngineService.optimizeTrip`,
   * uma chamada de rede por recálculo) — guloso já resolve o pedido real
   * ("ir pro mais próximo agora") com custo zero de rede.
   */
  private ordenarPorProximidade<T extends { latitude: number; longitude: number }>(
    origem: { latitude: number; longitude: number },
    paradas: T[],
  ): T[] {
    const restantes = [...paradas];
    const ordenadas: T[] = [];
    let atual = origem;
    while (restantes.length > 0) {
      let melhorIndice = 0;
      let melhorDistancia = haversineDistanceKm(
        atual.latitude,
        atual.longitude,
        restantes[0]!.latitude,
        restantes[0]!.longitude,
      );
      for (let i = 1; i < restantes.length; i += 1) {
        const distancia = haversineDistanceKm(
          atual.latitude,
          atual.longitude,
          restantes[i]!.latitude,
          restantes[i]!.longitude,
        );
        if (distancia < melhorDistancia) {
          melhorDistancia = distancia;
          melhorIndice = i;
        }
      }
      const [proxima] = restantes.splice(melhorIndice, 1);
      ordenadas.push(proxima!);
      atual = proxima!;
    }
    return ordenadas;
  }

  /**
   * ETA completo (com rota OSRM real) para cada parada pendente (ver
   * `listParadasPendentes`). Sem nenhuma posição GPS ainda, não há
   * "onde o veículo está agora" para recalcular a partir daí — devolve
   * vazio (nunca lança: ausência de GPS é normal nos primeiros
   * segundos de uma viagem).
   */
  private async computeProximasEtas(
    trip: Trip,
    actor: AuthenticatedUser,
  ): Promise<NextEtaResponseDto[]> {
    const ultimaPosicao = await this.positionRepository.findLatestByTrip(trip.id);
    if (!ultimaPosicao) {
      return [];
    }

    const origem = {
      latitude: Number(ultimaPosicao.latitude),
      longitude: Number(ultimaPosicao.longitude),
    };

    const pendentesNaOrdemCadastrada = await this.listParadasPendentes(trip, actor);
    if (pendentesNaOrdemCadastrada.length === 0) {
      return [];
    }
    const paradasPendentes = this.ordenarPorProximidade(origem, pendentesNaOrdemCadastrada);

    const destino = paradasPendentes[paradasPendentes.length - 1]!;
    const intermediarias = paradasPendentes.slice(0, -1);

    const rota = await this.geoEngineService.getRoute(
      origem,
      { latitude: destino.latitude, longitude: destino.longitude },
      intermediarias.map((stop) => ({ latitude: stop.latitude, longitude: stop.longitude })),
    );

    const agora = Date.now();
    let acumuladoSegundos = 0;
    let acumuladoMetros = 0;
    return paradasPendentes.map((stop, index) => {
      const perna = rota.pernas[index];
      acumuladoSegundos += perna?.duracaoSegundos ?? 0;
      acumuladoMetros += perna?.distanciaMetros ?? 0;
      return {
        routeStopId: stop.id,
        endereco: stop.endereco,
        horarioPrevisto: stop.horarioPrevisto,
        distanciaMetros: Math.round(acumuladoMetros),
        etaSegundos: Math.round(acumuladoSegundos),
        etaPrevista: new Date(agora + acumuladoSegundos * 1000).toISOString(),
        latitude: stop.latitude,
        longitude: stop.longitude,
      };
    });
  }

  /**
   * Disparado best-effort por `addStudentEvent` quando `tipo ===
   * "AUSENTE"` — nunca lança, nunca bloqueia o registro da ausência em
   * si (mesmo princípio de `notifyStudentEvent`/`recordAudit`). Notifica
   * só os responsáveis vinculados à PRÓXIMA parada pendente (reaproveita
   * `MessagePersonalizationService.veiculoProximo`, que já existia mas
   * nunca tinha um chamador real neste backend) — as demais paradas
   * recalculadas ficam disponíveis via `GET /trips/:id/proximas-etas`
   * para quem quiser o trajeto inteiro, não só a próxima parada.
   */
  private async recalcularEnotificarBestEffort(
    trip: Trip,
    actor: AuthenticatedUser,
  ): Promise<void> {
    try {
      const proximas = await this.computeProximasEtas(trip, actor);
      const proxima = proximas[0];
      if (!proxima) return;

      const horario = proxima.etaPrevista.slice(11, 16);
      const pendencias = await this.listPendenciasPorAluno(trip, actor);

      for (const pendencia of pendencias) {
        if (pendencia.waypointId !== proxima.routeStopId) continue;
        const vinculo = pendencia.vinculo;
        try {
          const [contract, student] = await Promise.all([
            this.contractsService.findRawByIdOrThrow(vinculo.contractId, actor),
            this.studentsService.findRawById(vinculo.studentId),
          ]);
          if (!student) continue;
          const message = this.messagePersonalizationService.veiculoProximo(student.nome, horario);
          this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
            userId: contract.responsavelId,
            companyId: contract.companyId,
            tipo: NotificationEventType.VEICULO_PROXIMO,
            titulo: message.titulo,
            corpo: message.corpo,
            dadosContexto: { routeId: trip.routeId, studentId: vinculo.studentId },
          });
        } catch (error) {
          this.logger.warn(
            `Falha ao notificar responsável do vínculo ${vinculo.id} sobre novo ETA (rota ${trip.routeId}).`,
          );
          this.logger.warn(error instanceof Error ? error.message : String(error));
        }
      }
    } catch (error) {
      this.logger.warn(`Falha ao recalcular próximas ETAs da viagem ${trip.id} após ausência.`);
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * Geofencing real (Prompt "Rotta Geo Platform" §25/§26 —
   * "VEHICLE_APPROACHING"/"não disparar eventos com base apenas em uma
   * coordenada isolada... utilizar tolerância geográfica"; Prompt
   * "Communication Engine" §26 — "GPS + Communication Engine: o GPS não
   * deve gerar mensagens a cada atualização... somente eventos
   * relevantes chegam ao Communication Engine"). Disparado (`await`ado,
   * mesma convenção de `recalcularEnotificarBestEffort`) a cada posição
   * ingerida — nunca lança, e a posição em si já foi persistida antes
   * desta chamada, então uma falha aqui nunca desfaz o registro do GPS.
   *
   * Distância em linha reta (Haversine), não rota OSRM — geofencing
   * roda a cada ping de GPS (podem ser dezenas por viagem), então uma
   * chamada de roteamento aqui violaria a Seção 29 ("evitar consultas
   * pesadas"); `listParadasPendentes` já é o mesmo custo de
   * `computeProximasEtas` sem o OSRM.
   *
   * Dedup via `Trip.ultimaParadaProximaNotificadaId`: notifica no
   * máximo uma vez por parada pendente (nunca a cada novo ping dentro
   * do raio — Prompt "Communication Engine" §20: "se o GPS oscilar, não
   * enviar 'veículo está chegando' 10 vezes"). Muda sozinho quando a
   * próxima parada pendente muda (embarque/desembarque registrado).
   */
  private async detectarAproximacaoBestEffort(
    trip: Trip,
    actor: AuthenticatedUser,
    latitude: number,
    longitude: number,
  ): Promise<void> {
    try {
      const pendentesNaOrdemCadastrada = await this.listParadasPendentes(trip, actor);
      const paradasPendentes = this.ordenarPorProximidade(
        { latitude, longitude },
        pendentesNaOrdemCadastrada,
      );
      const proxima = paradasPendentes[0];
      if (!proxima) return;
      if (trip.ultimaParadaProximaNotificadaId === proxima.id) return;

      const distanciaMetros =
        haversineDistanceKm(latitude, longitude, proxima.latitude, proxima.longitude) * 1000;
      if (distanciaMetros > GEOFENCE_APPROACHING_METERS) return;

      const pendencias = await this.listPendenciasPorAluno(trip, actor);
      for (const pendencia of pendencias) {
        if (pendencia.waypointId !== proxima.id) continue;
        const vinculo = pendencia.vinculo;
        try {
          const [contract, student] = await Promise.all([
            this.contractsService.findRawByIdOrThrow(vinculo.contractId, actor),
            this.studentsService.findRawById(vinculo.studentId),
          ]);
          if (!student) continue;
          const message = this.messagePersonalizationService.veiculoProximo(
            student.nome,
            proxima.horarioPrevisto,
          );
          this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
            userId: contract.responsavelId,
            companyId: contract.companyId,
            tipo: NotificationEventType.VEICULO_PROXIMO,
            titulo: message.titulo,
            corpo: message.corpo,
            dadosContexto: { routeId: trip.routeId, studentId: vinculo.studentId },
          });
        } catch (error) {
          this.logger.warn(
            `Falha ao notificar responsável do vínculo ${vinculo.id} sobre aproximação do veículo (rota ${trip.routeId}).`,
          );
          this.logger.warn(error instanceof Error ? error.message : String(error));
        }
      }

      await this.tripRepository.update(trip.id, { ultimaParadaProximaNotificadaId: proxima.id });
    } catch (error) {
      this.logger.warn(`Falha ao detectar aproximação por geofencing da viagem ${trip.id}.`);
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }

  /**
   * "Chegou a vez do aluno" (pedido do usuário, texto literal: "Boas
   * notícias! O aluno {nome} está na rota para ser buscado" /
   * "...para retornar ao endereço informado") — avisa os responsáveis
   * dos alunos vinculados à PRÓXIMA parada pendente assim que ela vira a
   * primeira da fila, de embarque ou de desembarque.
   *
   * Diferente de `detectarAproximacaoBestEffort` (gated por proximidade
   * REAL de GPS — só dispara dentro do raio de geofencing): este método
   * dispara por TRANSIÇÃO de estado, a parada pendente mudou, inclusive
   * no instante em que a viagem começa (`start`), antes de qualquer
   * posição de GPS existir. Por isso usa `Trip.
   * ultimaParadaEmVezNotificadaId`, um campo de dedup PRÓPRIO — nunca
   * `ultimaParadaProximaNotificadaId` (esse é do geofencing).
   *
   * Reordena as pendentes pela última posição GPS conhecida quando ela
   * existir (mesmo critério guloso de `ordenarPorProximidade`); sem
   * nenhuma posição ainda (caso comum logo no `start`), usa a ordem
   * cadastrada da rota mesmo — é a melhor estimativa disponível de qual
   * aluno é "o primeiro a ser buscado" antes do motorista sequer se
   * mover. Chamado depois de `start()` e depois de todo
   * `addStudentEvent` (qualquer checklist muda quem é a próxima parada
   * pendente) — nunca lança, mesmo princípio best-effort de
   * `recalcularEnotificarBestEffort`/`detectarAproximacaoBestEffort`.
   */
  private async notificarVezDoAlunoBestEffort(trip: Trip, actor: AuthenticatedUser): Promise<void> {
    try {
      const pendentesNaOrdemCadastrada = await this.listParadasPendentes(trip, actor);
      if (pendentesNaOrdemCadastrada.length === 0) return;

      const ultimaPosicao = await this.positionRepository.findLatestByTrip(trip.id);
      const paradasPendentes = ultimaPosicao
        ? this.ordenarPorProximidade(
            {
              latitude: Number(ultimaPosicao.latitude),
              longitude: Number(ultimaPosicao.longitude),
            },
            pendentesNaOrdemCadastrada,
          )
        : pendentesNaOrdemCadastrada;

      const proxima = paradasPendentes[0];
      if (!proxima) return;
      if (trip.ultimaParadaEmVezNotificadaId === proxima.id) return;

      const pendencias = await this.listPendenciasPorAluno(trip, actor);
      for (const pendencia of pendencias) {
        if (pendencia.waypointId !== proxima.id) continue;
        const vinculo = pendencia.vinculo;
        try {
          const [contract, student] = await Promise.all([
            this.contractsService.findRawByIdOrThrow(vinculo.contractId, actor),
            this.studentsService.findRawById(vinculo.studentId),
          ]);
          if (!student) continue;
          const message =
            pendencia.tipo === "EMBARQUE"
              ? this.messagePersonalizationService.alunoVezEmbarque(student.nome)
              : this.messagePersonalizationService.alunoVezDesembarque(student.nome);
          const eventType =
            pendencia.tipo === "EMBARQUE"
              ? NotificationEventType.ALUNO_VEZ_EMBARQUE
              : NotificationEventType.ALUNO_VEZ_DESEMBARQUE;
          this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
            userId: contract.responsavelId,
            companyId: contract.companyId,
            tipo: eventType,
            titulo: message.titulo,
            corpo: message.corpo,
            dadosContexto: { routeId: trip.routeId, studentId: vinculo.studentId },
          });
        } catch (error) {
          this.logger.warn(
            `Falha ao notificar responsável do vínculo ${vinculo.id} sobre a vez do aluno (rota ${trip.routeId}).`,
          );
          this.logger.warn(error instanceof Error ? error.message : String(error));
        }
      }

      await this.tripRepository.update(trip.id, { ultimaParadaEmVezNotificadaId: proxima.id });
    } catch (error) {
      this.logger.warn(`Falha ao notificar a vez do aluno na viagem ${trip.id}.`);
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }

  // ---------------------------------------------------------------------
  // Mapa/localizador (GPS-01/03/06)
  // ---------------------------------------------------------------------

  /**
   * Todos os veículos em viagem no momento — a fonte de dados do mapa
   * (Empresa/Gestor: só a própria frota). Admin Rotta sem `companyId`
   * recebe o "Mapa Nacional de Veículos" — TODAS as empresas de uma vez
   * (mesmo padrão cross-tenant do Mapa Nacional de Escolas) — em vez do
   * antigo 400 que obrigava escolher uma empresa primeiro.
   */
  async listActiveForMap(
    actor: AuthenticatedUser,
    companyIdParam?: string,
  ): Promise<MapVehicleResponseDto[]> {
    if (actor.role === Role.ADMIN_ROTTA && !companyIdParam) {
      const nationwide = await this.tripRepository.listActiveNationwide();
      return nationwide.map(toMapVehicleResponseDto);
    }
    const companyId = actor.role === Role.ADMIN_ROTTA ? companyIdParam : actor.tenantId;
    if (!companyId) {
      throw new BadRequestException("Não foi possível determinar a empresa para o mapa.");
    }
    const trips = await this.tripRepository.listActiveByCompany(companyId);
    return trips.map(toMapVehicleResponseDto);
  }

  /**
   * Localizador do Responsável (briefing "Mapa inicial do Responsável" —
   * acompanhamento em tempo real do transporte do próprio filho).
   * `StudentsService.findByIdOrThrow` já restringe o acesso ao próprio
   * Responsável (mesmo princípio de não-enumeração do resto do
   * backend) — nunca aceita `studentId` de terceiros. Um aluno pode ter
   * mais de uma rota ativa (ida/volta, turnos diferentes — RN-26 só
   * proíbe duas do MESMO turno); devolve a primeira que tiver uma
   * viagem `EM_ANDAMENTO` hoje, ou `null` se nenhuma estiver em curso
   * agora.
   */
  async findActiveTripForStudent(
    studentId: string,
    actor: AuthenticatedUser,
  ): Promise<MapVehicleResponseDto | null> {
    await this.studentsService.findByIdOrThrow(studentId, actor);

    const routeIds = await this.routesService.findActiveRouteIdsForStudent(studentId);
    const data = today();
    for (const routeId of routeIds) {
      const trip = await this.tripRepository.findActiveDetailedByRouteId(routeId, data);
      if (trip) {
        return toMapVehicleResponseDto(trip);
      }
    }
    return null;
  }

  /**
   * Histórico de embarque/desembarque do próprio filho (modelo de
   * referência enviado pelo usuário — abas "Hoje"/"Semana"/"Mês" na
   * tela de acompanhamento do Responsável). Mesma checagem de posse de
   * `findActiveTripForStudent` acima, e mesmo motivo pra cruzar tenants:
   * o histórico de um aluno não fica preso a uma única transportadora
   * ao longo do tempo. `since` já vem calculado pelo controller a
   * partir do enum de período (nunca uma janela arbitrária vinda do
   * cliente).
   */
  async listStudentEventsHistory(
    studentId: string,
    actor: AuthenticatedUser,
    since: Date,
  ): Promise<TripStudentEventResponseDto[]> {
    await this.studentsService.findByIdOrThrow(studentId, actor);
    const events = await this.studentEventRepository.listByStudentAcrossTenants(studentId, since);
    return events.map(toTripStudentEventResponseDto);
  }
}
