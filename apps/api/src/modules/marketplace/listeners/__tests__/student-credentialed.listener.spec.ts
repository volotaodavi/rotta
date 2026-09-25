import { StudentCredentialedListener } from "../student-credentialed.listener";

import type { ContractRepository } from "../../repositories/contract.repository";
import type { TransportRequestRepository } from "../../repositories/transport-request.repository";
import type { CompaniesService } from "@/modules/companies/companies.service";
import type { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import type { StudentCredentialedEvent } from "@/modules/students/events/student-credentialed.event";
import type { EventEmitter2 } from "@nestjs/event-emitter";
import type { Contract, TransportRequest } from "@prisma/client";

function buildEvent(overrides: Partial<StudentCredentialedEvent> = {}): StudentCredentialedEvent {
  return {
    studentId: "student-1",
    responsavelId: "responsavel-1",
    companyId: "company-1",
    schoolId: "school-1",
    turno: "MANHA",
    ...overrides,
  };
}

function buildTransportRequest(overrides: Partial<TransportRequest> = {}): TransportRequest {
  return {
    id: "transport-request-1",
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

function buildContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: "contract-1",
    transportRequestId: "transport-request-1",
    studentId: "student-1",
    responsavelId: "responsavel-1",
    companyId: "company-1",
    schoolId: "school-1",
    vehicleId: null,
    motoristaId: null,
    monitorId: null,
    valorMensalidadeCentavos: 0,
    planoDescricao: "Mensalidade e plano a definir pela transportadora",
    regras: "Termo de ciência gerado automaticamente.",
    vigenciaInicio: new Date(),
    vigenciaFim: null,
    status: "ATIVO",
    origem: "TERMO_CIENCIA_AUTOMATICO",
    authentiqueDocumentId: null,
    assinadoResponsavelEm: null,
    assinadoEmpresaEm: null,
    ativadoEm: new Date(),
    encerradoEm: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("StudentCredentialedListener", () => {
  let transportRequestRepository: jest.Mocked<
    Pick<TransportRequestRepository, "findOpenByStudentAndCompany" | "create" | "updateStatus">
  >;
  let contractRepository: jest.Mocked<Pick<ContractRepository, "createTermoCienciaAutomatico">>;
  let companiesService: jest.Mocked<Pick<CompaniesService, "getNomeFantasia">>;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, "emit">>;
  let messagePersonalizationService: jest.Mocked<
    Pick<MessagePersonalizationService, "termoCienciaGerado">
  >;
  let listener: StudentCredentialedListener;

  beforeEach(() => {
    transportRequestRepository = {
      findOpenByStudentAndCompany: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(buildTransportRequest()),
      updateStatus: jest.fn().mockResolvedValue(buildTransportRequest({ status: "APROVADA" })),
    };
    contractRepository = {
      createTermoCienciaAutomatico: jest.fn().mockResolvedValue(buildContract()),
    };
    companiesService = { getNomeFantasia: jest.fn().mockResolvedValue("Transportadora Exemplo") };
    eventEmitter = { emit: jest.fn() };
    messagePersonalizationService = {
      termoCienciaGerado: jest.fn().mockReturnValue({
        titulo: "Transporte credenciado",
        corpo: "O transporte com Transportadora Exemplo foi credenciado.",
      }),
    };

    listener = new StudentCredentialedListener(
      transportRequestRepository as unknown as TransportRequestRepository,
      contractRepository as unknown as ContractRepository,
      companiesService as unknown as CompaniesService,
      eventEmitter as unknown as EventEmitter2,
      messagePersonalizationService as unknown as MessagePersonalizationService,
    );
  });

  it("cria a TransportRequest e já aprova, sem passar por RECEBIDA/EM_ANALISE", async () => {
    const event = buildEvent();
    await listener.handle(event);

    expect(transportRequestRepository.create).toHaveBeenCalledWith({
      studentId: event.studentId,
      responsavelId: event.responsavelId,
      companyId: event.companyId,
      schoolId: event.schoolId,
      turno: event.turno,
    });
    expect(transportRequestRepository.updateStatus).toHaveBeenCalledWith("transport-request-1", {
      status: "APROVADA",
      motivoRecusa: null,
    });
  });

  it("gera o termo de ciência automático (Contract placeholder já ATIVO) e notifica o responsável", async () => {
    const event = buildEvent();
    await listener.handle(event);

    expect(contractRepository.createTermoCienciaAutomatico).toHaveBeenCalledWith({
      transportRequestId: "transport-request-1",
      studentId: event.studentId,
      responsavelId: event.responsavelId,
      companyId: event.companyId,
      schoolId: event.schoolId,
    });
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      "communication.requested",
      expect.objectContaining({
        userId: "responsavel-1",
        companyId: "company-1",
        dadosContexto: { contractId: "contract-1" },
      }),
    );
  });

  it("nunca duplica quando já existe uma solicitação em aberto para este par aluno/empresa", async () => {
    transportRequestRepository.findOpenByStudentAndCompany.mockResolvedValue(
      buildTransportRequest(),
    );

    await listener.handle(buildEvent());

    expect(transportRequestRepository.create).not.toHaveBeenCalled();
    expect(transportRequestRepository.updateStatus).not.toHaveBeenCalled();
    expect(contractRepository.createTermoCienciaAutomatico).not.toHaveBeenCalled();
  });

  it("nunca lança quando o repositório de TransportRequest falha (best-effort, mesmo padrão de CommunicationEventsListener)", async () => {
    transportRequestRepository.create.mockRejectedValue(new Error("db indisponível"));
    await expect(listener.handle(buildEvent())).resolves.toBeUndefined();
    expect(contractRepository.createTermoCienciaAutomatico).not.toHaveBeenCalled();
  });

  it("mantém a TransportRequest aprovada mesmo se a geração do termo de ciência falhar", async () => {
    contractRepository.createTermoCienciaAutomatico.mockRejectedValue(
      new Error("falha ao gerar termo"),
    );

    await expect(listener.handle(buildEvent())).resolves.toBeUndefined();
    expect(transportRequestRepository.updateStatus).toHaveBeenCalledWith("transport-request-1", {
      status: "APROVADA",
      motivoRecusa: null,
    });
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});
