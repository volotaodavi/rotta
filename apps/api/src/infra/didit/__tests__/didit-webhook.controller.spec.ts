import { DiditWebhookController } from "../didit-webhook.controller";

import type { PrismaService } from "@/infra/database/prisma.service";
import type { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import type { EventEmitter2 } from "@nestjs/event-emitter";

function buildPrismaMock(): jest.Mocked<Pick<PrismaService, "user">> {
  return {
    user: {
      updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      findUnique: jest.fn().mockResolvedValue({ nome: "Fulano" }),
    },
  } as unknown as jest.Mocked<Pick<PrismaService, "user">>;
}

function buildMessagePersonalizationServiceMock(): jest.Mocked<
  Pick<MessagePersonalizationService, "identidadeAprovada" | "identidadeReprovada">
> {
  return {
    identidadeAprovada: jest.fn().mockReturnValue({ titulo: "", corpo: "" }),
    identidadeReprovada: jest.fn().mockReturnValue({ titulo: "", corpo: "" }),
  };
}

function buildEventEmitterMock(): jest.Mocked<Pick<EventEmitter2, "emit">> {
  return { emit: jest.fn() };
}

function buildController(prisma: ReturnType<typeof buildPrismaMock>): DiditWebhookController {
  return new DiditWebhookController(
    prisma as unknown as PrismaService,
    buildMessagePersonalizationServiceMock() as unknown as MessagePersonalizationService,
    buildEventEmitterMock() as unknown as EventEmitter2,
  );
}

describe("DiditWebhookController", () => {
  it("aplica o evento (status mapeado + decision) quando vendor_data/session_id batem com a sessão atual do usuário", async () => {
    const prisma = buildPrismaMock();
    const controller = buildController(prisma);

    const resultado = await controller.handle({
      event_id: "evt_1",
      webhook_type: "status.updated",
      status: "Approved",
      session_id: "sess_1",
      vendor_data: "user-1",
      decision: { id_verifications: [] },
    });

    expect(resultado).toEqual({ ok: true });
    expect(prisma.user.updateMany).toHaveBeenCalledWith({
      where: { id: "user-1", identityVerificationSessionId: "sess_1" },
      data: {
        identityVerificationStatus: "APROVADA",
        identityVerifiedAt: expect.any(Date),
        identityVerificationDecisao: { id_verifications: [] },
        identityVerificationMotivo: null,
      },
    });
  });

  it("popula identityVerificationMotivo com o comentário de reviews[] quando o status é REPROVADA", async () => {
    const prisma = buildPrismaMock();
    const controller = buildController(prisma);

    await controller.handle({
      event_id: "evt_1",
      webhook_type: "status.updated",
      status: "Declined",
      session_id: "sess_1",
      vendor_data: "user-1",
      decision: { reviews: [{ comment: "Documento ilegível." }] },
    });

    expect(prisma.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ identityVerificationMotivo: "Documento ilegível." }),
      }),
    );
  });

  it("usa o motivo padrão quando o status é REPROVADA mas a decisão não trouxe nada aproveitável", async () => {
    const prisma = buildPrismaMock();
    const controller = buildController(prisma);

    await controller.handle({
      event_id: "evt_1",
      webhook_type: "status.updated",
      status: "Declined",
      session_id: "sess_1",
      vendor_data: "user-1",
      decision: { id_verification: { warnings: [] } },
    });

    expect(prisma.user.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          identityVerificationMotivo:
            "Verificação recusada pela Didit, sem motivo detalhado informado pelo revisor.",
        }),
      }),
    );
  });

  it("mapeia cada status literal da Didit pro enum interno correto", async () => {
    const cases: Array<[string, string]> = [
      ["In Progress", "EM_ANDAMENTO"],
      ["Awaiting User", "EM_ANDAMENTO"],
      ["Resubmitted", "EM_ANDAMENTO"],
      ["In Review", "EM_ANALISE"],
      ["Declined", "REPROVADA"],
      ["Expired", "EXPIRADA"],
      ["Kyc Expired", "EXPIRADA"],
      ["Abandoned", "NAO_INICIADA"],
      ["Not Started", "NAO_INICIADA"],
    ];

    for (const [diditStatus, esperado] of cases) {
      const prisma = buildPrismaMock();
      const controller = buildController(prisma);

      await controller.handle({
        event_id: "evt_1",
        webhook_type: "status.updated",
        status: diditStatus,
        session_id: "sess_1",
        vendor_data: "user-1",
      });

      expect(prisma.user.updateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ identityVerificationStatus: esperado }),
        }),
      );
    }
  });

  it("não seta identityVerifiedAt quando o status não é Approved", async () => {
    const prisma = buildPrismaMock();
    const controller = buildController(prisma);

    await controller.handle({
      event_id: "evt_1",
      webhook_type: "status.updated",
      status: "In Review",
      session_id: "sess_1",
      vendor_data: "user-1",
    });

    const call = (prisma.user.updateMany as jest.Mock).mock.calls[0][0];
    expect(call.data.identityVerifiedAt).toBeUndefined();
  });

  it("não toca no banco quando vendor_data/session_id não estão presentes (fluxo standalone, sem sessão)", async () => {
    const prisma = buildPrismaMock();
    const controller = buildController(prisma);

    const resultado = await controller.handle({
      event_id: "evt_1",
      webhook_type: "status.updated",
      status: "Approved",
    });

    expect(resultado).toEqual({ ok: true });
    expect(prisma.user.updateMany).not.toHaveBeenCalled();
  });

  it("não lança quando updateMany não encontra a sessão atual (session_id divergente/usuário inexistente)", async () => {
    const prisma = buildPrismaMock();
    (prisma.user.updateMany as jest.Mock).mockResolvedValue({ count: 0 });
    const controller = buildController(prisma);

    const resultado = await controller.handle({
      event_id: "evt_1",
      webhook_type: "status.updated",
      status: "Approved",
      session_id: "sess_velha",
      vendor_data: "user-1",
    });

    expect(resultado).toEqual({ ok: true });
  });

  it("nunca lança mesmo se a atualização falhar (sempre responde 200 pra Didit)", async () => {
    const prisma = buildPrismaMock();
    (prisma.user.updateMany as jest.Mock).mockRejectedValue(new Error("db indisponível"));
    const controller = buildController(prisma);

    const resultado = await controller.handle({
      event_id: "evt_1",
      webhook_type: "status.updated",
      status: "Approved",
      session_id: "sess_1",
      vendor_data: "user-1",
    });

    expect(resultado).toEqual({ ok: true });
  });
});
