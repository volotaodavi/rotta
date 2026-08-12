import { BadRequestException } from "@nestjs/common";

import { IdentityVerificationService } from "../identity-verification.service";

import type { PrismaService } from "@/infra/database/prisma.service";
import type { DiditService } from "@/infra/didit/didit.service";

function buildPrismaMock(): jest.Mocked<Pick<PrismaService, "user">> {
  return {
    user: {
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
  } as unknown as jest.Mocked<Pick<PrismaService, "user">>;
}

function buildDiditMock(): jest.Mocked<
  Pick<DiditService, "createVerificationSession" | "getSessionDecision" | "updateSessionStatus">
> {
  return {
    createVerificationSession: jest.fn(),
    getSessionDecision: jest.fn(),
    updateSessionStatus: jest.fn(),
  };
}

function buildService(
  prisma: ReturnType<typeof buildPrismaMock>,
  didit: ReturnType<typeof buildDiditMock>,
) {
  return new IdentityVerificationService(
    prisma as unknown as PrismaService,
    didit as unknown as DiditService,
  );
}

describe("IdentityVerificationService", () => {
  it("createSession cria a sessão na Didit, grava sessionId, marca EM_ANDAMENTO e limpa o motivo anterior", async () => {
    const prisma = buildPrismaMock();
    const didit = buildDiditMock();
    didit.createVerificationSession.mockResolvedValue({
      sessionId: "sess_1",
      url: "https://verify.didit.me/session/sess_1",
      status: "not started",
    });

    const service = buildService(prisma, didit);

    const resultado = await service.createSession("user-1", "https://app.rotta.com.br/voltar");

    expect(resultado).toEqual({
      url: "https://verify.didit.me/session/sess_1",
      sessionId: "sess_1",
    });
    expect(didit.createVerificationSession).toHaveBeenCalledWith(
      "user-1",
      "https://app.rotta.com.br/voltar",
    );
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        identityVerificationSessionId: "sess_1",
        identityVerificationStatus: "EM_ANDAMENTO",
        identityVerificationMotivo: null,
      },
    });
  });

  it("getStatus lê status/verifiedAt/motivo já persistidos, sem chamar a Didit", async () => {
    const prisma = buildPrismaMock();
    (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      identityVerificationStatus: "APROVADA",
      identityVerifiedAt: new Date("2026-01-01T00:00:00Z"),
      identityVerificationMotivo: null,
    });
    const didit = buildDiditMock();

    const service = buildService(prisma, didit);

    const resultado = await service.getStatus("user-1");

    expect(resultado).toEqual({
      status: "APROVADA",
      verifiedAt: new Date("2026-01-01T00:00:00Z"),
      motivo: null,
    });
    expect(didit.createVerificationSession).not.toHaveBeenCalled();
  });

  it("refreshForAdmin busca a decisão na Didit e persiste status/motivo mapeados", async () => {
    const prisma = buildPrismaMock();
    (prisma.user.findUniqueOrThrow as jest.Mock)
      .mockResolvedValueOnce({ identityVerificationSessionId: "sess_1" })
      .mockResolvedValueOnce({
        id: "user-1",
        nome: "Ana",
        email: "ana@example.com",
        identityVerificationStatus: "REPROVADA",
        identityVerificationSessionId: "sess_1",
        identityVerificationMotivo: "Documento ilegível.",
        identityVerifiedAt: null,
        updatedAt: new Date("2026-08-12T00:00:00Z"),
        identityVerificationDecisao: { status: "Declined" },
        memberships: [],
      });
    const didit = buildDiditMock();
    didit.getSessionDecision.mockResolvedValue({
      sessionId: "sess_1",
      status: "declined",
      raw: { status: "Declined", reviews: [{ comment: "Documento ilegível." }] },
    });

    const service = buildService(prisma, didit);

    const resultado = await service.refreshForAdmin("user-1");

    expect(didit.getSessionDecision).toHaveBeenCalledWith("sess_1");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        identityVerificationStatus: "REPROVADA",
        identityVerifiedAt: undefined,
        identityVerificationDecisao: {
          status: "Declined",
          reviews: [{ comment: "Documento ilegível." }],
        },
        identityVerificationMotivo: "Documento ilegível.",
      },
    });
    expect(resultado.status).toBe("REPROVADA");
    expect(resultado.motivo).toBe("Documento ilegível.");
  });

  it("refreshForAdmin lança BadRequestException quando o usuário nunca iniciou uma sessão", async () => {
    const prisma = buildPrismaMock();
    (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      identityVerificationSessionId: null,
    });
    const didit = buildDiditMock();
    const service = buildService(prisma, didit);

    await expect(service.refreshForAdmin("user-1")).rejects.toBeInstanceOf(BadRequestException);
    expect(didit.getSessionDecision).not.toHaveBeenCalled();
  });

  it("decideForAdmin exige comment ao recusar", async () => {
    const prisma = buildPrismaMock();
    const didit = buildDiditMock();
    const service = buildService(prisma, didit);

    await expect(
      service.decideForAdmin("user-1", { newStatus: "Declined" }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(didit.updateSessionStatus).not.toHaveBeenCalled();
  });

  it("decideForAdmin recusa: chama update-status, sincroniza a decisão e preserva o comment do admin como motivo", async () => {
    const prisma = buildPrismaMock();
    (prisma.user.findUniqueOrThrow as jest.Mock)
      .mockResolvedValueOnce({ identityVerificationSessionId: "sess_1" })
      .mockResolvedValueOnce({
        id: "user-1",
        nome: "Ana",
        email: "ana@example.com",
        identityVerificationStatus: "REPROVADA",
        identityVerificationSessionId: "sess_1",
        identityVerificationMotivo: "Documento suspeito de fraude.",
        identityVerifiedAt: null,
        updatedAt: new Date("2026-08-12T00:00:00Z"),
        identityVerificationDecisao: { status: "Declined" },
        memberships: [],
      });
    const didit = buildDiditMock();
    didit.getSessionDecision.mockResolvedValue({
      sessionId: "sess_1",
      status: "declined",
      raw: { status: "Declined" },
    });

    const service = buildService(prisma, didit);

    const resultado = await service.decideForAdmin("user-1", {
      newStatus: "Declined",
      comment: "Documento suspeito de fraude.",
    });

    expect(didit.updateSessionStatus).toHaveBeenCalledWith(
      "sess_1",
      "Declined",
      "Documento suspeito de fraude.",
    );
    expect(didit.getSessionDecision).toHaveBeenCalledWith("sess_1");
    // Primeira chamada de update: aplica a decisão puxada da Didit.
    expect(prisma.user.update).toHaveBeenNthCalledWith(1, {
      where: { id: "user-1" },
      data: {
        identityVerificationStatus: "REPROVADA",
        identityVerifiedAt: undefined,
        identityVerificationDecisao: { status: "Declined" },
        identityVerificationMotivo:
          "Verificação recusada pela Didit, sem motivo detalhado informado pelo revisor.",
      },
    });
    // Segunda chamada: sobrescreve com o motivo que o admin de fato digitou.
    expect(prisma.user.update).toHaveBeenNthCalledWith(2, {
      where: { id: "user-1" },
      data: { identityVerificationMotivo: "Documento suspeito de fraude." },
    });
    expect(resultado.motivo).toBe("Documento suspeito de fraude.");
  });
});
