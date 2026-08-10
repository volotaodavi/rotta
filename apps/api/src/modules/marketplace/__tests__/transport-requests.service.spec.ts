import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";

import { TransportRequestsService } from "../transport-requests.service";

import type { TransportRequestRepository } from "../repositories/transport-request.repository";
import type {
  TransporterCandidate,
  TransporterRepository,
} from "../repositories/transporter.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { StudentsService } from "@/modules/students/students.service";
import type { TransportRequest } from "@prisma/client";

import { Role } from "@/shared/enums";

const responsavelActor: AuthenticatedUser = {
  sub: "responsavel-1",
  tenantId: null,
  role: Role.RESPONSAVEL,
  vinculoId: "responsavel-1",
};

const empresaActor: AuthenticatedUser = {
  sub: "user-empresa",
  tenantId: "company-1",
  role: Role.EMPRESA,
  vinculoId: "vinculo-1",
};

const adminActor: AuthenticatedUser = {
  sub: "admin-1",
  tenantId: null,
  role: Role.ADMIN_ROTTA,
  vinculoId: "admin-1",
};

function buildTransportRequest(overrides: Partial<TransportRequest> = {}): TransportRequest {
  return {
    id: "request-1",
    studentId: "student-1",
    responsavelId: "responsavel-1",
    companyId: "company-1",
    schoolId: "school-1",
    turno: "MANHA",
    status: "RECEBIDA",
    motivoRecusa: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildCandidate(): TransporterCandidate {
  return {
    company: { id: "company-1" } as unknown as TransporterCandidate["company"],
    veiculosAtivos: [],
    alunosTransportadosIds: [],
    ratings: [],
    mensalidadesAtivasCentavos: [],
  };
}

describe("TransportRequestsService", () => {
  let service: TransportRequestsService;
  let transportRequestRepository: jest.Mocked<TransportRequestRepository>;
  let transporterRepository: jest.Mocked<TransporterRepository>;
  let studentsService: jest.Mocked<Pick<StudentsService, "findByIdOrThrow" | "create">>;
  let auditLogService: jest.Mocked<AuditLogService>;

  beforeEach(() => {
    transportRequestRepository = {
      create: jest.fn(),
      findByIdScoped: jest.fn(),
      findById: jest.fn(),
      findOpenByStudentAndCompany: jest.fn(),
      updateStatus: jest.fn(),
      list: jest.fn(),
    };
    transporterRepository = {
      searchCandidates: jest.fn(),
      findCandidateById: jest.fn(),
      listRecentRatingsForCompany: jest.fn(),
      listActiveSchoolsForCompany: jest.fn().mockResolvedValue([]),
      listPublicTeamForCompany: jest.fn().mockResolvedValue([]),
      computeAverageResponseHours: jest.fn().mockResolvedValue(null),
    };
    studentsService = {
      findByIdOrThrow: jest.fn(),
      create: jest.fn(),
    };
    auditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditLogService>;

    service = new TransportRequestsService(
      transportRequestRepository,
      transporterRepository,
      studentsService as unknown as StudentsService,
      auditLogService,
    );
  });

  describe("create", () => {
    it("rejeita quando studentId e novoAluno vêm juntos", async () => {
      await expect(
        service.create(
          { companyId: "company-1", studentId: "student-1", novoAluno: {} as never },
          responsavelActor,
          {},
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it("rejeita quando nem studentId nem novoAluno vêm preenchidos", async () => {
      await expect(
        service.create({ companyId: "company-1" }, responsavelActor, {}),
      ).rejects.toThrow(BadRequestException);
    });

    it("404 quando o transportador não existe/não está ativo", async () => {
      transporterRepository.findCandidateById.mockResolvedValue(null);

      await expect(
        service.create({ companyId: "company-x", studentId: "student-1" }, responsavelActor, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it("usa o aluno já cadastrado quando studentId é informado", async () => {
      transporterRepository.findCandidateById.mockResolvedValue(buildCandidate());
      studentsService.findByIdOrThrow.mockResolvedValue({
        id: "student-1",
        schoolId: "school-1",
        turno: "MANHA",
      } as never);
      transportRequestRepository.findOpenByStudentAndCompany.mockResolvedValue(null);
      transportRequestRepository.create.mockResolvedValue(buildTransportRequest());

      await service.create(
        { companyId: "company-1", studentId: "student-1" },
        responsavelActor,
        {},
      );

      expect(studentsService.findByIdOrThrow).toHaveBeenCalledWith("student-1", responsavelActor);
      expect(studentsService.create).not.toHaveBeenCalled();
      expect(transportRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: "student-1",
          responsavelId: "responsavel-1",
          companyId: "company-1",
          schoolId: "school-1",
          turno: "MANHA",
        }),
      );
    });

    it("cria o aluno inline quando novoAluno é informado", async () => {
      transporterRepository.findCandidateById.mockResolvedValue(buildCandidate());
      studentsService.create.mockResolvedValue({
        id: "student-novo",
        schoolId: "school-2",
        turno: "TARDE",
      } as never);
      transportRequestRepository.findOpenByStudentAndCompany.mockResolvedValue(null);
      transportRequestRepository.create.mockResolvedValue(
        buildTransportRequest({ studentId: "student-novo" }),
      );

      await service.create(
        { companyId: "company-1", novoAluno: { nome: "Novo Aluno" } as never },
        responsavelActor,
        {},
      );

      expect(studentsService.create).toHaveBeenCalledWith(
        { nome: "Novo Aluno" },
        responsavelActor,
        {},
      );
      expect(transportRequestRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          studentId: "student-novo",
          schoolId: "school-2",
          turno: "TARDE",
        }),
      );
    });

    it("rejeita quando já existe solicitação em aberto para o mesmo par aluno/empresa", async () => {
      transporterRepository.findCandidateById.mockResolvedValue(buildCandidate());
      studentsService.findByIdOrThrow.mockResolvedValue({
        id: "student-1",
        schoolId: "school-1",
        turno: "MANHA",
      } as never);
      transportRequestRepository.findOpenByStudentAndCompany.mockResolvedValue(
        buildTransportRequest(),
      );

      await expect(
        service.create({ companyId: "company-1", studentId: "student-1" }, responsavelActor, {}),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe("findByIdOrThrow — RBAC por papel", () => {
    it("Responsável usa escopo por responsavelId", async () => {
      transportRequestRepository.findByIdScoped.mockResolvedValue(buildTransportRequest());

      await service.findByIdOrThrow("request-1", responsavelActor);

      expect(transportRequestRepository.findByIdScoped).toHaveBeenCalledWith("request-1", {
        responsavelId: "responsavel-1",
      });
    });

    it("Empresa usa escopo por companyId", async () => {
      transportRequestRepository.findByIdScoped.mockResolvedValue(buildTransportRequest());

      await service.findByIdOrThrow("request-1", empresaActor);

      expect(transportRequestRepository.findByIdScoped).toHaveBeenCalledWith("request-1", {
        companyId: "company-1",
      });
    });

    it("Admin Rotta usa findById puro (sem escopo)", async () => {
      transportRequestRepository.findById.mockResolvedValue(buildTransportRequest());

      await service.findByIdOrThrow("request-1", adminActor);

      expect(transportRequestRepository.findById).toHaveBeenCalledWith("request-1");
      expect(transportRequestRepository.findByIdScoped).not.toHaveBeenCalled();
    });

    it("404 quando fora do escopo", async () => {
      transportRequestRepository.findByIdScoped.mockResolvedValue(null);

      await expect(service.findByIdOrThrow("request-1", empresaActor)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("transições de status — exclusivas da Empresa/Gestor", () => {
    it("marcarEmAnalise só a partir de RECEBIDA", async () => {
      transportRequestRepository.findByIdScoped.mockResolvedValue(
        buildTransportRequest({ status: "EM_ANALISE" }),
      );

      await expect(service.marcarEmAnalise("request-1", empresaActor, {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("marcarEmAnalise funciona a partir de RECEBIDA", async () => {
      transportRequestRepository.findByIdScoped.mockResolvedValue(buildTransportRequest());
      transportRequestRepository.updateStatus.mockResolvedValue(
        buildTransportRequest({ status: "EM_ANALISE" }),
      );

      const result = await service.marcarEmAnalise("request-1", empresaActor, {});

      expect(result.status).toBe("EM_ANALISE");
      expect(transportRequestRepository.updateStatus).toHaveBeenCalledWith("request-1", {
        status: "EM_ANALISE",
      });
    });

    it("aprovar rejeita quando já está APROVADA/RECUSADA", async () => {
      transportRequestRepository.findByIdScoped.mockResolvedValue(
        buildTransportRequest({ status: "RECUSADA" }),
      );

      await expect(service.aprovar("request-1", empresaActor, {})).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("aprovar funciona a partir de RECEBIDA ou EM_ANALISE", async () => {
      transportRequestRepository.findByIdScoped.mockResolvedValue(
        buildTransportRequest({ status: "EM_ANALISE" }),
      );
      transportRequestRepository.updateStatus.mockResolvedValue(
        buildTransportRequest({ status: "APROVADA" }),
      );

      const result = await service.aprovar("request-1", empresaActor, {});

      expect(result.status).toBe("APROVADA");
    });

    it("recusar exige motivo e rejeita quando já encerrada", async () => {
      transportRequestRepository.findByIdScoped.mockResolvedValue(
        buildTransportRequest({ status: "APROVADA" }),
      );

      await expect(
        service.recusar("request-1", { motivoRecusa: "Sem vagas" }, empresaActor, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it("recusar funciona e grava o motivo", async () => {
      transportRequestRepository.findByIdScoped.mockResolvedValue(buildTransportRequest());
      transportRequestRepository.updateStatus.mockResolvedValue(
        buildTransportRequest({ status: "RECUSADA", motivoRecusa: "Sem vagas" }),
      );

      const result = await service.recusar(
        "request-1",
        { motivoRecusa: "Sem vagas" },
        empresaActor,
        {},
      );

      expect(result.status).toBe("RECUSADA");
      expect(result.motivoRecusa).toBe("Sem vagas");
      expect(transportRequestRepository.updateStatus).toHaveBeenCalledWith("request-1", {
        status: "RECUSADA",
        motivoRecusa: "Sem vagas",
      });
    });
  });
});
