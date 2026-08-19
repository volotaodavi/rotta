import { ConflictException, ForbiddenException, NotFoundException } from "@nestjs/common";

import { ContractsService } from "../contracts.service";

import type { ContractRepository } from "../repositories/contract.repository";
import type { TransportRequestRepository } from "../repositories/transport-request.repository";
import type { TermoCienciaPdfService } from "../termo-ciencia-pdf.service";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { AuthentiqueService } from "@/modules/authentique/authentique.service";
import type { CompaniesService } from "@/modules/companies/companies.service";
import type { CompanyRepository } from "@/modules/companies/repositories/company.repository";
import type { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import type { RottaAiService } from "@/modules/rotta-ai/rotta-ai.service";
import type { SchoolRepository } from "@/modules/schools/repositories/school.repository";
import type { StudentsService } from "@/modules/students/students.service";
import type { UsersService } from "@/modules/users/users.service";
import type { WalletService } from "@/modules/wallet/wallet.service";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import type { Company, Contract, School, Student, TransportRequest, User } from "@prisma/client";

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
    origem: "NEGOCIADO",
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

function buildCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: "company-1",
    codigoInterno: "TRN-000001",
    razaoSocial: "Gama Transportes LTDA",
    nomeFantasia: "Gama Transportes",
    cpfCnpj: "11222333000181",
    tipo: "LTDA",
    email: "contato@gama.com",
    telefone: "11999990000",
    whatsapp: null,
    cep: "01000-000",
    endereco: "Rua Exemplo",
    numero: "100",
    complemento: null,
    bairro: "Centro",
    cidade: "São Paulo",
    estado: "SP",
    latitude: null,
    longitude: null,
    logoUrl: null,
    fotoUrl: null,
    corPrimaria: "#3B6EF6",
    idioma: "pt-BR",
    fusoHorario: "America/Sao_Paulo",
    status: "ATIVO",
    planId: null,
    trialExpiraEm: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    deletedAt: null,
    ...overrides,
  } as unknown as Company;
}

function buildStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: "student-1",
    responsavelId: "responsavel-1",
    nome: "Pedro Aluno",
    fotoUrl: null,
    fotoPath: null,
    dataNascimento: new Date("2015-01-01"),
    sexo: "MASCULINO",
    schoolId: "school-1",
    turno: "MANHA",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as Student;
}

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: "responsavel-1",
    nome: "Carla Responsável",
    email: "carla@example.com",
    telefone: "11988887777",
    cpf: "52998224725",
    passwordHash: "hash",
    status: "ATIVO",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as User;
}

function buildSchool(overrides: Partial<School> = {}): School {
  return {
    id: "school-1",
    codigoInterno: "ESC-000001",
    nomeOficial: "Escola Exemplo",
    nomeFantasia: null,
    status: "ATIVA",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as unknown as School;
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
  let studentsService: jest.Mocked<Pick<StudentsService, "findRawById">>;
  let usersService: jest.Mocked<Pick<UsersService, "findById">>;
  let schoolRepository: jest.Mocked<Pick<SchoolRepository, "findById">>;
  let companyRepository: jest.Mocked<Pick<CompanyRepository, "findById">>;
  let termoCienciaPdfService: jest.Mocked<Pick<TermoCienciaPdfService, "gerar">>;

  beforeEach(() => {
    contractRepository = {
      create: jest.fn(),
      createTermoCienciaAutomatico: jest.fn(),
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
    studentsService = { findRawById: jest.fn().mockResolvedValue(buildStudent()) };
    usersService = { findById: jest.fn().mockResolvedValue(buildUser()) };
    schoolRepository = { findById: jest.fn().mockResolvedValue(buildSchool()) };
    companyRepository = { findById: jest.fn().mockResolvedValue(buildCompany()) };
    termoCienciaPdfService = { gerar: jest.fn().mockResolvedValue(Buffer.from("pdf")) };

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
      studentsService as unknown as StudentsService,
      usersService as unknown as UsersService,
      schoolRepository as unknown as SchoolRepository,
      companyRepository as unknown as CompanyRepository,
      termoCienciaPdfService as unknown as TermoCienciaPdfService,
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

      expect(rottaAiService.validarContratoAssinado).toHaveBeenCalledWith(
        { contractId: "contract-1" },
        responsavelActor,
      );
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

  describe("gerarPdfTermoCiencia", () => {
    it("404 quando o contrato é NEGOCIADO (não tem termo de ciência)", async () => {
      contractRepository.findByIdScoped.mockResolvedValue(buildContract({ origem: "NEGOCIADO" }));

      await expect(service.gerarPdfTermoCiencia("contract-1", empresaActor)).rejects.toThrow(
        NotFoundException,
      );
      expect(termoCienciaPdfService.gerar).not.toHaveBeenCalled();
    });

    it("monta o PDF a partir dos dados de Empresa/Aluno/Responsável/Escola para um termo automático", async () => {
      const contract = buildContract({ origem: "TERMO_CIENCIA_AUTOMATICO", status: "ATIVO" });
      contractRepository.findByIdScoped.mockResolvedValue(contract);

      const result = await service.gerarPdfTermoCiencia("contract-1", responsavelActor);

      expect(companyRepository.findById).toHaveBeenCalledWith("company-1");
      expect(studentsService.findRawById).toHaveBeenCalledWith("student-1");
      expect(usersService.findById).toHaveBeenCalledWith("responsavel-1");
      expect(schoolRepository.findById).toHaveBeenCalledWith("school-1");
      expect(termoCienciaPdfService.gerar).toHaveBeenCalledWith(
        expect.objectContaining({ contract }),
      );
      expect(result).toEqual(Buffer.from("pdf"));
    });

    it("404 quando algum dado relacionado não é encontrado", async () => {
      contractRepository.findByIdScoped.mockResolvedValue(
        buildContract({ origem: "TERMO_CIENCIA_AUTOMATICO" }),
      );
      studentsService.findRawById.mockResolvedValue(null);

      await expect(service.gerarPdfTermoCiencia("contract-1", responsavelActor)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
