import { BadRequestException, ConflictException } from "@nestjs/common";
import { TripStatus } from "@prisma/client";


import { TripsService } from "../trips.service";

import type { TripPositionRepository } from "../repositories/trip-position.repository";
import type { TripStudentEventRepository } from "../repositories/trip-student-event.repository";
import type { TripRepository } from "../repositories/trip.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
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
      findActiveRouteIdsForStudent: jest.fn(),
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
    } as unknown as jest.Mocked<MessagePersonalizationService>;

    routesService.listStudents.mockResolvedValue([]);

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
});
