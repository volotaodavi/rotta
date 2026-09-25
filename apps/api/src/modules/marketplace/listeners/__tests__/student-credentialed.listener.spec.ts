import { StudentCredentialedListener } from "../student-credentialed.listener";

import type { ContractRepository } from "../../repositories/contract.repository";
import type { TransportRequestRepository } from "../../repositories/transport-request.repository";
import type { CompaniesService } from "@/modules/companies/companies.service";
import type { ServiceNatureService } from "@/modules/companies/service-nature.service";
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

/**
 * Monta o listener com todas as dependências mockadas.
 *
 * `publico` é o único botão: ele diz se a transportadora é licitada
 * pelo município. Tudo mais é igual nas duas vertentes de propósito —
 * é exatamente isso que os testes da separação verificam.
 */
function montar({ publico }: { publico: boolean }) {
  const transportRequestRepository = {
    findOpenByStudentAndCompany: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue(buildTransportRequest()),
    updateStatus: jest.fn().mockResolvedValue(buildTransportRequest({ status: "APROVADA" })),
  };
  const contractRepository = {
    createTermoCienciaAutomatico: jest.fn().mockResolvedValue(buildContract()),
    createAutorizacaoPublica: jest.fn().mockResolvedValue(buildContract()),
  };
  const serviceNatureService = { ehPublicoLicitado: jest.fn().mockResolvedValue(publico) };
  const companiesService = {
    getNomeFantasia: jest.fn().mockResolvedValue("Transportadora Exemplo"),
  };
  const eventEmitter = { emit: jest.fn() };
  const messagePersonalizationService = {
    termoCienciaGerado: jest.fn().mockReturnValue({ titulo: "t", corpo: "c" }),
    autorizacaoPublicaGerada: jest.fn().mockReturnValue({ titulo: "t", corpo: "c" }),
  };

  const listener = new StudentCredentialedListener(
    transportRequestRepository as unknown as TransportRequestRepository,
    contractRepository as unknown as ContractRepository,
    companiesService as unknown as CompaniesService,
    serviceNatureService as unknown as ServiceNatureService,
    eventEmitter as unknown as EventEmitter2,
    messagePersonalizationService as unknown as MessagePersonalizationService,
  );

  return {
    listener,
    transportRequestRepository,
    contractRepository,
    serviceNatureService,
    eventEmitter,
    messagePersonalizationService,
  };
}

describe("StudentCredentialedListener", () => {
  let transportRequestRepository: jest.Mocked<
    Pick<TransportRequestRepository, "findOpenByStudentAndCompany" | "create" | "updateStatus">
  >;
  let contractRepository: jest.Mocked<
    Pick<ContractRepository, "createTermoCienciaAutomatico" | "createAutorizacaoPublica">
  >;
  let serviceNatureService: jest.Mocked<Pick<ServiceNatureService, "ehPublicoLicitado">>;
  let companiesService: jest.Mocked<Pick<CompaniesService, "getNomeFantasia">>;
  let eventEmitter: jest.Mocked<Pick<EventEmitter2, "emit">>;
  let messagePersonalizationService: jest.Mocked<
    Pick<MessagePersonalizationService, "termoCienciaGerado" | "autorizacaoPublicaGerada">
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
      createAutorizacaoPublica: jest.fn().mockResolvedValue(buildContract()),
    };
    // Privado por padrão: é a vertente de todo mundo que já usa o
    // sistema, e o teste tem de falhar se ela mudar de caminho.
    serviceNatureService = { ehPublicoLicitado: jest.fn().mockResolvedValue(false) };
    companiesService = { getNomeFantasia: jest.fn().mockResolvedValue("Transportadora Exemplo") };
    eventEmitter = { emit: jest.fn() };
    messagePersonalizationService = {
      termoCienciaGerado: jest.fn().mockReturnValue({
        titulo: "Transporte credenciado",
        corpo: "O transporte com Transportadora Exemplo foi credenciado.",
      }),
      autorizacaoPublicaGerada: jest.fn().mockReturnValue({
        titulo: "Transporte credenciado",
        corpo: "É o transporte escolar do município: não há mensalidade nem qualquer cobrança.",
      }),
    };

    listener = new StudentCredentialedListener(
      transportRequestRepository as unknown as TransportRequestRepository,
      contractRepository as unknown as ContractRepository,
      companiesService as unknown as CompaniesService,
      serviceNatureService as unknown as ServiceNatureService,
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

/**
 * A separação entre as duas verticais (25/09/2026: "faça a distinção,
 * por favor. Não quero mistura").
 *
 * Este listener é o ÚNICO ponto do credenciamento que precisa saber
 * quem paga. Tudo antes — solicitação, aprovação — e tudo depois —
 * rota, embarque, mapa — é idêntico nas duas vertentes, e tem de
 * continuar sendo: o pai de Maricá acompanha o filho exatamente como o
 * pai de um contrato particular.
 */
describe("StudentCredentialedListener › a vertente decide o documento", () => {
  it("empresa PRIVADA continua gerando o termo de ciência de sempre", async () => {
    // O teste que protege TODA a base atual. Se cair, alguma empresa
    // que cobra mensalidade parou de gerar o documento comercial dela.
    const { listener, contractRepository } = montar({ publico: false });

    await listener.handle(buildEvent());

    expect(contractRepository.createTermoCienciaAutomatico).toHaveBeenCalledTimes(1);
    expect(contractRepository.createAutorizacaoPublica).not.toHaveBeenCalled();
  });

  it("empresa LICITADA gera autorização pública, nunca o termo com mensalidade a definir", async () => {
    // O termo de ciência diz "mensalidade e plano a definir pela
    // transportadora". Num município que já pagou pelo serviço, essa
    // frase faz um pai esperar um boleto que nunca vem — ou acreditar
    // num boleto falso se alguém mandar.
    const { listener, contractRepository } = montar({ publico: true });

    await listener.handle(buildEvent());

    expect(contractRepository.createAutorizacaoPublica).toHaveBeenCalledTimes(1);
    expect(contractRepository.createTermoCienciaAutomatico).not.toHaveBeenCalled();
  });

  it("o aviso ao responsável muda junto — na pública ele lê que não há cobrança", async () => {
    // O documento certo com o aviso errado não resolve nada: o
    // responsável lê a notificação, não o contrato.
    const { listener, messagePersonalizationService } = montar({ publico: true });

    await listener.handle(buildEvent());

    expect(messagePersonalizationService.autorizacaoPublicaGerada).toHaveBeenCalled();
    expect(messagePersonalizationService.termoCienciaGerado).not.toHaveBeenCalled();
  });

  it("a solicitação de transporte é IGUAL nas duas — a vertente só muda o documento", async () => {
    // Guarda contra a separação vazar para onde não deve. Credenciar um
    // aluno é o mesmo gesto nas duas vertentes; o que difere é quem
    // paga, e isso aparece num lugar só.
    const privado = montar({ publico: false });
    const publico = montar({ publico: true });

    await privado.listener.handle(buildEvent());
    await publico.listener.handle(buildEvent());

    expect(publico.transportRequestRepository.create.mock.calls[0]).toEqual(
      privado.transportRequestRepository.create.mock.calls[0],
    );
    expect(publico.transportRequestRepository.updateStatus.mock.calls[0]).toEqual(
      privado.transportRequestRepository.updateStatus.mock.calls[0],
    );
  });
});
