import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { NotificationEventType, type Route, type RouteStop } from "@prisma/client";

import { toRouteStopResponseDto } from "./mappers/route-stop.mapper";
import { toRouteStudentResponseDto } from "./mappers/route-student.mapper";
import { toListRoutesResponseDto, toRouteResponseDto } from "./mappers/route.mapper";
import {
  ROUTE_REPOSITORY,
  ROUTE_STOP_REPOSITORY,
  ROUTE_STUDENT_REPOSITORY,
} from "./routes.constants";

import type { AddRouteStudentDto } from "./dto/add-route-student.dto";
import type { CreateRouteStopDto } from "./dto/create-route-stop.dto";
import type { CreateRouteDto } from "./dto/create-route.dto";
import type { ListRoutesQueryDto } from "./dto/list-routes-query.dto";
import type { ListRoutesResponseDto, RouteResponseDto } from "./dto/route-response.dto";
import type { RouteStopResponseDto } from "./dto/route-stop-response.dto";
import type { RouteStudentResponseDto } from "./dto/route-student-response.dto";
import type { UpdateRouteStopDto } from "./dto/update-route-stop.dto";
import type { UpdateRouteDto } from "./dto/update-route.dto";
import type { RouteStopRepository } from "./repositories/route-stop.repository";
import type { RouteStudentRepository } from "./repositories/route-student.repository";
import type { RouteRepository } from "./repositories/route.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { ListAuditLogsResponseDto } from "@/common/dto/audit-log-response.dto";

