import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";


import { RatingsService } from "../ratings.service";

import type { ContractRepository } from "../repositories/contract.repository";
import type { RatingRepository } from "../repositories/rating.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { Contract, Rating } from "@prisma/client";

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

const THIRTY_ONE_DAYS_AGO = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
const TEN_DAYS_AGO = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

function buildContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: "contract-1",
    transportRequestId: "request-1",
    studentId: "student-1",
    responsavelId: "responsavel-1",
    companyId: "company-1",
    schoolId: "school-1",
    vehicleId: "vehicle-1",
    motoristaId: "motorista-1",
    monitorId: "monitor-1",
    valorMensalidadeCentavos: 35000,
    planoDescricao: "Mensal",
    regras: "Sem regras especiais.",
    vigenciaInicio: new Date("2026-01-01"),
    vigenciaFim: null,
    status: "ATIVO",
    authentiqueDocumentId: null,
    assinadoResponsavelEm: new Date(),
    assinadoEmpresaEm: new Date(),
    ativadoEm: THIRTY_ONE_DAYS_AGO,
    encerradoEm: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildRating(overrides: Partial<Rating> = {}): Rating {
  return {
    id: "rating-1",
    contractId: "contract-1",
    responsavelId: "responsavel-1",
    companyId: "company-1",
    alvoTipo: "MOTORISTA",
    alvoId: "motorista-1",
    nota: 5,
    comentario: null,
    createdAt: new Date(),
    ...overrides,
  };
}

describe("RatingsService", () => {
  let service: RatingsService;
  let ratingRepository: jest.Mocked<RatingRepository>;
  let contractRepository: jest.Mocked<ContractRepository>;
  let auditLogService: jest.Mocked<AuditLogService>;

  beforeEach(() => {
    ratingRepository = {
      create: jest.fn(),
      findByContractResponsavelAlvo: jest.fn(),
      listByContract: jest.fn(),
    };
    contractRepository = {
      create: jest.fn(),
      findByTransportRequestId: jest.fn(),
      findByIdScoped: jest.fn(),
      findById: jest.fn(),
      updateAsEmpresa: jest.fn(),
      updateAsResponsavel: jest.fn(),
      activate: jest.fn(),
      list: jest.fn(),
    };
    auditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditLogService>;

    service = new RatingsService(ratingRepository, contractRepository, auditLogService);
  });

  describe("create", () => {
    it("404 quando o contrato não existe/não pertence ao Responsável", async () => {
      contractRepository.findByIdScoped.mockResolvedValue(null);

      await expect(
        service.create("contract-1", { alvoTipo: "MOTORISTA", nota: 5 }, responsavelActor, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it("rejeita quando o contrato ainda não foi ativado", async () => {
      contractRepository.findByIdScoped.mockResolvedValue(buildContract({ ativadoEm: null }));

      await expect(
        service.create("contract-1", { alvoTipo: "MOTORISTA", nota: 5 }, responsavelActor, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it("rejeita quando ainda não passaram 30 dias da ativação", async () => {
      contractRepository.findByIdScoped.mockResolvedValue(
        buildContract({ ativadoEm: TEN_DAYS_AGO }),
      );

      await expect(
        service.create("contract-1", { alvoTipo: "MOTORISTA", nota: 5 }, responsavelActor, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it("rejeita avaliar um alvo que o contrato não tem atribuído (ex. sem monitor)", async () => {
      contractRepository.findByIdScoped.mockResolvedValue(buildContract({ monitorId: null }));

      await expect(
        service.create("contract-1", { alvoTipo: "MONITOR", nota: 4 }, responsavelActor, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it("rejeita avaliação duplicada do mesmo alvo no mesmo contrato", async () => {
      contractRepository.findByIdScoped.mockResolvedValue(buildContract());
      ratingRepository.findByContractResponsavelAlvo.mockResolvedValue(buildRating());

      await expect(
        service.create("contract-1", { alvoTipo: "MOTORISTA", nota: 5 }, responsavelActor, {}),
      ).rejects.toThrow(ConflictException);
    });

    it("resolve alvoId a partir do contrato (nunca do cliente) para cada alvoTipo", async () => {
      contractRepository.findByIdScoped.mockResolvedValue(buildContract());
      ratingRepository.findByContractResponsavelAlvo.mockResolvedValue(null);
      ratingRepository.create.mockResolvedValue(buildRating());

      await service.create(
        "contract-1",
        { alvoTipo: "EMPRESA", nota: 5, comentario: "Ótimo!" },
        responsavelActor,
        {},
      );

      expect(ratingRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          contractId: "contract-1",
          responsavelId: "responsavel-1",
          companyId: "company-1",
          alvoTipo: "EMPRESA",
          alvoId: "company-1",
          nota: 5,
          comentario: "Ótimo!",
        }),
      );
    });

    it("resolve alvoId do veículo corretamente", async () => {
      contractRepository.findByIdScoped.mockResolvedValue(buildContract());
      ratingRepository.findByContractResponsavelAlvo.mockResolvedValue(null);
      ratingRepository.create.mockResolvedValue(
        buildRating({ alvoTipo: "VEICULO", alvoId: "vehicle-1" }),
      );

      await service.create("contract-1", { alvoTipo: "VEICULO", nota: 4 }, responsavelActor, {});

      expect(ratingRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ alvoTipo: "VEICULO", alvoId: "vehicle-1" }),
      );
    });
  });

  describe("listByContract", () => {
    it("404 quando o contrato não existe/está fora do escopo da Empresa", async () => {
      contractRepository.findByIdScoped.mockResolvedValue(null);

      await expect(service.listByContract("contract-1", empresaActor)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("lista as avaliações escopadas para a Empresa (contexto ambiente, sem bypass)", async () => {
      contractRepository.findByIdScoped.mockResolvedValue(buildContract());
      ratingRepository.listByContract.mockResolvedValue([buildRating()]);

      const result = await service.listByContract("contract-1", empresaActor);

      expect(contractRepository.findByIdScoped).toHaveBeenCalledWith("contract-1", {
        companyId: "company-1",
      });
      expect(ratingRepository.listByContract).toHaveBeenCalledWith("contract-1", {
        companyId: "company-1",
      });
      expect(result).toHaveLength(1);
    });

    it("lista as avaliações escopadas para o Responsável", async () => {
      contractRepository.findByIdScoped.mockResolvedValue(buildContract());
      ratingRepository.listByContract.mockResolvedValue([buildRating()]);

      await service.listByContract("contract-1", responsavelActor);

      expect(ratingRepository.listByContract).toHaveBeenCalledWith("contract-1", {
        responsavelId: "responsavel-1",
      });
    });
  });
});
