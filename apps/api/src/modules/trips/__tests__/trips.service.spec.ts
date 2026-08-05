import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";
import { TripStatus } from "@prisma/client";

import { TripsService } from "../trips.service";

import type { TripPositionRepository } from "../repositories/trip-position.repository";
import type { TripStudentEventRepository } from "../repositories/trip-student-event.repository";
import type { TripRepository } from "../repositories/trip.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { GeoEngineService } from "@/modules/geo/geo-engine.service";
import type { ContractsService } from "@/modules/marketplace/contracts.service";
import type { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import type { RoutesService } from "@/modules/routes/routes.service";
import type { StudentsService } from "@/modules/students/students.service";
import type { UsersService } from "@/modules/users/users.service";
import type { VehiclesService } from "@/modules/vehicles/vehicles.service";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import type { Trip } from "@prisma/client";

import { Role } from "@/shared/enums";

function buildTrip(overrides: Partial<Trip> = {}): Trip {
  return {
    id: "trip-1",
    companyId: "company-1",
    routeId: "route-1",
    data: new Date(),
    status: TripStatus.EM_ANDAMENTO,
    veiculoId: "vehicle-1",
    motoristaId: "motorista-1",
    monitorId: null,
    iniciadaEm: new Date(),
    finalizadaEm: null,
    canceladaEm: null,
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

  beforeEach(() => {
    tripRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByRouteAndDate: jest.fn(),
      update: jest.fn(),
      listActiveByCompany: jest.fn(),
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
    } as unknown as jest.Mocked<VehiclesService>;
    contractsService = {
      findRawByIdOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ContractsService>;
    studentsService = {
      findRawById: jest.fn(),
      findByIdOrThrow: jest.fn(),
    } as unknown as jest.Mocked<StudentsService>;
    usersService = {
      findActiveMembership: jest.fn(),
      findById: jest.fn(),
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
    } as unknown as jest.Mocked<MessagePersonalizationService>;
    geoEngineService = {
      getRoute: jest.fn(),
    } as unknown as jest.Mocked<GeoEngineService>;

    routesService.listStudents.mockResolvedValue([]);
    routesService.listStops.mockResolvedValue([]);
    positionRepository.findLatestByTrip.mockResolvedValue(null);

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

    it("rejeita quando já existe uma viagem hoje para a mesma rota", async () => {
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
      tripRepository.findByRouteAndDate.mockResolvedValue(buildTrip());

      await expect(service.start({ routeId: "route-1" }, motoristaActor, {})).rejects.toThrow(
        ConflictException,
      );
      expect(tripRepository.create).not.toHaveBeenCalled();
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

    it("exige motivoAusencia quando tipo = AUSENTE", async () => {
      await expect(
        service.addStudentEvent(
          "trip-1",
          { studentId: "student-1", tipo: "AUSENTE" },
          motoristaActor,
        ),
      ).rejects.toThrow(BadRequestException);
      expect(studentEventRepository.create).not.toHaveBeenCalled();
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

    it("recalcula o ETA acumulado só para as paradas ainda pendentes, na ordem da rota", async () => {
      positionRepository.findLatestByTrip.mockResolvedValue({
        latitude: -23.0,
        longitude: -46.0,
      } as never);
      // student-1 já embarcou (falta só o desembarque, parada B); student-2
      // ainda não fez nada (falta o embarque, parada C) — parada A (já
      // embarcado) e D (aluno 2 não embarcou ainda, então não pendente)
      // ficam de fora.
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
        { latitude: stopB.latitude, longitude: stopB.longitude },
        [{ latitude: stopC.latitude, longitude: stopC.longitude }],
      );
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({
        routeStopId: stopC.id,
        distanciaMetros: 1000,
        etaSegundos: 120,
      });
      expect(result[1]).toMatchObject({
        routeStopId: stopB.id,
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
});
