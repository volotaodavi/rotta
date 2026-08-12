import { DiditWebhookController } from "../didit-webhook.controller";

import type { PrismaService } from "@/infra/database/prisma.service";

function buildPrismaMock(): jest.Mocked<Pick<PrismaService, "user">> {
  return {
    user: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
  } as unknown as jest.Mocked<Pick<PrismaService, "user">>;
}

describe("DiditWebhookController", () => {
  it("aplica o evento (status mapeado + decision) quando vendor_data/session_id batem com a sessão atual do usuário", async () => {
    const prisma = buildPrismaMock();
    const controller = new DiditWebhookController(prisma as unknown as PrismaService);

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
      },
    });
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
      const controller = new DiditWebhookController(prisma as unknown as PrismaService);

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
    const controller = new DiditWebhookController(prisma as unknown as PrismaService);

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
    const controller = new DiditWebhookController(prisma as unknown as PrismaService);

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
    const controller = new DiditWebhookController(prisma as unknown as PrismaService);

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
    const controller = new DiditWebhookController(prisma as unknown as PrismaService);

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
