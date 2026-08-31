import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { NotificationEventType, TripStatus } from "@prisma/client";

import { TripsService } from "../trips.service";

import type { TripPositionRepository } from "../repositories/trip-position.repository";
import type { TripStudentEventRepository } from "../repositories/trip-student-event.repository";
import type { TripRepository } from "../repositories/trip.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { CompaniesService } from "@/modules/companies/companies.service";
import type { GeoEngineService } from "@/modules/geo/geo-engine.service";
import type { ContractsService } from "@/modules/marketplace/contracts.service";
import type { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import type { RoutesService } from "@/modules/routes/routes.service";
import type { StudentsService } from "@/modules/students/students.service";
import type { UsersService } from "@/modules/users/users.service";
import type { VehiclesService } from "@/modules/vehicles/vehicles.service";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import type { Trip } from "@prisma/client";

import { COMMUNICATION_REQUESTED_EVENT } from "@/modules/notifications/events/communication-requested.event";
import { Role } from "@/shared/enums";

function buildTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    companyId: "company-1",
    routeId: "route-1",
    data: new Date(),
    status: TripStatus.EM_ANDAMENTO,
    codigo: "ABC234",
    veiculoId: "vehicle-1",
    motoristaId: "motorista-1",
    monitorId: null,
    iniciadaEm: new Date(),
    pausadaEm: null,
    finalizadaEm: null,
    canceladaEm: null,
    ultimaParadaProximaNotificadaId: null,
    ultimaParadaEmVezNotificadaId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const motoristaActor: AuthenticatedUser = {
  sub: "motorista-1",
  tenantId: "company-1",
  role: Role.MOTORISTA,
  vinculoId: "vinculo-1",
};

const empresaActor: AuthenticatedUser = {
  sub: "user-empresa-1",
  tenantId: "company-1",
  role: Role.EMPRESA,
  vinculoId: "vinculo-2",
};

const adminActor: AuthenticatedUser = {
  sub: "admin-1",
  tenantId: null,
  role: Role.ADMIN_ROTTA,
  vinculoId: "admin-1",
};

describe("TripsService", () => {
  let service: TripsService;
  let tripRepository: jest.Mocked<TripRepository>;
  let positionRepository: jest.Mocked<TripPositionRepository>;
  let studentEventRepository: jest.Mocked<TripStudentEventRepository>;
  let routesService: jest.Mocked<RoutesService>;
  let vehiclesService: jest.Mocked<VehiclesService>;
  let contractsService: jest.Mocked<ContractsService>;
  let studentsService: jest.Mocked<StudentsService>;
  let usersService: jest.Mocked<UsersService>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let messagePersonalizationService: jest.Mocked<MessagePersonalizationService>;
  let geoEngineService: jest.Mocked<GeoEngineService>;
  let companiesService: jest.Mocked<CompaniesService>;

  beforeEach(() => {
    tripRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByRouteAndDate: jest.fn(),
      update: jest.fn(),
      listActiveByCompany: jest.fn(),
      listActiveNationwide: jest.fn(),
      findActiveDetailedByRouteId: jest.fn(),
      listByRoute: jest.fn(),
    };
    positionRepository = {
      create: jest.fn(),
      createMany: jest.fn(),
      listByTrip: jest.fn(),
      findLatestByTrip: jest.fn(),
    };
    studentEventRepository = {
      create: jest.fn(),
      findByTripStudentAndTipo: jest.fn(),
      listByTrip: jest.fn(),
      listByStudentAcrossTenants: jest.fn(),
      listStudentIdsAusenteToday: jest.fn(),
    };
    routesService = {
      findByIdOrThrow: jest.fn(),
      listStudents: jest.fn(),
      listStops: jest.fn(),
      findActiveRouteIdsForStudent: jest.fn(),
      notifyActiveStudents: jest.fn(),
      assertVeiculoCapacidade: jest.fn(),
    } as unknown as jest.Mocked<RoutesService>;
    vehiclesService = {
      findByIdOrThrow: jest.fn(),
      setCurrentTrip: jest.fn(),
      updateLocationFromTrip: jest.fn(),
      assertVeiculoOperavel: jest.fn(),
    } as unknown as jest.Mocked<VehiclesService>;
    contractsService = {
      findRawByIdOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ContractsService>;
    studentsService = {
      findRawById: jest.fn(),
      findByIdOrThrow: jest.fn(),
      listAddressOverridesByStudentsAndDate: jest.fn().mockResolvedValue(new Map()),
      listAbsentStudentIdsToday: jest.fn().mockResolvedValue(new Set()),
    } as unknown as jest.Mocked<StudentsService>;
    usersService = {
      findActiveMembership: jest.fn(),
      findById: jest.fn(),
      isAutonomoOuMei: jest.fn().mockResolvedValue(false),
    } as unknown as jest.Mocked<UsersService>;
    auditLogService = { record: jest.fn() } as unknown as jest.Mocked<AuditLogService>;
    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;
    messagePersonalizationService = {
      viagemIniciada: jest.fn().mockReturnValue({ titulo: "t", corpo: "c" }),
      viagemEncerrada: jest.fn().mockReturnValue({ titulo: "t", corpo: "c" }),
      alunoEmbarcou: jest.fn().mockReturnValue({ titulo: "t", corpo: "c" }),
      alunoDesembarcou: jest.fn().mockReturnValue({ titulo: "t", corpo: "c" }),
      alunoAusente: jest.fn().mockReturnValue({ titulo: "t", corpo: "c" }),
      motoristaAlterado: jest.fn().mockReturnValue({ titulo: "t", corpo: "c" }),
      monitorAlterado: jest.fn().mockReturnValue({ titulo: "t", corpo: "c" }),
      veiculoAlterado: jest.fn().mockReturnValue({ titulo: "t", corpo: "c" }),
      veiculoProximo: jest.fn().mockReturnValue({ titulo: "t", corpo: "c" }),
      alunoVezEmbarque: jest.fn().mockReturnValue({ titulo: "t", corpo: "c" }),
      alunoVezDesembarque: jest.fn().mockReturnValue({ titulo: "t", corpo: "c" }),
    } as unknown as jest.Mocked<MessagePersonalizationService>;
    geoEngineService = {
      getRoute: jest.fn(),
    } as unknown as jest.Mocked<GeoEngineService>;
    companiesService = {
      getNomeFantasia: jest.fn().mockResolvedValue("Gama Transportes"),
    } as unknown as jest.Mocked<CompaniesService>;

    routesService.listStudents.mockResolvedValue([]);
    routesService.listStops.mockResolvedValue([]);
    positionRepository.findLatestByTrip.mockResolvedValue(null);
    studentEventRepository.listByTrip.mockResolvedValue([]);

    service = new TripsService(
      tripRepository,
      positionRepository,
      studentEventRepository,
      routesService,
      vehiclesService,
      contractsService,
      studentsService,
      usersService,
      auditLogService,
      eventEmitter,
      messagePersonalizationService,
      geoEngineService,
      companiesService,
    );
  });

  describe("start", () => {
    it("rejeita iniciar viagem de uma rota que não está ATIVA", async () => {
      routesService.findByIdOrThrow.mockResolvedValue({
        id: "route-1",
        companyId: "company-1",
        status: "PAUSADA",
        turno: "MANHA",
        motoristaPadraoId: null,
        monitorPadraoId: null,
        veiculoPadraoId: null,
      } as never);

      await expect(service.start({ routeId: "route-1" }, motoristaActor, {})).rejects.toThrow(
        BadRequestException,
      );
      expect(tripRepository.create).not.toHaveBeenCalled();
    });

    it("rejeita quando não há veiculoId nem veículo padrão da rota", async () => {
      routesService.findByIdOrThrow.mockResolvedValue({
        id: "route-1",
        companyId: "company-1",
        status: "ATIVA",
        turno: "MANHA",
        motoristaPadraoId: null,
        monitorPadraoId: null,
        veiculoPadraoId: null,
      } as never);

      await expect(service.start({ routeId: "route-1" }, motoristaActor, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejeita quando já existe uma viagem EM_ANDAMENTO hoje para a mesma rota", async () => {
      routesService.findByIdOrThrow.mockResolvedValue({
        id: "route-1",
        companyId: "company-1",
        status: "ATIVA",
        turno: "MANHA",
        motoristaPadraoId: null,
        monitorPadraoId: null,
        veiculoPadraoId: "vehicle-1",
      } as never);
      vehiclesService.findByIdOrThrow.mockResolvedValue({} as never);
      tripRepository.findByRouteAndDate.mockResolvedValue(buildTrip({ status: "EM_ANDAMENTO" }));

      await expect(service.start({ routeId: "route-1" }, motoristaActor, {})).rejects.toThrow(
        ConflictException,
      );
      expect(tripRepository.create).not.toHaveBeenCalled();
    });

    it("rejeita quando já existe uma viagem PAUSADA hoje para a mesma rota", async () => {
      routesService.findByIdOrThrow.mockResolvedValue({
        id: "route-1",
        companyId: "company-1",
        status: "ATIVA",
        turno: "MANHA",
        motoristaPadraoId: null,
        monitorPadraoId: null,
        veiculoPadraoId: "vehicle-1",
      } as never);
      vehiclesService.findByIdOrThrow.mockResolvedValue({} as never);
      tripRepository.findByRouteAndDate.mockResolvedValue(buildTrip({ status: "PAUSADA" }));

      await expect(service.start({ routeId: "route-1" }, motoristaActor, {})).rejects.toThrow(
        ConflictException,
      );
      expect(tripRepository.create).not.toHaveBeenCalled();
    });

    it("REGRESSÃO — permite iniciar outra viagem na mesma rota no mesmo dia quando a última já foi FINALIZADA (pedido do usuário: 'rota não é finalizada permanentemente')", async () => {
      routesService.findByIdOrThrow.mockResolvedValue({
        id: "route-1",
        companyId: "company-1",
        status: "ATIVA",
        turno: "MANHA",
        motoristaPadraoId: null,
        monitorPadraoId: null,
        veiculoPadraoId: "vehicle-1",
      } as never);
      vehiclesService.findByIdOrThrow.mockResolvedValue({} as never);
      tripRepository.findByRouteAndDate.mockResolvedValue(
        buildTrip({ id: "trip-anterior", status: "FINALIZADA" }),
      );
      tripRepository.create.mockResolvedValue(buildTrip({ id: "trip-2" }));

      const result = await service.start({ routeId: "route-1" }, motoristaActor, {});

      expect(tripRepository.create).toHaveBeenCalled();
      expect(result.id).toBe("trip-2");
    });

    it("REGRESSÃO — permite iniciar outra viagem na mesma rota no mesmo dia quando a última já foi CANCELADA", async () => {
      routesService.findByIdOrThrow.mockResolvedValue({
        id: "route-1",
        companyId: "company-1",
        status: "ATIVA",
        turno: "MANHA",
        motoristaPadraoId: null,
        monitorPadraoId: null,
        veiculoPadraoId: "vehicle-1",
      } as never);
      vehiclesService.findByIdOrThrow.mockResolvedValue({} as never);
      tripRepository.findByRouteAndDate.mockResolvedValue(
        buildTrip({ id: "trip-anterior", status: "CANCELADA" }),
      );
      tripRepository.create.mockResolvedValue(buildTrip({ id: "trip-2" }));

      const result = await service.start({ routeId: "route-1" }, motoristaActor, {});

      expect(tripRepository.create).toHaveBeenCalled();
      expect(result.id).toBe("trip-2");
    });

    it("inicia a viagem usando o próprio ator como motorista quando ele é Role.MOTORISTA", async () => {
      routesService.findByIdOrThrow.mockResolvedValue({
        id: "route-1",
        companyId: "company-1",
        status: "ATIVA",
        turno: "MANHA",
        motoristaPadraoId: null,
        monitorPadraoId: null,
        veiculoPadraoId: "vehicle-1",
      } as never);
      vehiclesService.findByIdOrThrow.mockResolvedValue({} as never);
      tripRepository.findByRouteAndDate.mockResolvedValue(null);
      tripRepository.create.mockResolvedValue(buildTrip());

      const result = await service.start({ routeId: "route-1" }, motoristaActor, {});

      expect(tripRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ motoristaId: "motorista-1", veiculoId: "vehicle-1" }),
      );
      expect(vehiclesService.setCurrentTrip).toHaveBeenCalledWith("vehicle-1", "trip-1");
      expect(result.id).toBe("trip-1");
    });

    it("exige motoristaId explícito quando quem inicia não é o motorista", async () => {
      routesService.findByIdOrThrow.mockResolvedValue({
        id: "route-1",
        companyId: "company-1",
        status: "ATIVA",
        turno: "MANHA",
        motoristaPadraoId: null,
        monitorPadraoId: null,
        veiculoPadraoId: "vehicle-1",
      } as never);

      await expect(service.start({ routeId: "route-1" }, empresaActor, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it("rejeita motoristaPadraoId sem vínculo de Motorista mesmo quando o ator é Role.EMPRESA (não-dono)", async () => {
      routesService.findByIdOrThrow.mockResolvedValue({
        id: "route-1",
        companyId: "company-1",
        status: "ATIVA",
        turno: "MANHA",
        motoristaPadraoId: "motorista-1",
        monitorPadraoId: null,
        veiculoPadraoId: "vehicle-1",
      } as never);
      usersService.findActiveMembership.mockResolvedValue({ role: Role.EMPRESA } as never);
      usersService.isAutonomoOuMei.mockResolvedValue(false);

      await expect(service.start({ routeId: "route-1" }, empresaActor, {})).rejects.toThrow(
        BadRequestException,
      );
    });

    it("REGRESSÃO — dono AUTONOMO/MEI inicia a própria rota (motoristaPadraoId = ele mesmo, Membership.role = EMPRESA)", async () => {
      routesService.findByIdOrThrow.mockResolvedValue({
        id: "route-1",
        companyId: "company-1",
        status: "ATIVA",
        turno: "MANHA",
        motoristaPadraoId: empresaActor.sub,
        monitorPadraoId: null,
        veiculoPadraoId: "vehicle-1",
      } as never);
      vehiclesService.findByIdOrThrow.mockResolvedValue({} as never);
      tripRepository.findByRouteAndDate.mockResolvedValue(null);
      tripRepository.create.mockResolvedValue(buildTrip({ motoristaId: empresaActor.sub }));
      usersService.findActiveMembership.mockResolvedValue({ role: Role.EMPRESA } as never);
      usersService.isAutonomoOuMei.mockResolvedValue(true);

      const result = await service.start({ routeId: "route-1" }, empresaActor, {});

      expect(usersService.isAutonomoOuMei).toHaveBeenCalledWith(empresaActor.sub, "company-1");
      expect(tripRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ motoristaId: empresaActor.sub }),
      );
      expect(result.id).toBe("trip-1");
    });

    it("ao iniciar, avisa o responsável do PRIMEIRO aluno da fila que 'está na rota para ser buscado' (ALUNO_VEZ_EMBARQUE)", async () => {
      routesService.findByIdOrThrow.mockResolvedValue({
        id: "route-1",
        companyId: "company-1",
        status: "ATIVA",
        turno: "MANHA",
        motoristaPadraoId: null,
        monitorPadraoId: null,
        veiculoPadraoId: "vehicle-1",
      } as never);
      vehiclesService.findByIdOrThrow.mockResolvedValue({} as never);
      tripRepository.findByRouteAndDate.mockResolvedValue(null);
      tripRepository.create.mockResolvedValue(buildTrip());
      companiesService.getNomeFantasia.mockResolvedValue("Gama Transportes");
      routesService.listStops.mockResolvedValue([
        { id: "stop-1", latitude: -23.0, longitude: -46.0, horarioPrevisto: "07:00" },
      ] as never);
      routesService.listStudents.mockResolvedValue([
        {
          id: "vinculo-1",
          contractId: "contract-1",
          studentId: "student-1",
          paradaEmbarqueId: "stop-1",
          paradaDesembarqueId: "stop-2",
        },
      ] as never);
      contractsService.findRawByIdOrThrow.mockResolvedValue({
        responsavelId: "responsavel-1",
        companyId: "company-1",
      } as never);
      studentsService.findRawById.mockResolvedValue({ nome: "Pedro Henrique" } as never);

      await service.start({ routeId: "route-1" }, motoristaActor, {});

      expect(messagePersonalizationService.alunoVezEmbarque).toHaveBeenCalledWith("Pedro Henrique");
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        COMMUNICATION_REQUESTED_EVENT,
        expect.objectContaining({
          userId: "responsavel-1",
          tipo: NotificationEventType.ALUNO_VEZ_EMBARQUE,
        }),
      );
      expect(tripRepository.update).toHaveBeenCalledWith("trip-1", {
        ultimaParadaEmVezNotificadaId: "stop-1",
      });
    });

    it("usa o nomeFantasia da empresa na mensagem 'a van está em serviço'", async () => {
      routesService.findByIdOrThrow.mockResolvedValue({
        id: "route-1",
        companyId: "company-1",
        status: "ATIVA",
        turno: "MANHA",
        motoristaPadraoId: null,
        monitorPadraoId: null,
        veiculoPadraoId: "vehicle-1",
      } as never);
      vehiclesService.findByIdOrThrow.mockResolvedValue({} as never);
      tripRepository.findByRouteAndDate.mockResolvedValue(null);
      tripRepository.create.mockResolvedValue(buildTrip());
      companiesService.getNomeFantasia.mockResolvedValue("Gama Transportes");
      routesService.listStudents.mockResolvedValue([
        {
          id: "vinculo-1",
          contractId: "contract-1",
          studentId: "student-1",
          paradaEmbarqueId: "stop-1",
          paradaDesembarqueId: "stop-2",
        },
      ] as never);
      contractsService.findRawByIdOrThrow.mockResolvedValue({
        responsavelId: "responsavel-1",
        companyId: "company-1",
      } as never);
      studentsService.findRawById.mockResolvedValue({ nome: "Pedro" } as never);
      usersService.findById.mockResolvedValue({ nome: "Ana" } as never);

      await service.start({ routeId: "route-1" }, motoristaActor, {});

      expect(companiesService.getNomeFantasia).toHaveBeenCalledWith("company-1");
      expect(messagePersonalizationService.viagemIniciada).toHaveBeenCalledWith("Gama Transportes");
    });

    it("Epic C — semeia um TripStudentEvent AUSENTE pra aluno com StudentDailyAbsence de hoje ao iniciar a viagem", async () => {
      routesService.findByIdOrThrow.mockResolvedValue({
        id: "route-1",
        companyId: "company-1",
        status: "ATIVA",
        turno: "MANHA",
        motoristaPadraoId: null,
        monitorPadraoId: null,
        veiculoPadraoId: "vehicle-1",
      } as never);
      vehiclesService.findByIdOrThrow.mockResolvedValue({} as never);
      tripRepository.findByRouteAndDate.mockResolvedValue(null);
      const trip = buildTrip();
      tripRepository.create.mockResolvedValue(trip);
      tripRepository.findById.mockResolvedValue(trip);
      companiesService.getNomeFantasia.mockResolvedValue("Gama Transportes");
      routesService.listStudents.mockResolvedValue([
        {
          id: "vinculo-1",
          contractId: "contract-1",
          studentId: "student-ausente",
          paradaEmbarqueId: "stop-1",
          paradaDesembarqueId: "stop-2",
        },
      ] as never);
      studentsService.listAbsentStudentIdsToday.mockResolvedValue(new Set(["student-ausente"]));
      studentEventRepository.findByTripStudentAndTipo.mockResolvedValue(null);
      studentEventRepository.create.mockResolvedValue({ id: "event-1" } as never);
      contractsService.findRawByIdOrThrow.mockResolvedValue({
        responsavelId: "responsavel-1",
        companyId: "company-1",
      } as never);
      studentsService.findRawById.mockResolvedValue({ nome: "Aluno Ausente" } as never);

      await service.start({ routeId: "route-1" }, motoristaActor, {});

      expect(studentsService.listAbsentStudentIdsToday).toHaveBeenCalledWith(["student-ausente"]);
      expect(studentEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ studentId: "student-ausente", tipo: "AUSENTE" }),
      );
    });

    it("Epic C — não falha o início da viagem quando semear a ausência do dia dá erro (best-effort)", async () => {
      routesService.findByIdOrThrow.mockResolvedValue({
        id: "route-1",
        companyId: "company-1",
        status: "ATIVA",
        turno: "MANHA",
        motoristaPadraoId: null,
        monitorPadraoId: null,
        veiculoPadraoId: "vehicle-1",
      } as never);
      vehiclesService.findByIdOrThrow.mockResolvedValue({} as never);
      tripRepository.findByRouteAndDate.mockResolvedValue(null);
      tripRepository.create.mockResolvedValue(buildTrip());
      companiesService.getNomeFantasia.mockResolvedValue("Gama Transportes");
      routesService.listStudents.mockResolvedValue([]);
      studentsService.listAbsentStudentIdsToday.mockRejectedValue(new Error("indisponível"));

      const result = await service.start({ routeId: "route-1" }, motoristaActor, {});

      expect(result.id).toBe("trip-1");
    });
  });

  describe("addStudentEvent (EMB-01/05 + DESEMB-01/03)", () => {
    const activeTrip = buildTrip();

    beforeEach(() => {
      tripRepository.findById.mockResolvedValue(activeTrip);
      routesService.listStudents.mockResolvedValue([
        {
          id: "vinculo-1",
          routeId: "route-1",
          contractId: "contract-1",
          studentId: "student-1",
          paradaEmbarqueId: "stop-embarque",
          paradaDesembarqueId: "stop-desembarque",
          ativo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ]);
      contractsService.findRawByIdOrThrow.mockResolvedValue({
        responsavelId: "responsavel-1",
        companyId: "company-1",
      } as never);
      studentsService.findRawById.mockResolvedValue({ nome: "Pedro" } as never);
    });

    it("REGRESSÃO — permite AUSENTE sem motivoAusencia (pedido do usuário: formulário opcional)", async () => {
      studentEventRepository.findByTripStudentAndTipo.mockResolvedValue(null);
      studentEventRepository.create.mockResolvedValue({
        id: "event-1",
        tripId: "trip-1",
        studentId: "student-1",
        routeStopId: "stop-embarque",
        tipo: "AUSENTE",
        motivoAusencia: null,
        processadoPorId: "motorista-1",
        processadoEm: new Date(),
      } as never);

      const result = await service.addStudentEvent(
        "trip-1",
        { studentId: "student-1", tipo: "AUSENTE" },
        motoristaActor,
      );

      expect(studentEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ tipo: "AUSENTE", motivoAusencia: undefined }),
      );
      expect(result.id).toBe("event-1");
    });

    it("rejeita DESEMBARCOU sem um EMBARCOU prévio na mesma viagem", async () => {
      studentEventRepository.findByTripStudentAndTipo.mockResolvedValue(null);

      await expect(
        service.addStudentEvent(
          "trip-1",
          { studentId: "student-1", tipo: "DESEMBARCOU" },
          motoristaActor,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("deriva routeStopId de paradaEmbarque para EMBARCOU, nunca do cliente", async () => {
      studentEventRepository.findByTripStudentAndTipo.mockResolvedValue(null);
      studentEventRepository.create.mockResolvedValue({
        id: "event-1",
        tripId: "trip-1",
        studentId: "student-1",
        routeStopId: "stop-embarque",
        tipo: "EMBARCOU",
        motivoAusencia: null,
        processadoPorId: "motorista-1",
        processadoEm: new Date(),
      } as never);

      const result = await service.addStudentEvent(
        "trip-1",
        { studentId: "student-1", tipo: "EMBARCOU" },
        motoristaActor,
      );

      expect(studentEventRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ routeStopId: "stop-embarque", tipo: "EMBARCOU" }),
      );
      expect(result.routeStopId).toBe("stop-embarque");
      expect(eventEmitter.emit).toHaveBeenCalled();
    });

    it("depois do EMBARCOU, avisa que chegou a vez do aluno DESEMBARCAR (ALUNO_VEZ_DESEMBARQUE) — a parada pendente mudou", async () => {
      routesService.listStops.mockResolvedValue([
        { id: "stop-desembarque", latitude: -23.0, longitude: -46.0, horarioPrevisto: "07:30" },
      ] as never);
      studentEventRepository.findByTripStudentAndTipo.mockResolvedValue(null);
      studentEventRepository.listByTrip.mockResolvedValue([
        { studentId: "student-1", tipo: "EMBARCOU" },
      ] as never);
      studentEventRepository.create.mockResolvedValue({
        id: "event-1",
        tripId: "trip-1",
        studentId: "student-1",
        routeStopId: "stop-embarque",
        tipo: "EMBARCOU",
        motivoAusencia: null,
        processadoPorId: "motorista-1",
        processadoEm: new Date(),
      } as never);

      await service.addStudentEvent(
        "trip-1",
        { studentId: "student-1", tipo: "EMBARCOU" },
        motoristaActor,
      );

      expect(messagePersonalizationService.alunoVezDesembarque).toHaveBeenCalledWith("Pedro");
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        COMMUNICATION_REQUESTED_EVENT,
        expect.objectContaining({
          userId: "responsavel-1",
          tipo: NotificationEventType.ALUNO_VEZ_DESEMBARQUE,
        }),
      );
      expect(tripRepository.update).toHaveBeenCalledWith("trip-1", {
        ultimaParadaEmVezNotificadaId: "stop-desembarque",
      });
    });

    it("rejeita registrar o MESMO evento duas vezes para o mesmo aluno na viagem", async () => {
      studentEventRepository.findByTripStudentAndTipo.mockResolvedValue({
        id: "event-existing",
      } as never);

      await expect(
        service.addStudentEvent(
          "trip-1",
          { studentId: "student-1", tipo: "EMBARCOU" },
          motoristaActor,
        ),
      ).rejects.toThrow(ConflictException);
      expect(studentEventRepository.create).not.toHaveBeenCalled();
    });
  });

  describe("pause/resume (Prompt Mestre, Seção 8 — ONLINE/OFFLINE/EM_VIAGEM/PAUSADO/FINALIZADA)", () => {
    it("pausa uma viagem em andamento e registra pausadaEm", async () => {
      const activeTrip = buildTrip();
      tripRepository.findById.mockResolvedValue(activeTrip);
      tripRepository.update.mockResolvedValue(
        buildTrip({ status: TripStatus.PAUSADA, pausadaEm: new Date() }),
      );

      const result = await service.pause("trip-1", motoristaActor, {});

      expect(tripRepository.update).toHaveBeenCalledWith(
        "trip-1",
        expect.objectContaining({ status: TripStatus.PAUSADA }),
      );
      expect(result.status).toBe(TripStatus.PAUSADA);
    });

    it("rejeita pausar uma viagem que não está em andamento", async () => {
      tripRepository.findById.mockResolvedValue(buildTrip({ status: TripStatus.PAUSADA }));

      await expect(service.pause("trip-1", motoristaActor, {})).rejects.toThrow(
        BadRequestException,
      );
      expect(tripRepository.update).not.toHaveBeenCalled();
    });

    it("rejeita pausar quando quem chama não é o motorista desta viagem (404, mesmo padrão de fetchOrThrow)", async () => {
      tripRepository.findById.mockResolvedValue(buildTrip({ motoristaId: "outro-motorista" }));

      await expect(service.pause("trip-1", motoristaActor, {})).rejects.toThrow(
        "Viagem não encontrada.",
      );
    });

    it("retoma uma viagem pausada e limpa pausadaEm", async () => {
      tripRepository.findById.mockResolvedValue(buildTrip({ status: TripStatus.PAUSADA }));
      tripRepository.update.mockResolvedValue(buildTrip({ status: TripStatus.EM_ANDAMENTO }));

      const result = await service.resume("trip-1", motoristaActor, {});

      expect(tripRepository.update).toHaveBeenCalledWith("trip-1", {
        status: TripStatus.EM_ANDAMENTO,
        pausadaEm: null,
      });
      expect(result.status).toBe(TripStatus.EM_ANDAMENTO);
    });

    it("rejeita retomar uma viagem que não está pausada", async () => {
      tripRepository.findById.mockResolvedValue(buildTrip({ status: TripStatus.EM_ANDAMENTO }));

      await expect(service.resume("trip-1", motoristaActor, {})).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe("findTodayByRoute", () => {
    it("devolve null quando nenhuma viagem foi registrada hoje para a rota", async () => {
      routesService.findByIdOrThrow.mockResolvedValue({ id: "route-1" } as never);
      tripRepository.findByRouteAndDate.mockResolvedValue(null);

      const result = await service.findTodayByRoute("route-1", motoristaActor);

      expect(result).toBeNull();
    });

    it("devolve a viagem de hoje quando existe, seja qual for o status", async () => {
      routesService.findByIdOrThrow.mockResolvedValue({ id: "route-1" } as never);
      tripRepository.findByRouteAndDate.mockResolvedValue(
        buildTrip({ status: TripStatus.PAUSADA }),
      );

      const result = await service.findTodayByRoute("route-1", motoristaActor);

      expect(result?.status).toBe(TripStatus.PAUSADA);
    });
  });

  describe("substituirMotorista/substituirVeiculo/substituirMonitor (ROT-05/06, tarefa #102)", () => {
    const activeTrip = buildTrip();

    beforeEach(() => {
      tripRepository.findById.mockResolvedValue(activeTrip);
    });

    it("rejeita quando quem chama não é gestor/empresa/admin (ex. o próprio motorista)", async () => {
      await expect(
        service.substituirMotorista("trip-1", { motoristaId: "motorista-2" }, motoristaActor, {}),
      ).rejects.toThrow(ForbiddenException);
      expect(tripRepository.update).not.toHaveBeenCalled();
    });

    it("rejeita substituir motorista/veículo/monitor de uma viagem que não está em andamento", async () => {
      tripRepository.findById.mockResolvedValue(buildTrip({ status: TripStatus.FINALIZADA }));

      await expect(
        service.substituirMotorista("trip-1", { motoristaId: "motorista-2" }, empresaActor, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejeita motoristaId sem vínculo ativo de Motorista na empresa", async () => {
      usersService.findActiveMembership.mockResolvedValue(null);

      await expect(
        service.substituirMotorista("trip-1", { motoristaId: "motorista-2" }, empresaActor, {}),
      ).rejects.toThrow(BadRequestException);
      expect(tripRepository.update).not.toHaveBeenCalled();
    });

    it("substitui o motorista, atualiza só a Trip e notifica os alunos ativos", async () => {
      usersService.findActiveMembership.mockResolvedValue({ role: Role.MOTORISTA } as never);
      usersService.findById.mockResolvedValue({ nome: "João" } as never);
      tripRepository.update.mockResolvedValue(buildTrip({ motoristaId: "motorista-2" }));

      const result = await service.substituirMotorista(
        "trip-1",
        { motoristaId: "motorista-2" },
        empresaActor,
        {},
      );

      expect(tripRepository.update).toHaveBeenCalledWith("trip-1", { motoristaId: "motorista-2" });
      expect(routesService.notifyActiveStudents).toHaveBeenCalledWith(
        "route-1",
        expect.any(Function),
        "MOTORISTA_ALTERADO",
        empresaActor,
      );
      expect(result.motoristaId).toBe("motorista-2");
    });

    it("REGRESSÃO — permite substituir de volta pelo dono AUTONOMO/MEI (Membership.role = EMPRESA)", async () => {
      usersService.findActiveMembership.mockResolvedValue({ role: Role.EMPRESA } as never);
      usersService.isAutonomoOuMei.mockResolvedValue(true);
      tripRepository.update.mockResolvedValue(buildTrip({ motoristaId: empresaActor.sub }));

      const result = await service.substituirMotorista(
        "trip-1",
        { motoristaId: empresaActor.sub },
        empresaActor,
        {},
      );

      expect(usersService.isAutonomoOuMei).toHaveBeenCalledWith(empresaActor.sub, "company-1");
      expect(tripRepository.update).toHaveBeenCalledWith("trip-1", {
        motoristaId: empresaActor.sub,
      });
      expect(result.motoristaId).toBe(empresaActor.sub);
    });

    it("é um no-op (sem update/auditoria/notificação) quando o motoristaId é o mesmo já em uso", async () => {
      await service.substituirMotorista(
        "trip-1",
        { motoristaId: activeTrip.motoristaId },
        empresaActor,
        {},
      );

      expect(tripRepository.update).not.toHaveBeenCalled();
      expect(routesService.notifyActiveStudents).not.toHaveBeenCalled();
    });

    it("rejeita substituir veículo sem capacidade suficiente (RN-CAP-01)", async () => {
      routesService.assertVeiculoCapacidade.mockRejectedValue(
        new BadRequestException("capacidade insuficiente"),
      );

      await expect(
        service.substituirVeiculo("trip-1", { veiculoId: "vehicle-2" }, empresaActor, {}),
      ).rejects.toThrow(BadRequestException);
      expect(tripRepository.update).not.toHaveBeenCalled();
    });

    it("substitui o veículo, libera o anterior e ocupa o novo", async () => {
      routesService.assertVeiculoCapacidade.mockResolvedValue(undefined);
      tripRepository.update.mockResolvedValue(buildTrip({ veiculoId: "vehicle-2" }));
      vehiclesService.findByIdOrThrow.mockResolvedValue({ placa: "ABC1D23" } as never);

      const result = await service.substituirVeiculo(
        "trip-1",
        { veiculoId: "vehicle-2" },
        empresaActor,
        {},
      );

      expect(tripRepository.update).toHaveBeenCalledWith("trip-1", { veiculoId: "vehicle-2" });
      expect(vehiclesService.setCurrentTrip).toHaveBeenCalledWith("vehicle-1", null);
      expect(vehiclesService.setCurrentTrip).toHaveBeenCalledWith("vehicle-2", "trip-1");
      expect(routesService.notifyActiveStudents).toHaveBeenCalledWith(
        "route-1",
        expect.any(Function),
        "VEICULO_ALTERADO",
        empresaActor,
      );
      expect(result.veiculoId).toBe("vehicle-2");
    });

    it("rejeita monitorId sem vínculo ativo de Monitor na empresa", async () => {
      usersService.findActiveMembership.mockResolvedValue(null);

      await expect(
        service.substituirMonitor("trip-1", { monitorId: "monitor-2" }, empresaActor, {}),
      ).rejects.toThrow(BadRequestException);
      expect(tripRepository.update).not.toHaveBeenCalled();
    });

    it("permite remover o monitor da viagem (monitorId ausente)", async () => {
      tripRepository.findById.mockResolvedValue(buildTrip({ monitorId: "monitor-1" }));
      tripRepository.update.mockResolvedValue(buildTrip({ monitorId: null }));

      const result = await service.substituirMonitor("trip-1", {}, empresaActor, {});

      expect(tripRepository.update).toHaveBeenCalledWith("trip-1", { monitorId: null });
      expect(result.monitorId).toBeNull();
    });

    it("substitui o monitor e notifica os alunos ativos", async () => {
      usersService.findActiveMembership.mockResolvedValue({ role: Role.MONITOR } as never);
      usersService.findById.mockResolvedValue({ nome: "Maria" } as never);
      tripRepository.update.mockResolvedValue(buildTrip({ monitorId: "monitor-2" }));

      const result = await service.substituirMonitor(
        "trip-1",
        { monitorId: "monitor-2" },
        empresaActor,
        {},
      );

      expect(tripRepository.update).toHaveBeenCalledWith("trip-1", { monitorId: "monitor-2" });
      expect(routesService.notifyActiveStudents).toHaveBeenCalledWith(
        "route-1",
        expect.any(Function),
        "MONITOR_ALTERADO",
        empresaActor,
      );
      expect(result.monitorId).toBe("monitor-2");
    });
  });

  describe("recalcularProximasEtas / recálculo por ausência de aluno (tarefa #99)", () => {
    const stopA = {
      id: "stop-A",
      endereco: "Rua A",
      latitude: -23.1,
      longitude: -46.1,
      horarioPrevisto: "07:00",
    };
    const stopB = {
      id: "stop-B",
      endereco: "Rua B",
      latitude: -23.2,
      longitude: -46.2,
      horarioPrevisto: "07:10",
    };
    const stopC = {
      id: "stop-C",
      endereco: "Rua C",
      latitude: -23.3,
      longitude: -46.3,
      horarioPrevisto: "07:20",
    };
    const stopD = {
      id: "stop-D",
      endereco: "Rua D",
      latitude: -23.4,
      longitude: -46.4,
      horarioPrevisto: "07:30",
    };

    const vinculo1 = {
      id: "vinculo-1",
      routeId: "route-1",
      contractId: "contract-1",
      studentId: "student-1",
      paradaEmbarqueId: stopA.id,
      paradaDesembarqueId: stopB.id,
      ativo: true,
    };
    const vinculo2 = {
      id: "vinculo-2",
      routeId: "route-1",
      contractId: "contract-2",
      studentId: "student-2",
      paradaEmbarqueId: stopC.id,
      paradaDesembarqueId: stopD.id,
      ativo: true,
    };

    beforeEach(() => {
      tripRepository.findById.mockResolvedValue(buildTrip());
      routesService.listStops.mockResolvedValue([stopA, stopC, stopB, stopD] as never);
      routesService.listStudents.mockResolvedValue([vinculo1, vinculo2] as never);
    });

    it("rejeita recalcular ETAs de uma viagem que não está em andamento", async () => {
      tripRepository.findById.mockResolvedValue(buildTrip({ status: TripStatus.FINALIZADA }));

      await expect(service.recalcularProximasEtas("trip-1", empresaActor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("devolve vazio quando ainda não há nenhuma posição GPS registrada", async () => {
      positionRepository.findLatestByTrip.mockResolvedValue(null);
      studentEventRepository.listByTrip.mockResolvedValue([]);

      const result = await service.recalcularProximasEtas("trip-1", empresaActor);

      expect(result).toEqual([]);
      expect(geoEngineService.getRoute).not.toHaveBeenCalled();
    });

    it("devolve vazio quando todos os alunos já embarcaram e desembarcaram (nenhuma parada pendente)", async () => {
      positionRepository.findLatestByTrip.mockResolvedValue({
        latitude: -23.0,
        longitude: -46.0,
      } as never);
      studentEventRepository.listByTrip.mockResolvedValue([
        { studentId: "student-1", tipo: "EMBARCOU" },
        { studentId: "student-1", tipo: "DESEMBARCOU" },
        { studentId: "student-2", tipo: "AUSENTE" },
      ] as never);

      const result = await service.recalcularProximasEtas("trip-1", empresaActor);

      expect(result).toEqual([]);
      expect(geoEngineService.getRoute).not.toHaveBeenCalled();
    });

    it("recalcula o ETA acumulado só para as paradas ainda pendentes, reordenadas da mais pra menos próxima do veículo (não mais a ordem fixa da rota)", async () => {
      positionRepository.findLatestByTrip.mockResolvedValue({
        latitude: -23.0,
        longitude: -46.0,
      } as never);
      // student-1 já embarcou (falta só o desembarque, parada B); student-2
      // ainda não fez nada (falta o embarque, parada C) — parada A (já
      // embarcado) e D (aluno 2 não embarcou ainda, então não pendente)
      // ficam de fora. B (-23.2/-46.2) está mais perto da posição atual
      // (-23.0/-46.0) do que C (-23.3/-46.3) — o vizinho-mais-próximo
      // guloso (`ordenarPorProximidade`) visita B primeiro, mesmo B tendo
      // aparecido DEPOIS de C na ordem cadastrada da rota
      // (`routesService.listStops` retorna `[stopA, stopC, stopB, stopD]`).
      studentEventRepository.listByTrip.mockResolvedValue([
        { studentId: "student-1", tipo: "EMBARCOU" },
      ] as never);
      geoEngineService.getRoute.mockResolvedValue({
        distanciaMetros: 1500,
        duracaoSegundos: 180,
        geometria: null,
        pernas: [
          { distanciaMetros: 1000, duracaoSegundos: 120 },
          { distanciaMetros: 500, duracaoSegundos: 60 },
        ],
      });

      const result = await service.recalcularProximasEtas("trip-1", empresaActor);

      expect(geoEngineService.getRoute).toHaveBeenCalledWith(
        { latitude: -23.0, longitude: -46.0 },
        { latitude: stopC.latitude, longitude: stopC.longitude },
        [{ latitude: stopB.latitude, longitude: stopB.longitude }],
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        routeStopId: stopB.id,
        distanciaMetros: 1000,
        etaSegundos: 120,
      });
      expect(result[1]).toMatchObject({
        routeStopId: stopC.id,
        distanciaMetros: 1500,
        etaSegundos: 180,
      });
    });

    it("addStudentEvent(AUSENTE) notifica best-effort os responsáveis da PRÓXIMA parada pendente com o novo ETA", async () => {
      const activeTrip = buildTrip();
      tripRepository.findById.mockResolvedValue(activeTrip);
      // vínculo do próprio aluno marcado ausente (necessário para
      // addStudentEvent aceitar o evento).
      routesService.listStudents.mockResolvedValue([vinculo1, vinculo2] as never);
      studentEventRepository.findByTripStudentAndTipo.mockResolvedValue(null);
      studentEventRepository.create.mockResolvedValue({
        id: "event-1",
        tripId: "trip-1",
        studentId: "student-1",
        routeStopId: stopA.id,
        tipo: "AUSENTE",
        motivoAusencia: "Doente",
        processadoPorId: "motorista-1",
        processadoEm: new Date(),
      } as never);
      contractsService.findRawByIdOrThrow.mockResolvedValue({
        responsavelId: "responsavel-2",
        companyId: "company-1",
      } as never);
      studentsService.findRawById.mockResolvedValue({ nome: "Bia" } as never);

      positionRepository.findLatestByTrip.mockResolvedValue({
        latitude: -23.0,
        longitude: -46.0,
      } as never);
      // Depois de student-1 ficar AUSENTE, a parada A não é mais
      // pendente (nem embarque nem desembarque) — a próxima pendente é
      // C (embarque de student-2).
      studentEventRepository.listByTrip.mockResolvedValue([
        { studentId: "student-1", tipo: "AUSENTE" },
      ] as never);
      geoEngineService.getRoute.mockResolvedValue({
        distanciaMetros: 800,
        duracaoSegundos: 90,
        geometria: null,
        pernas: [{ distanciaMetros: 800, duracaoSegundos: 90 }],
      });

      await service.addStudentEvent(
        "trip-1",
        { studentId: "student-1", tipo: "AUSENTE", motivoAusencia: "Doente" },
        motoristaActor,
      );

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          userId: "responsavel-2",
          tipo: "VEICULO_PROXIMO",
          dadosContexto: { routeId: "route-1", studentId: "student-2" },
        }),
      );
    });

    it("nunca lança (best-effort) quando o GeoEngineService falha após uma AUSÊNCIA", async () => {
      routesService.listStudents.mockResolvedValue([vinculo1] as never);
      studentEventRepository.findByTripStudentAndTipo.mockResolvedValue(null);
      studentEventRepository.create.mockResolvedValue({
        id: "event-1",
        tripId: "trip-1",
        studentId: "student-1",
        routeStopId: stopA.id,
        tipo: "AUSENTE",
        motivoAusencia: "Doente",
        processadoPorId: "motorista-1",
        processadoEm: new Date(),
      } as never);
      contractsService.findRawByIdOrThrow.mockResolvedValue({
        responsavelId: "responsavel-1",
        companyId: "company-1",
      } as never);
      studentsService.findRawById.mockResolvedValue({ nome: "João" } as never);

      positionRepository.findLatestByTrip.mockResolvedValue({
        latitude: -23.0,
        longitude: -46.0,
      } as never);
      studentEventRepository.listByTrip.mockResolvedValue([]);
      geoEngineService.getRoute.mockRejectedValue(new Error("OSRM fora do ar"));

      await expect(
        service.addStudentEvent(
          "trip-1",
          { studentId: "student-1", tipo: "AUSENTE", motivoAusencia: "Doente" },
          motoristaActor,
        ),
      ).resolves.toBeDefined();
    });
  });

  describe("desvio de endereço por dia (StudentAddressOverride) — 'waypoint efetivo'", () => {
    const stopCompartilhada = {
      id: "stop-compartilhada",
      endereco: "Rua da Escola, 100",
      latitude: -23.1,
      longitude: -46.1,
      horarioPrevisto: "07:00",
    };

    const vinculoComDesvio = {
      id: "vinculo-1",
      routeId: "route-1",
      contractId: "contract-1",
      studentId: "student-1",
      paradaEmbarqueId: stopCompartilhada.id,
      paradaDesembarqueId: "stop-2",
      ativo: true,
    };
    const vinculoSemDesvio = {
      id: "vinculo-2",
      routeId: "route-1",
      contractId: "contract-2",
      studentId: "student-2",
      paradaEmbarqueId: stopCompartilhada.id,
      paradaDesembarqueId: "stop-2",
      ativo: true,
    };

    const override = {
      id: "override-1",
      studentId: "student-1",
      data: "2026-08-26",
      trecho: "AMBOS",
      cep: "24000-000",
      logradouro: "Rua Nova Provisória",
      numero: "42",
      complemento: null,
      bairro: "Centro",
      cidade: "Niterói",
      estado: "RJ",
      latitude: -22.9,
      longitude: -43.1,
      observacao: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    beforeEach(() => {
      tripRepository.findById.mockResolvedValue(buildTrip());
      routesService.listStops.mockResolvedValue([stopCompartilhada] as never);
      routesService.listStudents.mockResolvedValue([vinculoComDesvio, vinculoSemDesvio] as never);
    });

    it("usa as coordenadas do desvio (não as da parada compartilhada) para o aluno com StudentAddressOverride ativo hoje", async () => {
      studentsService.listAddressOverridesByStudentsAndDate.mockResolvedValue(
        new Map([["student-1", override]]) as never,
      );
      positionRepository.findLatestByTrip.mockResolvedValue({
        latitude: -23.0,
        longitude: -46.0,
      } as never);
      studentEventRepository.listByTrip.mockResolvedValue([]);
      geoEngineService.getRoute.mockResolvedValue({
        distanciaMetros: 900,
        duracaoSegundos: 100,
        geometria: null,
        pernas: [{ distanciaMetros: 400, duracaoSegundos: 40 }],
      });

      const result = await service.recalcularProximasEtas("trip-1", empresaActor);

      // Um aluno com desvio ativo e outro sem, na MESMA parada física,
      // viram duas entradas distintas — nunca uma só.
      expect(result).toHaveLength(2);
      const entradaComDesvio = result.find((item) => item.routeStopId === "override:override-1");
      expect(entradaComDesvio).toBeDefined();
      expect(entradaComDesvio).toMatchObject({
        endereco: "Rua Nova Provisória, 42 - Centro, Niterói/RJ",
      });
      const entradaSemDesvio = result.find((item) => item.routeStopId === stopCompartilhada.id);
      expect(entradaSemDesvio).toBeDefined();
      expect(entradaSemDesvio).toMatchObject({ endereco: stopCompartilhada.endereco });
    });

    it("REGRESSÃO — listStudentPendingLocations expõe a coordenada EFETIVA por aluno (a mesma do desvio, não a da parada física) pro raio de embarque/desembarque", async () => {
      studentsService.listAddressOverridesByStudentsAndDate.mockResolvedValue(
        new Map([["student-1", override]]) as never,
      );
      studentEventRepository.listByTrip.mockResolvedValue([]);

      const result = await service.listStudentPendingLocations("trip-1", empresaActor);

      expect(result).toHaveLength(2);
      const doAlunoComDesvio = result.find((item) => item.studentId === "student-1");
      expect(doAlunoComDesvio).toMatchObject({
        tipo: "EMBARQUE",
        routeStopId: stopCompartilhada.id,
        latitude: override.latitude,
        longitude: override.longitude,
        endereco: "Rua Nova Provisória, 42 - Centro, Niterói/RJ",
      });
      const doAlunoSemDesvio = result.find((item) => item.studentId === "student-2");
      expect(doAlunoSemDesvio).toMatchObject({
        tipo: "EMBARQUE",
        routeStopId: stopCompartilhada.id,
        latitude: stopCompartilhada.latitude,
        longitude: stopCompartilhada.longitude,
      });
    });

    it("REGRESSÃO — nunca inventa coordenada (0,0) quando a parada referenciada pelo vínculo não existe mais na rota (marcador fantasma em Null Island, auditoria 27/08/2026)", async () => {
      const vinculoComPendenciaOrfa = {
        id: "vinculo-3",
        routeId: "route-1",
        contractId: "contract-3",
        studentId: "student-3",
        // "stop-removida" nunca aparece no `routesService.listStops` mockado
        // acima (só `stopCompartilhada` existe) — simula uma parada
        // excluída/recriada depois do aluno já ter sido vinculado a ela.
        paradaEmbarqueId: "stop-removida",
        paradaDesembarqueId: "stop-2",
        ativo: true,
      };
      routesService.listStudents.mockResolvedValue([
        vinculoComDesvio,
        vinculoSemDesvio,
        vinculoComPendenciaOrfa,
      ] as never);
      studentsService.listAddressOverridesByStudentsAndDate.mockResolvedValue(
        new Map([["student-1", override]]) as never,
      );
      studentEventRepository.listByTrip.mockResolvedValue([]);

      const result = await service.listStudentPendingLocations("trip-1", empresaActor);

      // Os 2 alunos com parada válida continuam aparecendo; o 3º (parada
      // órfã) simplesmente some da lista — nunca aparece com latitude/
      // longitude 0 (Golfo da Guiné).
      expect(result).toHaveLength(2);
      expect(result.some((item) => item.studentId === "student-3")).toBe(false);
      expect(result.some((item) => item.latitude === 0 && item.longitude === 0)).toBe(false);
    });

    it("ao iniciar a rota, notifica 'vez do aluno' usando o waypoint sintético do desvio (não o routeStopId real) na dedup", async () => {
      routesService.findByIdOrThrow.mockResolvedValue({
        id: "route-1",
        companyId: "company-1",
        status: "ATIVA",
        turno: "MANHA",
        motoristaPadraoId: null,
        monitorPadraoId: null,
        veiculoPadraoId: "vehicle-1",
      } as never);
      vehiclesService.findByIdOrThrow.mockResolvedValue({} as never);
      tripRepository.findByRouteAndDate.mockResolvedValue(null);
      tripRepository.create.mockResolvedValue(buildTrip());
      companiesService.getNomeFantasia.mockResolvedValue("Gama Transportes");
      studentsService.listAddressOverridesByStudentsAndDate.mockResolvedValue(
        new Map([["student-1", override]]) as never,
      );
      routesService.listStudents.mockResolvedValue([vinculoComDesvio] as never);
      contractsService.findRawByIdOrThrow.mockResolvedValue({
        responsavelId: "responsavel-1",
        companyId: "company-1",
      } as never);
      studentsService.findRawById.mockResolvedValue({ nome: "Isac Ribeiro" } as never);

      await service.start({ routeId: "route-1" }, motoristaActor, {});

      expect(messagePersonalizationService.alunoVezEmbarque).toHaveBeenCalledWith("Isac Ribeiro");
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        COMMUNICATION_REQUESTED_EVENT,
        expect.objectContaining({
          userId: "responsavel-1",
          tipo: NotificationEventType.ALUNO_VEZ_EMBARQUE,
          dadosContexto: { routeId: "route-1", studentId: "student-1" },
        }),
      );
      // A dedup grava o waypoint EFETIVO (sintético do desvio), não o
      // routeStopId real da parada compartilhada — senão um segundo aluno
      // sem desvio na mesma parada física nunca seria notificado depois.
      expect(tripRepository.update).toHaveBeenCalledWith("trip-1", {
        ultimaParadaEmVezNotificadaId: "override:override-1",
      });
    });

    it("um desvio só de DESEMBARQUE não se aplica ao embarque do mesmo aluno (continua na parada real)", async () => {
      const overrideSoDesembarque = { ...override, trecho: "DESEMBARQUE" };
      studentsService.listAddressOverridesByStudentsAndDate.mockResolvedValue(
        new Map([["student-1", overrideSoDesembarque]]) as never,
      );
      positionRepository.findLatestByTrip.mockResolvedValue({
        latitude: -23.0,
        longitude: -46.0,
      } as never);
      studentEventRepository.listByTrip.mockResolvedValue([]);
      geoEngineService.getRoute.mockResolvedValue({
        distanciaMetros: 400,
        duracaoSegundos: 40,
        geometria: null,
        pernas: [],
      });

      const result = await service.recalcularProximasEtas("trip-1", empresaActor);

      // Embarque de ambos os alunos continua na mesma parada física real —
      // o desvio (só de desembarque) não se aplica aqui, então dedup por
      // waypoint junta os dois no mesmo `routeStopId`, não em dois.
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ routeStopId: stopCompartilhada.id });
    });
  });

  describe("ingestPosition — geofencing real (Prompt 'Rotta Geo Platform' §25/26)", () => {
    const paradaPerto = {
      id: "stop-perto",
      endereco: "Rua Perto",
      // ~111m ao norte de -23.000/-46.000 (0.001° de latitude) — dentro do raio de 400m.
      latitude: -22.999,
      longitude: -46.0,
      horarioPrevisto: "07:00",
    };
    const paradaLonge = {
      id: "stop-longe",
      endereco: "Rua Longe",
      // ~11km ao norte — bem fora do raio de 400m.
      latitude: -22.9,
      longitude: -46.0,
      horarioPrevisto: "07:30",
    };
    const vinculo = {
      id: "vinculo-1",
      routeId: "route-1",
      contractId: "contract-1",
      studentId: "student-1",
      paradaEmbarqueId: paradaPerto.id,
      paradaDesembarqueId: "stop-outra",
      ativo: true,
    };

    const posicaoPerto = { latitude: -23.0, longitude: -46.0, capturadaEm: "2026-08-10T10:00:00Z" };

    beforeEach(() => {
      tripRepository.findById.mockResolvedValue(buildTrip());
      positionRepository.create.mockResolvedValue({
        id: "position-1",
        tripId: "trip-1",
        companyId: "company-1",
        latitude: posicaoPerto.latitude,
        longitude: posicaoPerto.longitude,
        precisaoMetros: null,
        velocidadeKmh: null,
        capturadaEm: new Date(posicaoPerto.capturadaEm),
        simuladoSuspeito: false,
        createdAt: new Date(),
      } as never);
      vehiclesService.updateLocationFromTrip.mockResolvedValue(undefined);
      routesService.listStudents.mockResolvedValue([vinculo] as never);
      studentEventRepository.listByTrip.mockResolvedValue([]);
      contractsService.findRawByIdOrThrow.mockResolvedValue({
        responsavelId: "responsavel-1",
        companyId: "company-1",
      } as never);
      studentsService.findRawById.mockResolvedValue({ nome: "Maria" } as never);
    });

    it("notifica VEICULO_PROXIMO quando a posição entra no raio da próxima parada pendente", async () => {
      routesService.listStops.mockResolvedValue([paradaPerto] as never);

      await service.ingestPosition("trip-1", posicaoPerto, motoristaActor);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        COMMUNICATION_REQUESTED_EVENT,
        expect.objectContaining({
          userId: "responsavel-1",
          tipo: NotificationEventType.VEICULO_PROXIMO,
        }),
      );
      expect(tripRepository.update).toHaveBeenCalledWith("trip-1", {
        ultimaParadaProximaNotificadaId: paradaPerto.id,
      });
    });

    it("não notifica quando a posição ainda está fora do raio da próxima parada pendente", async () => {
      routesService.listStops.mockResolvedValue([paradaLonge] as never);
      routesService.listStudents.mockResolvedValue([
        { ...vinculo, paradaEmbarqueId: paradaLonge.id },
      ] as never);

      await service.ingestPosition("trip-1", posicaoPerto, motoristaActor);

      expect(eventEmitter.emit).not.toHaveBeenCalled();
      expect(tripRepository.update).not.toHaveBeenCalled();
    });

    it("não notifica de novo a mesma parada (dedup via ultimaParadaProximaNotificadaId)", async () => {
      tripRepository.findById.mockResolvedValue(
        buildTrip({ ultimaParadaProximaNotificadaId: paradaPerto.id }),
      );
      routesService.listStops.mockResolvedValue([paradaPerto] as never);

      await service.ingestPosition("trip-1", posicaoPerto, motoristaActor);

      expect(eventEmitter.emit).not.toHaveBeenCalled();
      expect(tripRepository.update).not.toHaveBeenCalled();
    });

    it("nunca lança mesmo se a notificação de aproximação falhar (best-effort)", async () => {
      routesService.listStops.mockResolvedValue([paradaPerto] as never);
      contractsService.findRawByIdOrThrow.mockRejectedValue(new Error("indisponível"));

      await expect(
        service.ingestPosition("trip-1", posicaoPerto as never, motoristaActor),
      ).resolves.toBeDefined();
    });

    it("não notifica quando não há nenhuma parada pendente", async () => {
      routesService.listStops.mockResolvedValue([paradaPerto] as never);
      routesService.listStudents.mockResolvedValue([]);

      await service.ingestPosition("trip-1", posicaoPerto, motoristaActor);

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    });

    it("com duas paradas pendentes ao mesmo tempo, considera 'próxima' a geograficamente mais perto do veículo, não a primeira na ordem cadastrada da rota (pedido do usuário: 'a Rotta AI vai direcionar para o aluno/responsável mais próximo')", async () => {
      // `paradaLonge` aparece PRIMEIRO na ordem cadastrada da rota, mas
      // `paradaPerto` está geograficamente mais perto da posição atual do
      // veículo — sem o vizinho-mais-próximo guloso, o código antigo
      // notificaria sobre `paradaLonge` só por ela vir primeiro em
      // `listStops`.
      routesService.listStops.mockResolvedValue([paradaLonge, paradaPerto] as never);
      routesService.listStudents.mockResolvedValue([
        vinculo,
        { ...vinculo, id: "vinculo-2", studentId: "student-2", paradaEmbarqueId: paradaLonge.id },
      ] as never);

      await service.ingestPosition("trip-1", posicaoPerto, motoristaActor);

      expect(eventEmitter.emit).toHaveBeenCalledWith(
        COMMUNICATION_REQUESTED_EVENT,
        expect.objectContaining({
          userId: "responsavel-1",
          tipo: NotificationEventType.VEICULO_PROXIMO,
          dadosContexto: { routeId: "route-1", studentId: "student-1" },
        }),
      );
      expect(tripRepository.update).toHaveBeenCalledWith("trip-1", {
        ultimaParadaProximaNotificadaId: paradaPerto.id,
      });
    });
  });

  describe("listActiveForMap", () => {
    it("Empresa/Gestor: usa sempre o próprio tenantId, nunca lê `companyIdParam`", async () => {
      tripRepository.listActiveByCompany.mockResolvedValue([]);

      await service.listActiveForMap(empresaActor, "outra-empresa-tentando-passar-por-query");

      expect(tripRepository.listActiveByCompany).toHaveBeenCalledWith("company-1");
      expect(tripRepository.listActiveNationwide).not.toHaveBeenCalled();
    });

    it("Admin Rotta COM companyId: mapa de uma empresa só, igual Empresa/Gestor", async () => {
      tripRepository.listActiveByCompany.mockResolvedValue([]);

      await service.listActiveForMap(adminActor, "company-9");

      expect(tripRepository.listActiveByCompany).toHaveBeenCalledWith("company-9");
      expect(tripRepository.listActiveNationwide).not.toHaveBeenCalled();
    });

    it("Admin Rotta SEM companyId: Mapa Nacional de Veículos (cross-tenant), com nome da empresa em cada marcador", async () => {
      tripRepository.listActiveNationwide.mockResolvedValue([
        {
          ...buildTrip({ companyId: "company-1" }),
          veiculo: {
            id: "vehicle-1",
            placa: "ABC1D23",
            ultimaLatitude: -23.5,
            ultimaLongitude: -46.6,
            ultimaPosicaoEm: new Date(),
          } as never,
          route: { id: "route-1", nome: "Rota A", turno: "MANHA" },
          motorista: { id: "motorista-1", nome: "João" },
          monitor: null,
          company: {
            id: "company-1",
            nomeFantasia: "Transportadora Azul",
            cidade: "São Paulo",
            bairro: "Vila Mariana",
            cpfCnpj: "12345678000199",
          },
        },
      ]);

      const result = await service.listActiveForMap(adminActor);

      expect(tripRepository.listActiveNationwide).toHaveBeenCalledTimes(1);
      expect(tripRepository.listActiveByCompany).not.toHaveBeenCalled();
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({
        companyId: "company-1",
        companyNome: "Transportadora Azul",
        companyCidade: "São Paulo",
        companyBairro: "Vila Mariana",
        companyCpfCnpj: "12345678000199",
        placa: "ABC1D23",
      });
    });
  });

  describe("listStudentEventsHistory (Responsável — Hoje/Semana/Mês)", () => {
    it("valida a posse do aluno antes de ler o histórico (nunca cross-Responsável)", async () => {
      studentsService.findByIdOrThrow.mockRejectedValue(new Error("não encontrado"));

      await expect(
        service.listStudentEventsHistory("student-1", empresaActor, new Date()),
      ).rejects.toThrow("não encontrado");

      expect(studentEventRepository.listByStudentAcrossTenants).not.toHaveBeenCalled();
    });

    it("devolve os eventos do aluno cruzando tenants, a partir do `since` recebido", async () => {
      studentsService.findByIdOrThrow.mockResolvedValue({ id: "student-1" } as never);
      const since = new Date("2026-08-10T00:00:00Z");
      studentEventRepository.listByStudentAcrossTenants.mockResolvedValue([
        {
          id: "event-1",
          tripId: "trip-1",
          studentId: "student-1",
          routeStopId: "stop-1",
          tipo: "EMBARCOU",
          motivoAusencia: null,
          processadoPorId: "user-1",
          processadoEm: new Date("2026-08-10T12:00:00Z"),
        } as never,
      ]);

      const result = await service.listStudentEventsHistory("student-1", empresaActor, since);

      expect(studentEventRepository.listByStudentAcrossTenants).toHaveBeenCalledWith(
        "student-1",
        since,
      );
      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: "event-1", tipo: "EMBARCOU" });
    });
  });

  describe("getStudentsAttendanceToday (Frente 1 — fluxo novo de Rotas, 'ao reiniciar a rota')", () => {
    it("marca ausenteHoje: false pra aluno sem nenhum evento hoje", async () => {
      studentEventRepository.listStudentIdsAusenteToday.mockResolvedValue([]);

      const result = await service.getStudentsAttendanceToday(["student-1"], empresaActor);

      expect(result).toEqual([{ studentId: "student-1", ausenteHoje: false }]);
    });

    it("marca ausenteHoje: true pra aluno com evento AUSENTE hoje", async () => {
      studentEventRepository.listStudentIdsAusenteToday.mockResolvedValue(["student-1"]);

      const result = await service.getStudentsAttendanceToday(["student-1"], empresaActor);

      expect(result).toEqual([{ studentId: "student-1", ausenteHoje: true }]);
    });

    it("marca ausenteHoje: false pra aluno com EMBARCOU+DESEMBARCOU hoje sem AUSENTE", async () => {
      // O repositório só devolve quem tem AUSENTE — um aluno que só
      // embarcou/desembarcou nunca entra nessa lista, então o service
      // já responde `false` sem precisar de nenhuma lógica extra aqui.
      studentEventRepository.listStudentIdsAusenteToday.mockResolvedValue([]);

      const result = await service.getStudentsAttendanceToday(["student-2"], empresaActor);

      expect(result).toEqual([{ studentId: "student-2", ausenteHoje: false }]);
    });

    it("nunca vaza AUSENTE de outra empresa — o isolamento é feito pelo repositório (RLS de withTenant), não filtrado aqui", async () => {
      // Este teste documenta a garantia: `TripsService` passa os
      // `studentIds` recebidos direto pro repositório, sem nenhum
      // `companyId` explícito — é a chamada `withTenant` (RLS real no
      // Postgres) dentro de `PrismaTripStudentEventRepository` quem
      // garante que só eventos da empresa do ator autenticado (a
      // sessão do banco) entram no resultado. Um aluno com `AUSENTE`
      // registrado por OUTRA empresa nunca chega a
      // `listStudentIdsAusenteToday` pra começo de conversa — o mock
      // aqui simula exatamente isso: mesmo perguntando por um aluno
      // "compartilhado", o repositório só devolve o que a RLS permitiu.
      studentEventRepository.listStudentIdsAusenteToday.mockResolvedValue([]);

      const result = await service.getStudentsAttendanceToday(
        ["student-de-outra-empresa"],
        empresaActor,
      );

      expect(result).toEqual([{ studentId: "student-de-outra-empresa", ausenteHoje: false }]);
      expect(studentEventRepository.listStudentIdsAusenteToday).toHaveBeenCalledWith(
        ["student-de-outra-empresa"],
        expect.any(Date),
      );
    });
  });
});
