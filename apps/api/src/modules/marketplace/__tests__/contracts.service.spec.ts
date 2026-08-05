import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";

import { ContractsService } from "../contracts.service";

import type { ContractRepository } from "../repositories/contract.repository";
import type { TransportRequestRepository } from "../repositories/transport-request.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { AuthentiqueService } from "@/modules/authentique/authentique.service";
import type { CompaniesService } from "@/modules/companies/companies.service";
import type { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import type { RottaAiService } from "@/modules/rotta-ai/rotta-ai.service";
import type { WalletService } from "@/modules/wallet/wallet.service";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import type { Contract, TransportRequest } from "@prisma/client";

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

function buildTransportRequest(overrides: Partial<TransportRequest> = {}): TransportRequest {
  return {
    id: "request-1",
    studentId: "student-1",
    responsavelId: "responsavel-1",
    companyId: "company-1",
    schoolId: "school-1",
    turno: "MANHA",
    status: "APROVADA",
    motivoRecusa: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: "contract-1",
    transportRequestId: "request-1",
    studentId: "student-1",
    responsavelId: "responsavel-1",
    companyId: "company-1",
    schoolId: "school-1",
    vehicleId: null,
    motoristaId: null,
    monitorId: null,
    valorMensalidadeCentavos: 35000,
    planoDescricao: "Mensal",
    regras: "Sem regras especiais.",
    vigenciaInicio: new Date("2026-02-01"),
    vigenciaFim: null,
    status: "AGUARDANDO_ASSINATURA",
    authentiqueDocumentId: null,
    assinadoResponsavelEm: null,
    assinadoEmpresaEm: null,
    ativadoEm: null,
    encerradoEm: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildCreateContractDto() {
  return {
    valorMensalidadeCentavos: 35000,
    planoDescricao: "Mensal",
    regras: "Sem regras especiais.",
    vigenciaInicio: "2026-02-01",
  };
}

describe("ContractsService", () => {
  let service: ContractsService;
  let contractRepository: jest.Mocked<ContractRepository>;
  let transportRequestRepository: jest.Mocked<TransportRequestRepository>;
  let authentiqueService: jest.Mocked<Pick<AuthentiqueService, "prepararDocumentoParaAssinatura">>;
  let rottaAiService: jest.Mocked<Pick<RottaAiService, "validarContratoAssinado">>;
  let auditLogService: jest.Mocked<AuditLogService>;
  let companiesService: jest.Mocked<Pick<CompaniesService, "getNomeFantasia">>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let messagePersonalizationService: jest.Mocked<
    Pick<MessagePersonalizationService, "novoContrato" | "contratoAssinado">
  >;
  let walletService: jest.Mocked<Pick<WalletService, "registrarMensalidadePendente">>;

  beforeEach(() => {
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
    transportRequestRepository = {
      create: jest.fn(),
      findByIdScoped: jest.fn(),
      findById: jest.fn(),
      findOpenByStudentAndCompany: jest.fn(),
      updateStatus: jest.fn(),
      list: jest.fn(),
    };
    authentiqueService = {
      prepararDocumentoParaAssinatura: jest.fn().mockRejectedValue(new Error("stub")),
    };
    rottaAiService = {
      validarContratoAssinado: jest.fn().mockRejectedValue(new Error("stub")),
    };
    auditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditLogService>;
    companiesService = {
      getNomeFantasia: jest.fn().mockResolvedValue("Gama Transportes"),
    };
    eventEmitter = {
      emit: jest.fn(),
    } as unknown as jest.Mocked<EventEmitter2>;
    messagePersonalizationService = {
      novoContrato: jest.fn().mockReturnValue({ titulo: "Novo contrato", corpo: "..." }),
      contratoAssinado: jest.fn().mockReturnValue({ titulo: "Contrato assinado", corpo: "..." }),
    };
    walletService = {
      registrarMensalidadePendente: jest.fn().mockResolvedValue(undefined),
    };

    service = new ContractsService(
      contractRepository,
      transportRequestRepository,
      authentiqueService,
      rottaAiService as unknown as RottaAiService,
      auditLogService,
      companiesService as unknown as CompaniesService,
      eventEmitter,
      messagePersonalizationService as unknown as MessagePersonalizationService,
      walletService as unknown as WalletService,
    );
  });

  describe("gerarContrato", () => {
    it("404 quando a solicitação não existe/não pertence à empresa", async () => {
      transportRequestRepository.findByIdScoped.mockResolvedValue(null);

      await expect(
        service.gerarContrato("request-1", buildCreateContractDto(), empresaActor, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it("rejeita quando a solicitação não está Aprovada", async () => {
      transportRequestRepository.findByIdScoped.mockResolvedValue(
        buildTransportRequest({ status: "RECEBIDA" }),
      );

      await expect(
        service.gerarContrato("request-1", buildCreateContractDto(), empresaActor, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it("rejeita quando já existe um contrato para esta solicitação", async () => {
      transportRequestRepository.findByIdScoped.mockResolvedValue(buildTransportRequest());
      contractRepository.findByTransportRequestId.mockResolvedValue(buildContract());

      await expect(
        service.gerarContrato("request-1", buildCreateContractDto(), empresaActor, {}),
      ).rejects.toThrow(ConflictException);
    });

    it("cria o contrato com dados derivados da solicitação e segue mesmo com Authentique indisponível", async () => {
      transportRequestRepository.findByIdScoped.mockResolvedValue(buildTransportRequest());
      contractRepository.findByTransportRequestId.mockResolvedValue(null);
      contractRepository.create.mockResolvedValue(buildContract());

      const result = await service.gerarContrato(
        "request-1",
        buildCreateContractDto(),
        empresaActor,
        {},
      );

      expect(contractRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          transportRequestId: "request-1",
          studentId: "student-1",
          responsavelId: "responsavel-1",
          companyId: "company-1",
          schoolId: "school-1",
          valorMensalidadeCentavos: 35000,
        }),
      );
      expect(authentiqueService.prepararDocumentoParaAssinatura).toHaveBeenCalledWith({
        contractId: "contract-1",
      });
      expect(result.status).toBe("AGUARDANDO_ASSINATURA");
    });
  });

  describe("findByIdOrThrow — RBAC", () => {
    it("Responsável usa escopo por responsavelId", async () => {
      contractRepository.findByIdScoped.mockResolvedValue(buildContract());

      await service.findByIdOrThrow("contract-1", responsavelActor);

      expect(contractRepository.findByIdScoped).toHaveBeenCalledWith("contract-1", {
        responsavelId: "responsavel-1",
      });
    });

    it("404 fora do escopo", async () => {
      contractRepository.findByIdScoped.mockResolvedValue(null);

      await expect(service.findByIdOrThrow("contract-1", empresaActor)).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("assinatura", () => {
    it("assinarComoResponsavel rejeita quando o contrato não está aguardando assinatura", async () => {
      contractRepository.findByIdScoped.mockResolvedValue(buildContract({ status: "ATIVO" }));

      await expect(
        service.assinarComoResponsavel("contract-1", responsavelActor, {}),
      ).rejects.toThrow(ForbiddenException);
    });

    it("assinarComoResponsavel rejeita assinatura duplicada", async () => {
      contractRepository.findByIdScoped.mockResolvedValue(
        buildContract({ assinadoResponsavelEm: new Date() }),
      );

      await expect(
        service.assinarComoResponsavel("contract-1", responsavelActor, {}),
      ).rejects.toThrow(ConflictException);
    });

    it("assinarComoResponsavel funciona, mas NÃO ativa enquanto a Empresa não assinou também", async () => {
      contractRepository.findByIdScoped.mockResolvedValue(buildContract());
      contractRepository.updateAsResponsavel.mockResolvedValue(
        buildContract({ assinadoResponsavelEm: new Date() }),
      );

      const result = await service.assinarComoResponsavel("contract-1", responsavelActor, {});

      expect(result.assinadoResponsavelEm).not.toBeNull();
      expect(contractRepository.updateAsResponsavel).toHaveBeenCalledWith(
        "contract-1",
        expect.objectContaining({ assinadoResponsavelEm: expect.any(Date) }),
      );
      expect(contractRepository.activate).not.toHaveBeenCalled();
    });

    it("assinarComoEmpresa funciona, mas NÃO ativa enquanto o Responsável não assinou também", async () => {
      contractRepository.findByIdScoped.mockResolvedValue(buildContract());
      contractRepository.updateAsEmpresa.mockResolvedValue(
        buildContract({ assinadoEmpresaEm: new Date() }),
      );

      const result = await service.assinarComoEmpresa("contract-1", empresaActor, {});

      expect(result.assinadoEmpresaEm).not.toBeNull();
      expect(contractRepository.updateAsEmpresa).toHaveBeenCalledWith(
        "contract-1",
        expect.objectContaining({ assinadoEmpresaEm: expect.any(Date) }),
      );
      expect(contractRepository.activate).not.toHaveBeenCalled();
    });

    it("assinarComoEmpresa rejeita assinatura duplicada", async () => {
      contractRepository.findByIdScoped.mockResolvedValue(
        buildContract({ assinadoEmpresaEm: new Date() }),
      );

      await expect(service.assinarComoEmpresa("contract-1", empresaActor, {})).rejects.toThrow(
        ConflictException,
      );
    });
  });

  describe("ativação automática pós-assinatura (Rotta AI best-effort)", () => {
    it("ativa quando a assinatura do Responsável completa as duas (Empresa já havia assinado)", async () => {
      contractRepository.findByIdScoped.mockResolvedValue(
        buildContract({ assinadoEmpresaEm: new Date() }),
      );
      contractRepository.updateAsResponsavel.mockResolvedValue(
        buildContract({ assinadoEmpresaEm: new Date(), assinadoResponsavelEm: new Date() }),
      );
      contractRepository.activate.mockResolvedValue(
        buildContract({
          assinadoEmpresaEm: new Date(),
          assinadoResponsavelEm: new Date(),
          status: "ATIVO",
          ativadoEm: new Date(),
        }),
      );

      const result = await service.assinarComoResponsavel("contract-1", responsavelActor, {});

      expect(rottaAiService.validarContratoAssinado).toHaveBeenCalledWith({
        contractId: "contract-1",
      });
      expect(contractRepository.activate).toHaveBeenCalledWith("contract-1");
      expect(result.status).toBe("ATIVO");
      expect(result.ativadoEm).not.toBeNull();
    });

    it("ativa quando a assinatura da Empresa completa as duas, mesmo com Rotta AI indisponível", async () => {
      contractRepository.findByIdScoped.mockResolvedValue(
        buildContract({ assinadoResponsavelEm: new Date() }),
      );
      contractRepository.updateAsEmpresa.mockResolvedValue(
        buildContract({ assinadoResponsavelEm: new Date(), assinadoEmpresaEm: new Date() }),
      );
      contractRepository.activate.mockResolvedValue(
        buildContract({
          assinadoResponsavelEm: new Date(),
          assinadoEmpresaEm: new Date(),
          status: "ATIVO",
          ativadoEm: new Date(),
        }),
      );

      const result = await service.assinarComoEmpresa("contract-1", empresaActor, {});

      expect(contractRepository.activate).toHaveBeenCalledWith("contract-1");
      expect(result.status).toBe("ATIVO");
    });
  });
});
