import { StudentCredentialedListener } from "../student-credentialed.listener";

import type { TransportRequestRepository } from "../../repositories/transport-request.repository";
import type { StudentCredentialedEvent } from "@/modules/students/events/student-credentialed.event";
import type { TransportRequest } from "@prisma/client";

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

describe("StudentCredentialedListener", () => {
  let repository: jest.Mocked<
    Pick<TransportRequestRepository, "findOpenByStudentAndCompany" | "create" | "updateStatus">
  >;
  let listener: StudentCredentialedListener;

  beforeEach(() => {
    repository = {
      findOpenByStudentAndCompany: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue(buildTransportRequest()),
      updateStatus: jest.fn().mockResolvedValue(buildTransportRequest({ status: "APROVADA" })),
    };
    listener = new StudentCredentialedListener(repository as unknown as TransportRequestRepository);
  });

  it("cria a TransportRequest e já aprova, sem passar por RECEBIDA/EM_ANALISE", async () => {
    const event = buildEvent();
    await listener.handle(event);

    expect(repository.create).toHaveBeenCalledWith({
      studentId: event.studentId,
      responsavelId: event.responsavelId,
      companyId: event.companyId,
      schoolId: event.schoolId,
      turno: event.turno,
    });
    expect(repository.updateStatus).toHaveBeenCalledWith("transport-request-1", {
      status: "APROVADA",
      motivoRecusa: null,
    });
  });

  it("nunca duplica quando já existe uma solicitação em aberto para este par aluno/empresa", async () => {
    repository.findOpenByStudentAndCompany.mockResolvedValue(buildTransportRequest());

    await listener.handle(buildEvent());

    expect(repository.create).not.toHaveBeenCalled();
    expect(repository.updateStatus).not.toHaveBeenCalled();
  });

  it("nunca lança quando o repositório falha (best-effort, mesmo padrão de CommunicationEventsListener)", async () => {
    repository.create.mockRejectedValue(new Error("db indisponível"));
    await expect(listener.handle(buildEvent())).resolves.toBeUndefined();
  });
});
