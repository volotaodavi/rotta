import { BadRequestException, ConflictException } from "@nestjs/common";
import { RouteStatus, SchoolShift } from "@prisma/client";

import { RoutesService } from "../routes.service";

import type { RouteStopRepository } from "../repositories/route-stop.repository";
import type { RouteStudentRepository } from "../repositories/route-student.repository";
import type { RouteRepository } from "../repositories/route.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { ContractsService } from "@/modules/marketplace/contracts.service";
import type { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import type { StudentsService } from "@/modules/students/students.service";
import type { UsersService } from "@/modules/users/users.service";
import type { VehiclesService } from "@/modules/vehicles/vehicles.service";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import type { Contract, Route, RouteStop } from "@prisma/client";

import { Role } from "@/shared/enums";

function buildRoute(overrides: Partial<Route> = {}): Route {
  return {
    id: "route-1",
    companyId: "company-1",
    nome: "Rota Manhã",
    turno: SchoolShift.MANHA,
    diasSemana: ["SEGUNDA"],
    status: RouteStatus.ATIVA,
    veiculoPadraoId: null,
    motoristaPadraoId: null,
    monitorPadraoId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  };
}

function buildStop(overrides: Partial<RouteStop> = {}): RouteStop {
  return {
    id: "stop-1",
    routeId: "route-1",
    companyId: "company-1",
    ordem: 0,
    endereco: "Rua A, 1",
    latitude: -23.5 as unknown as RouteStop["latitude"],
    longitude: -46.6 as unknown as RouteStop["longitude"],
    horarioPrevisto: "07:00",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: "contract-1",
    transportRequestId: "tr-1",
    studentId: "student-1",
    responsavelId: "responsavel-1",
    companyId: "company-1",
    schoolId: "school-1",
    vehicleId: null,
    motoristaId: null,
    monitorId: null,
    valorMensalidadeCentavos: 10000,
    planoDescricao: "Plano",
    regras: "Regras",
    vigenciaInicio: new Date(),
    vigenciaFim: null,
    status: "ATIVO",
    authentiqueDocumentId: null,
    assinadoResponsavelEm: new Date(),
    assinadoEmpresaEm: new Date(),
    ativadoEm: new Date(),
    encerradoEm: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

const empresaActor: AuthenticatedUser = {
  sub: "user-empresa-1",
  tenantId: "company-1",
  role: Role.EMPRESA,
  vinculoId: "vinculo-1",
};

describe("RoutesService", () => {
  let service: RoutesService;
  let routeRepository: jest.Mocked<RouteRepository>;
  let routeStopRepository: jest.Mocked<RouteStopRepository>;
  let routeStudentRepository: jest.Mocked<RouteStudentRepository>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let contractsService: jest.Mocked<ContractsService>;
  let studentsService: jest.Mocked<StudentsService>;
  let usersService: jest.Mocked<UsersService>;
  let vehiclesService: jest.Mocked<Pick<VehiclesService, "findByIdOrThrow">>;
  let messagePersonalizationService: jest.Mocked<MessagePersonalizationService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;

  beforeEach(() => {
    routeRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      list: jest.fn(),
      listAllActive: jest.fn(),
    };
    routeStopRepository = {
      create: jest.fn(),
      createMany: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      listByRoute: jest.fn(),
      delete: jest.fn(),
      reorder: jest.fn(),
    };
    routeStudentRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      findByContractId: jest.fn(),
      update: jest.fn(),
      listByRoute: jest.fn(),
      listActiveByStudentAcrossTenants: jest.fn(),
      delete: jest.fn(),
    };
    auditLogService = {
      record: jest.fn(),
      listByCompany: jest.fn(),
    } as unknown as jest.Mocked<AuditLogService>;
    contractsService = {
      findRawByIdOrThrow: jest.fn(),
    } as unknown as jest.Mocked<ContractsService>;
    studentsService = {
      findRawById: jest.fn(),
    } as unknown as jest.Mocked<StudentsService>;
    usersService = {
      findActiveMembership: jest.fn(),
      findById: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;
    vehiclesService = {
      findByIdOrThrow: jest.fn(),
    };
    messagePersonalizationService = {
      motoristaAlterado: jest.fn().mockReturnValue({ titulo: "t", corpo: "c" }),
      monitorAlterado: jest.fn().mockReturnValue({ titulo: "t", corpo: "c" }),
      rotaAlterada: jest.fn().mockReturnValue({ titulo: "t", corpo: "c" }),
    } as unknown as jest.Mocked<MessagePersonalizationService>;
    eventEmitter = { emit: jest.fn() } as unknown as jest.Mocked<EventEmitter2>;

    service = new RoutesService(
      routeRepository,
      routeStopRepository,
      routeStudentRepository,
      auditLogService,
      contractsService,
      studentsService,
      usersService,
      vehiclesService as unknown as VehiclesService,
      eventEmitter,
      messagePersonalizationService,
    );
  });

  describe("create", () => {
    it("cria a rota com o companyId do ator autenticado", async () => {
      routeRepository.create.mockResolvedValue(buildRoute());

      const result = await service.create(
        { nome: "Rota Manhã", turno: SchoolShift.MANHA, diasSemana: ["SEGUNDA"] as never },
        empresaActor,
        {},
      );

      expect(routeRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: "company-1", nome: "Rota Manhã" }),
      );
      expect(result.id).toBe("route-1");
    });

    it("rejeita motoristaPadraoId sem vínculo ativo de Motorista", async () => {
      usersService.findActiveMembership.mockResolvedValue(null);

      await expect(
        service.create(
          {
            nome: "Rota Manhã",
            turno: SchoolShift.MANHA,
            diasSemana: ["SEGUNDA"] as never,
            motoristaPadraoId: "motorista-x",
          },
          empresaActor,
          {},
        ),
      ).rejects.toThrow(BadRequestException);
      expect(routeRepository.create).not.toHaveBeenCalled();
    });

    it("permite veiculoPadraoId em create — nenhum aluno vinculado ainda (capacidade sempre satisfeita)", async () => {
      vehiclesService.findByIdOrThrow.mockResolvedValue({
        capacidadePassageiros: 4,
      } as never);
      routeRepository.create.mockResolvedValue(buildRoute({ veiculoPadraoId: "veiculo-1" }));

      await service.create(
        {
          nome: "Rota Manhã",
          turno: SchoolShift.MANHA,
          diasSemana: ["SEGUNDA"] as never,
          veiculoPadraoId: "veiculo-1",
        },
        empresaActor,
        {},
      );

      expect(routeRepository.create).toHaveBeenCalled();
    });
  });

  describe("update — ROT-06/RN-CAP-01 (capacidade do veículo substituto)", () => {
    it("rejeita quando a capacidade do veículo é menor que o número de alunos ativos vinculados", async () => {
      routeRepository.findById.mockResolvedValue(buildRoute());
      routeStudentRepository.listByRoute.mockResolvedValue(
        Array.from({ length: 15 }, (_, i) => ({ id: `vinculo-${i}` }) as never),
      );
      vehiclesService.findByIdOrThrow.mockResolvedValue({ capacidadePassageiros: 12 } as never);

      await expect(
        service.update("route-1", { veiculoPadraoId: "veiculo-pequeno" }, empresaActor, {}),
      ).rejects.toThrow(BadRequestException);
      expect(routeRepository.update).not.toHaveBeenCalled();
    });

    it("permite quando a capacidade do veículo é suficiente", async () => {
      routeRepository.findById.mockResolvedValue(buildRoute());
      routeStudentRepository.listByRoute.mockResolvedValue([{ id: "vinculo-1" } as never]);
      vehiclesService.findByIdOrThrow.mockResolvedValue({ capacidadePassageiros: 12 } as never);
      routeRepository.update.mockResolvedValue(buildRoute({ veiculoPadraoId: "veiculo-grande" }));

      await service.update("route-1", { veiculoPadraoId: "veiculo-grande" }, empresaActor, {});

      expect(routeRepository.update).toHaveBeenCalled();
    });
  });

  describe("addStudent — RN-26 (um aluno não pode estar em duas rotas ativas do mesmo turno)", () => {
    it("lança ConflictException quando o aluno já está em outra rota ativa do MESMO turno", async () => {
      routeRepository.findById.mockResolvedValue(
        buildRoute({ id: "route-1", turno: SchoolShift.MANHA }),
      );
      contractsService.findRawByIdOrThrow.mockResolvedValue(
        buildContract({ studentId: "student-1", companyId: "company-1" }),
      );
      routeStudentRepository.findByContractId.mockResolvedValue(null);
      routeStopRepository.findById.mockImplementation((id) =>
        Promise.resolve(buildStop({ id, routeId: "route-1" })),
      );
      routeStudentRepository.listActiveByStudentAcrossTenants.mockResolvedValue([
        {
          id: "vinculo-outro",
          routeId: "route-2",
          companyId: "company-1",
          contractId: "contract-2",
          studentId: "student-1",
          paradaEmbarqueId: "stop-x",
          paradaDesembarqueId: "stop-y",
          ativo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          route: { turno: SchoolShift.MANHA, companyId: "company-1" },
        },
      ]);

      await expect(
        service.addStudent(
          "route-1",
          { contractId: "contract-1", paradaEmbarqueId: "stop-1", paradaDesembarqueId: "stop-2" },
          empresaActor,
          {},
        ),
      ).rejects.toThrow(ConflictException);
      expect(routeStudentRepository.create).not.toHaveBeenCalled();
    });

    it("permite o aluno em duas rotas ativas de turnos DIFERENTES (ex. ida/volta)", async () => {
      routeRepository.findById.mockResolvedValue(
        buildRoute({ id: "route-1", turno: SchoolShift.MANHA }),
      );
      contractsService.findRawByIdOrThrow.mockResolvedValue(
        buildContract({ studentId: "student-1", companyId: "company-1" }),
      );
      routeStudentRepository.findByContractId.mockResolvedValue(null);
      routeStopRepository.findById.mockImplementation((id) =>
        Promise.resolve(buildStop({ id, routeId: "route-1" })),
      );
      routeStudentRepository.listActiveByStudentAcrossTenants.mockResolvedValue([
        {
          id: "vinculo-outro",
          routeId: "route-2",
          companyId: "company-1",
          contractId: "contract-2",
          studentId: "student-1",
          paradaEmbarqueId: "stop-x",
          paradaDesembarqueId: "stop-y",
          ativo: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          route: { turno: SchoolShift.TARDE, companyId: "company-1" },
        },
      ]);
      routeStudentRepository.create.mockResolvedValue({
        id: "vinculo-1",
        routeId: "route-1",
        companyId: "company-1",
        contractId: "contract-1",
        studentId: "student-1",
        paradaEmbarqueId: "stop-1",
        paradaDesembarqueId: "stop-2",
        ativo: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.addStudent(
        "route-1",
        { contractId: "contract-1", paradaEmbarqueId: "stop-1", paradaDesembarqueId: "stop-2" },
        empresaActor,
        {},
      );

      expect(result.id).toBe("vinculo-1");
      expect(routeStudentRepository.create).toHaveBeenCalled();
    });

    it("rejeita contrato que não está ATIVO", async () => {
      routeRepository.findById.mockResolvedValue(buildRoute());
      contractsService.findRawByIdOrThrow.mockResolvedValue(
        buildContract({ status: "AGUARDANDO_ASSINATURA" as never }),
      );

      await expect(
        service.addStudent(
          "route-1",
          { contractId: "contract-1", paradaEmbarqueId: "stop-1", paradaDesembarqueId: "stop-2" },
          empresaActor,
          {},
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