import { AuditLogService } from "@/modules/audit/audit-log.service";
import { ContractsService } from "@/modules/marketplace/contracts.service";
import { COMMUNICATION_REQUESTED_EVENT } from "@/modules/notifications/events/communication-requested.event";
import { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import { SchoolsService } from "@/modules/schools/schools.service";
import { StudentsService } from "@/modules/students/students.service";
import { UsersService } from "@/modules/users/users.service";
import { VehiclesService } from "@/modules/vehicles/vehicles.service";
import { Role } from "@/shared/enums";

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

/**
 * Núcleo de negócio do módulo Rotas (ROT-01/02/04/07, Dossiê 13 Seção
 * 10). Segue o mesmo padrão de `VehiclesService`: nunca executa uma
 * query diretamente (sempre via os 3 repositórios do módulo), delega
 * auditoria a `AuditLogService` (best-effort) e notificações ao
 * Communication Engine via `COMMUNICATION_REQUESTED_EVENT` (nunca
 * chama um canal diretamente).
 *
 * ESCOPO DESTA ENTREGA (ROT-01/02/04/05/06/07 + EMB-01 + RN-26 +
 * RN-CAP-01): cadastro, edição, listagem, paradas, vínculo de alunos e
 * substituição PERMANENTE de motorista/veículo/monitor padrão (`update`,
 * validando vínculo ativo do papel correto e capacidade do veículo —
 * `assertValidDefaultResources`). A substituição PONTUAL ("só hoje", sem
 * alterar o padrão da rota) vive em `TripsService.substituirMotorista`/
 * `substituirVeiculo`/`substituirMonitor` (tarefa #102), que reaproveita
 * `notifyActiveStudents` abaixo (por isso público, não `private`). FORA
 * DE ESCOPO (V2 no próprio Dossiê 13/Especificação Funcional 18, não uma
 * omissão desta entrega): ROT-03 (duplicar rota), ROT-08 (otimização
 * automática de trajeto) e calendário de feriados/recessos (tarefa #101).
 */
@Injectable()
export class RoutesService {
  private readonly logger = new Logger(RoutesService.name);

  constructor(
    @Inject(ROUTE_REPOSITORY) private readonly routeRepository: RouteRepository,
    @Inject(ROUTE_STOP_REPOSITORY) private readonly routeStopRepository: RouteStopRepository,
    @Inject(ROUTE_STUDENT_REPOSITORY)
    private readonly routeStudentRepository: RouteStudentRepository,
    private readonly auditLogService: AuditLogService,
    private readonly contractsService: ContractsService,
    private readonly studentsService: StudentsService,
    private readonly usersService: UsersService,
    private readonly vehiclesService: VehiclesService,
    private readonly eventEmitter: EventEmitter2,
    private readonly messagePersonalizationService: MessagePersonalizationService,
    private readonly schoolsService: SchoolsService,
  ) {}

  // ---------------------------------------------------------------------
  // Helpers privados
  // ---------------------------------------------------------------------

  private assertCanAccessRoute(
    route: Route | null,
    actor: AuthenticatedUser,
  ): asserts route is Route {
    if (!route || (actor.role !== Role.ADMIN_ROTTA && route.companyId !== actor.tenantId)) {
      throw new NotFoundException("Rota não encontrada.");
    }
  }

  private async fetchOrThrow(id: string, actor: AuthenticatedUser): Promise<Route> {
    const route = await this.routeRepository.findById(id);
    this.assertCanAccessRoute(route, actor);
    return route;
  }

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
      await this.auditLogService.record({ ...input, entidadeTipo: "Route" });
    } catch (error) {
      this.logger.warn(
        `Falha ao registrar auditoria (Route ${input.entidadeId}, ação ${input.acao})`,
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }

  /** "Motorista X passou a ser o responsável pelo transporte de Y" — um evento por aluno ATIVO na rota. */
  /**
   * Público (não `private`) porque `TripsService.substituirMotorista`/
   * `substituirVeiculo`/`substituirMonitor` (tarefa #102, substituição
   * PONTUAL) reaproveita este mesmo disparo de notificação — nunca
   * duplicado ali.
   */
  async notifyActiveStudents(
    routeId: string,
    build: (studentNome: string) => { titulo: string; corpo: string } | null,
    eventType: NotificationEventType,
    actor: AuthenticatedUser,
  ): Promise<void> {
    const vinculos = await this.routeStudentRepository.listByRoute(routeId);
    for (const vinculo of vinculos) {
      try {
        const [contract, student] = await Promise.all([
          this.contractsService.findRawByIdOrThrow(vinculo.contractId, actor),
          this.studentsService.findRawById(vinculo.studentId),
        ]);
        if (!student) continue;
        const message = build(student.nome);
        if (!message) continue;
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
          `Falha ao notificar responsável do vínculo ${vinculo.id} (rota ${routeId}) sobre ${eventType}.`,
        );
        this.logger.warn(error instanceof Error ? error.message : String(error));
      }
    }
  }

  // ---------------------------------------------------------------------
  // CRUD de Rota (ROT-01/02/04)
  // ---------------------------------------------------------------------

  async create(
    dto: CreateRouteDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<RouteResponseDto> {
    await this.assertValidDefaultResources(dto, actor);

    // `actor.tenantId` nunca é nulo aqui — `@Roles(EMPRESA, GESTOR)` no controller já exclui `ADMIN_ROTTA`.
    const route = await this.routeRepository.create({
      companyId: actor.tenantId!,
      nome: dto.nome,
      turno: dto.turno,
      diasSemana: dto.diasSemana,
      veiculoPadraoId: dto.veiculoPadraoId,
      motoristaPadraoId: dto.motoristaPadraoId,
      monitorPadraoId: dto.monitorPadraoId,
    });

    await this.recordAudit({
      companyId: route.companyId,
      entidadeId: route.id,
      acao: "CREATED",
      atorUserId: actor.sub,
      dadosDepois: { nome: route.nome, turno: route.turno },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toRouteResponseDto(route);
  }

  /**
   * `motoristaPadraoId`/`monitorPadraoId` precisam ter vínculo ATIVO do
   * papel correto com a empresa (mesmo princípio de
   * `VehiclesService.assign`) — nunca aceita qualquer UUID de usuário.
   * `veiculoPadraoId` precisa existir/pertencer à empresa e ter
   * capacidade ≥ alunos ativos já vinculados à rota (`ROT-06`,
   * `RN-CAP-01`) — `routeId` só é conhecido em `update` (em `create` a
   * rota ainda não tem nenhum aluno vinculado, então a checagem é
   * sempre satisfeita).
   */
  private async assertValidDefaultResources(
    dto: Partial<CreateRouteDto>,
    actor: AuthenticatedUser,
    routeId?: string,
  ): Promise<void> {
    const companyId = actor.tenantId!;
    if (dto.motoristaPadraoId) {
      const membership = await this.usersService.findActiveMembership(
        dto.motoristaPadraoId,
        companyId,
      );
      if (!membership || (membership.role as Role) !== Role.MOTORISTA) {
        throw new BadRequestException(
          "motoristaPadraoId não possui vínculo ativo de Motorista nesta empresa.",
        );
      }
    }
    if (dto.monitorPadraoId) {
      const membership = await this.usersService.findActiveMembership(
        dto.monitorPadraoId,
        companyId,
      );
      if (!membership || (membership.role as Role) !== Role.MONITOR) {
        throw new BadRequestException(
          "monitorPadraoId não possui vínculo ativo de Monitor nesta empresa.",
        );
      }
    }
    if (dto.veiculoPadraoId) {
      await this.assertVeiculoCapacidade(dto.veiculoPadraoId, actor, routeId);
    }
  }

  /** Compartilhado com `TripsService.substituirVeiculo` (tarefa #102) via chamada direta — ver nota ali. */
  async assertVeiculoCapacidade(
    veiculoId: string,
    actor: AuthenticatedUser,
    routeId?: string,
  ): Promise<void> {
    const veiculo = await this.vehiclesService.findByIdOrThrow(veiculoId, actor);
    const alunosAtivos = routeId
      ? (await this.routeStudentRepository.listByRoute(routeId)).length
      : 0;
    if (veiculo.capacidadePassageiros < alunosAtivos) {
      throw new BadRequestException(
        `Este veículo tem capacidade para ${veiculo.capacidadePassageiros} alunos, mas a rota tem ${alunosAtivos} vinculados. Escolha outro veículo ou ajuste a rota.`,
      );
    }
  }

  async findByIdOrThrow(id: string, actor: AuthenticatedUser): Promise<RouteResponseDto> {
    const route = await this.fetchOrThrow(id, actor);
    return toRouteResponseDto(route);
  }

  async list(query: ListRoutesQueryDto, actor: AuthenticatedUser): Promise<ListRoutesResponseDto> {
    // Prompt Mestre da Rotta, Seções 5/9: Motorista/Monitor só enxergam
    // as próprias rotas (nunca a operação inteira da empresa) — quem
    // gerencia (Admin Rotta/Empresa/Gestor) continua vendo tudo.
    const isDriverOrMonitor = actor.role === Role.MOTORISTA || actor.role === Role.MONITOR;

    const result = await this.routeRepository.list({
      search: query.search,
      status: query.status,
      turno: query.turno,
      companyId: actor.role === Role.ADMIN_ROTTA ? query.companyId : undefined,
      atribuidaAUserId: isDriverOrMonitor ? actor.sub : undefined,
      page: query.page,
      pageSize: query.pageSize,
    });

    return toListRoutesResponseDto(result, query.page, query.pageSize);
  }

  async update(
    id: string,
    dto: UpdateRouteDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<RouteResponseDto> {
    const existing = await this.fetchOrThrow(id, actor);
    await this.assertValidDefaultResources(dto, actor, id);

    const updated = await this.routeRepository.update(id, {
      nome: dto.nome,
      turno: dto.turno,
      diasSemana: dto.diasSemana,
      status: dto.status,
      veiculoPadraoId: dto.veiculoPadraoId,
      motoristaPadraoId: dto.motoristaPadraoId,
      monitorPadraoId: dto.monitorPadraoId,
    });

    await this.recordAudit({
      companyId: existing.companyId,
      entidadeId: id,
      acao: "UPDATED",
      atorUserId: actor.sub,
      dadosAntes: {
        veiculoPadraoId: existing.veiculoPadraoId,
        motoristaPadraoId: existing.motoristaPadraoId,
        monitorPadraoId: existing.monitorPadraoId,
      },
      dadosDepois: {
        veiculoPadraoId: updated.veiculoPadraoId,
        motoristaPadraoId: updated.motoristaPadraoId,
        monitorPadraoId: updated.monitorPadraoId,
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    await this.notifyDefaultResourceChanges(existing, updated, actor);

    return toRouteResponseDto(updated);
  }

  /**
   * "Motorista Alterado" / "Monitor Alterado" / "Veículo Alterado" /
   * "Rota Alterada" (Dossiê 14 — `MessagePersonalizationService`, já
   * implementado antes desta entrega) — dispara um evento POR aluno
   * ativo na rota, nunca um único evento agregado, porque cada
   * responsável recebe a mensagem endereçada ao PRÓPRIO filho
   * ("O X passou a ser o motorista de {nomeAluno}").
   */
  private async notifyDefaultResourceChanges(
    before: Route,
    after: Route,
    actor: AuthenticatedUser,
  ): Promise<void> {
    if (before.motoristaPadraoId !== after.motoristaPadraoId && after.motoristaPadraoId) {
      const motorista = await this.usersService.findById(after.motoristaPadraoId);
      if (motorista) {
        await this.notifyActiveStudents(
          after.id,
          (nomeAluno) =>
            this.messagePersonalizationService.motoristaAlterado(nomeAluno, motorista.nome),
          NotificationEventType.MOTORISTA_ALTERADO,
          actor,
        );
      }
    }

    if (before.monitorPadraoId !== after.monitorPadraoId && after.monitorPadraoId) {
      const monitor = await this.usersService.findById(after.monitorPadraoId);
      if (monitor) {
        await this.notifyActiveStudents(
          after.id,
          (nomeAluno) =>
            this.messagePersonalizationService.monitorAlterado(nomeAluno, monitor.nome),
          NotificationEventType.MONITOR_ALTERADO,
          actor,
        );
      }
    }

    if (before.veiculoPadraoId !== after.veiculoPadraoId || before.turno !== after.turno) {
      await this.notifyActiveStudents(
        after.id,
        (nomeAluno) => this.messagePersonalizationService.rotaAlterada(nomeAluno),
        NotificationEventType.ROTA_ALTERADA,
        actor,
      );
    }
  }

  async remove(id: string, actor: AuthenticatedUser, meta: RequestMeta): Promise<void> {
    const existing = await this.fetchOrThrow(id, actor);
    await this.routeRepository.update(id, { deletedAt: new Date() });

    await this.recordAudit({
      companyId: existing.companyId,
      entidadeId: id,
      acao: "DELETED",
      atorUserId: actor.sub,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }

  async listAuditLogs(
    id: string,
    actor: AuthenticatedUser,
    page: number,
    pageSize: number,
  ): Promise<ListAuditLogsResponseDto> {
    const existing = await this.fetchOrThrow(id, actor);
    const { items, total } = await this.auditLogService.listByCompany(existing.companyId, {
      entidadeTipo: "Route",
      entidadeId: id,
      page,
      pageSize,
    });

    return {
      items: items.map((log) => ({
        id: log.id,
        entidadeTipo: log.entidadeTipo,
        entidadeId: log.entidadeId,
        acao: log.acao,
        atorUserId: log.atorUserId,
        dadosAntes: log.dadosAntes,
        dadosDepois: log.dadosDepois,
        createdAt: log.createdAt,
      })),
      total,
      page,
      pageSize,
    };
  }

  // ---------------------------------------------------------------------
  // Paradas (ROT-07)
  // ---------------------------------------------------------------------

  async addStop(
    routeId: string,
    dto: CreateRouteStopDto,
    actor: AuthenticatedUser,
  ): Promise<RouteStopResponseDto> {
    const route = await this.fetchOrThrow(routeId, actor);
    const local = await this.resolveStopLocation(dto, actor);
    const stop = await this.routeStopRepository.create({
      routeId,
      companyId: route.companyId,
      ordem: dto.ordem,
      ...local,
      horarioPrevisto: dto.horarioPrevisto,
    });
    return toRouteStopResponseDto(stop);
  }

  /**
   * Resolve a localização de uma parada a partir das duas formas
   * aceitas por `CreateRouteStopDto` (pedido do usuário: "quando for
   * criar uma rota, deverá ser mediante a escola que foi importada, não
   * deverá colocar o endereço de fato"):
   *  - `schoolId` presente: busca a `School` do catálogo compartilhado
   *    (`SchoolsService.findByIdOrThrow` — mesmo RBAC de leitura de
   *    qualquer outro lugar do sistema, escola é catálogo global, não
   *    por tenant) e deriva `endereco`/`latitude`/`longitude` DELA,
   *    nunca do que o cliente mandou nesses 3 campos (mesmo que tenha
   *    mandado, é ignorado — a fonte de verdade passa a ser a escola).
   *    Exige que a escola já tenha coordenada (senão a IA de
   *    geocodificação ainda não processou/está na Fila de Revisão
   *    Manual) — pedir pra tentar de novo depois é melhor que criar uma
   *    parada sem localização de verdade.
   *  - `schoolId` ausente: exige `endereco`+`latitude`+`longitude`
   *    (parada fora de uma escola, ex. residência de aluno) — mesmo
   *    comportamento de antes desta mudança.
   */
  private async resolveStopLocation(
    dto: Pick<CreateRouteStopDto, "schoolId" | "endereco" | "latitude" | "longitude">,
    actor: AuthenticatedUser,
  ): Promise<{ endereco: string; latitude: number; longitude: number; schoolId: string | null }> {
    if (dto.schoolId) {
      const school = await this.schoolsService.findByIdOrThrow(dto.schoolId, actor);
      if (school.latitude == null || school.longitude == null) {
        throw new BadRequestException(
          `A escola "${school.nomeOficial}" ainda não tem coordenada geocodificada — tente novamente em alguns instantes ou escolha outra escola.`,
        );
      }
      const endereco = `${school.logradouro}, ${school.numero} - ${school.bairro}, ${school.cidade}/${school.estado}`;
      return {
        endereco,
        latitude: school.latitude,
        longitude: school.longitude,
        schoolId: school.id,
      };
    }

    if (dto.endereco == null || dto.latitude == null || dto.longitude == null) {
      throw new BadRequestException(
        "Informe schoolId (parada na escola) ou endereco+latitude+longitude (qualquer outro ponto).",
      );
    }
    return {
      endereco: dto.endereco,
      latitude: dto.latitude,
      longitude: dto.longitude,
      schoolId: null,
    };
  }

  async listStops(routeId: string, actor: AuthenticatedUser): Promise<RouteStopResponseDto[]> {
    await this.fetchOrThrow(routeId, actor);
    const stops = await this.routeStopRepository.listByRoute(routeId);
    return stops.map(toRouteStopResponseDto);
  }

  async updateStop(
    routeId: string,
    stopId: string,
    dto: UpdateRouteStopDto,
    actor: AuthenticatedUser,
  ): Promise<RouteStopResponseDto> {
    await this.fetchOrThrow(routeId, actor);
    const stop = await this.fetchStopOrThrow(routeId, stopId);

    // Só recalcula endereco/latitude/longitude a partir da School quando
    // `schoolId` é explicitamente informado (trocar a parada de escola) —
    // uma edição parcial comum (ex. só `horarioPrevisto`) nunca deveria
    // exigir os 3 campos de endereço só porque `resolveStopLocation`
    // pede um dos dois "pacotes" completos.
    const local = dto.schoolId
      ? await this.resolveStopLocation(
          {
            schoolId: dto.schoolId,
            endereco: undefined,
            latitude: undefined,
            longitude: undefined,
          },
          actor,
        )
      : {};

    const updated = await this.routeStopRepository.update(stop.id, { ...dto, ...local });
    return toRouteStopResponseDto(updated);
  }

  private async fetchStopOrThrow(routeId: string, stopId: string): Promise<RouteStop> {
    const stop = await this.routeStopRepository.findById(stopId);
    if (!stop || stop.routeId !== routeId) {
      throw new NotFoundException("Parada não encontrada.");
    }
    return stop;
  }

  async removeStop(routeId: string, stopId: string, actor: AuthenticatedUser): Promise<void> {
    await this.fetchOrThrow(routeId, actor);
    const stop = await this.fetchStopOrThrow(routeId, stopId);

    // Não permite remover uma parada em uso — mesmo princípio de
    // `onDelete: Restrict` do schema, mas verificado ANTES para dar uma
    // mensagem de negócio clara (em vez de deixar o banco rejeitar com
    // um erro de FK genérico).
    const vinculos = await this.routeStudentRepository.listByRoute(routeId);
    const emUso = vinculos.some(
      (v) => v.paradaEmbarqueId === stop.id || v.paradaDesembarqueId === stop.id,
    );
    if (emUso) {
      throw new ConflictException(
        "Esta parada está em uso por pelo menos um aluno vinculado à rota — reatribua o aluno a outra parada antes de removê-la.",
      );
    }

    await this.routeStopRepository.delete(stopId);
  }

  // ---------------------------------------------------------------------
  // Alunos na rota (ROT-07/EMB-01 + RN-26)
  // ---------------------------------------------------------------------

  async addStudent(
    routeId: string,
    dto: AddRouteStudentDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<RouteStudentResponseDto> {
    const route = await this.fetchOrThrow(routeId, actor);
    const contract = await this.contractsService.findRawByIdOrThrow(dto.contractId, actor);

    if (contract.status !== "ATIVO") {
      throw new BadRequestException(
        "Só é possível vincular um aluno a uma rota a partir de um contrato ATIVO.",
      );
    }
    if (contract.companyId !== route.companyId) {
      throw new BadRequestException("O contrato informado não pertence à mesma empresa da rota.");
    }

    const existingVinculo = await this.routeStudentRepository.findByContractId(dto.contractId);
    if (existingVinculo && existingVinculo.ativo) {
      throw new ConflictException(
        "Este contrato já está vinculado a uma rota — remova o vínculo atual antes de criar outro.",
      );
    }

    const [embarque, desembarque] = await Promise.all([
      this.fetchStopOrThrow(routeId, dto.paradaEmbarqueId),
      this.fetchStopOrThrow(routeId, dto.paradaDesembarqueId),
    ]);

    // RN-26: "um aluno não pode estar em duas rotas ativas do mesmo
    // turno" — verificado cross-tenant via `withBypass` (ver nota do
    // repositório), porque o mesmo aluno pode, em teoria, ter contratos
    // com empresas diferentes.
    const vinculosAtivos = await this.routeStudentRepository.listActiveByStudentAcrossTenants(
      contract.studentId,
    );
    const conflito = vinculosAtivos.some(
      (v) => v.route.turno === route.turno && v.routeId !== routeId,
    );
    if (conflito) {
      throw new ConflictException(
        `Este aluno já está em outra rota ativa no turno ${route.turno} — RN-26 não permite duas rotas simultâneas do mesmo turno.`,
      );
    }

    const routeStudent = existingVinculo
      ? await this.routeStudentRepository.update(existingVinculo.id, {
          paradaEmbarqueId: embarque.id,
          paradaDesembarqueId: desembarque.id,
          ativo: true,
        })
      : await this.routeStudentRepository.create({
          routeId,
          companyId: route.companyId,
          contractId: dto.contractId,
          studentId: contract.studentId,
          paradaEmbarqueId: embarque.id,
          paradaDesembarqueId: desembarque.id,
        });

    await this.recordAudit({
      companyId: route.companyId,
      entidadeId: routeId,
      acao: "STUDENT_ADDED",
      atorUserId: actor.sub,
      dadosDepois: { studentId: contract.studentId, contractId: dto.contractId },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toRouteStudentResponseDto(routeStudent);
  }

  async listStudents(
    routeId: string,
    actor: AuthenticatedUser,
  ): Promise<RouteStudentResponseDto[]> {
    await this.fetchOrThrow(routeId, actor);
    const vinculos = await this.routeStudentRepository.listByRoute(routeId);
    return vinculos.map(toRouteStudentResponseDto);
  }

  /**
   * Todas as rotas em que este aluno está ATIVO agora, cross-tenant
   * (mesmo `withBypass` de RN-26) — para consumo por `TripsService`
   * (localizador do Responsável: "em qual rota/viagem meu filho está
   * agora", sem exigir que o Responsável conheça o `routeId` de
   * antemão). Nunca expõe o repositório em si para fora do módulo.
   */
  async findActiveRouteIdsForStudent(studentId: string): Promise<string[]> {
    const vinculos = await this.routeStudentRepository.listActiveByStudentAcrossTenants(studentId);
    return vinculos.map((v) => v.routeId);
  }

  async removeStudent(
    routeId: string,
    routeStudentId: string,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<void> {
    const route = await this.fetchOrThrow(routeId, actor);
    const vinculo = await this.routeStudentRepository.findById(routeStudentId);
    if (!vinculo || vinculo.routeId !== routeId) {
      throw new NotFoundException("Vínculo de aluno não encontrado nesta rota.");
    }

    await this.routeStudentRepository.delete(routeStudentId);

    await this.recordAudit({
      companyId: route.companyId,
      entidadeId: routeId,
      acao: "STUDENT_REMOVED",
      atorUserId: actor.sub,
      dadosAntes: { studentId: vinculo.studentId },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });
  }
}
