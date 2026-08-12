import { IdentityVerificationService } from "../identity-verification.service";

import type { PrismaService } from "@/infra/database/prisma.service";
import type { DiditService } from "@/infra/didit/didit.service";

function buildPrismaMock(): jest.Mocked<Pick<PrismaService, "user">> {
  return {
    user: {
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
  } as unknown as jest.Mocked<Pick<PrismaService, "user">>;
}

function buildDiditMock(): jest.Mocked<Pick<DiditService, "createVerificationSession">> {
  return { createVerificationSession: jest.fn() };
}

describe("IdentityVerificationService", () => {
  it("createSession cria a sessão na Didit, grava sessionId e marca EM_ANDAMENTO", async () => {
    const prisma = buildPrismaMock();
    const didit = buildDiditMock();
    didit.createVerificationSession.mockResolvedValue({
      sessionId: "sess_1",
      url: "https://verify.didit.me/session/sess_1",
      status: "not started",
    });

    const service = new IdentityVerificationService(
      prisma as unknown as PrismaService,
      didit as unknown as DiditService,
    );

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
      data: { identityVerificationSessionId: "sess_1", identityVerificationStatus: "EM_ANDAMENTO" },
    });
  });

  it("getStatus lê o status/verifiedAt já persistidos, sem chamar a Didit", async () => {
    const prisma = buildPrismaMock();
    (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      identityVerificationStatus: "APROVADA",
      identityVerifiedAt: new Date("2026-01-01T00:00:00Z"),
    });
    const didit = buildDiditMock();

    const service = new IdentityVerificationService(
      prisma as unknown as PrismaService,
      didit as unknown as DiditService,
    );

    const resultado = await service.getStatus("user-1");

    expect(resultado).toEqual({
      status: "APROVADA",
      verifiedAt: new Date("2026-01-01T00:00:00Z"),
    });
    expect(didit.createVerificationSession).not.toHaveBeenCalled();
  });
});
