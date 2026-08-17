import { BadRequestException } from "@nestjs/common";


import {
  IdentityVerificationService,
  requerCnh,
  resolveDiditWorkflowId,
  resolveDocumentoEsperado,
} from "../identity-verification.service";

import type { DiditConfig } from "@/config/didit.config";
import type { PrismaService } from "@/infra/database/prisma.service";
import type { DiditService } from "@/infra/didit/didit.service";
import type { ConfigService } from "@nestjs/config";

import { Role } from "@/shared/enums";

const DIDIT_CONFIG: DiditConfig = {
  apiKey: "test-key",
  baseUrl: "https://verification.didit.me",
  webhookSecret: undefined,
  workflowIdMotorista: "workflow-motorista",
  workflowIdMonitor: "workflow-monitor",
  apiPublicUrl: undefined,
};

function buildPrismaMock(): jest.Mocked<Pick<PrismaService, "user" | "membership">> {
  return {
    user: {
      update: jest.fn(),
      findUniqueOrThrow: jest.fn(),
      findMany: jest.fn(),
      count: jest.fn(),
    },
    membership: {
      findFirst: jest.fn(),
    },
  } as unknown as jest.Mocked<Pick<PrismaService, "user" | "membership">>;
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

function buildConfigServiceMock(): ConfigService {
  return { get: jest.fn().mockReturnValue(DIDIT_CONFIG) } as unknown as ConfigService;
}

function buildService(
  prisma: ReturnType<typeof buildPrismaMock>,
  didit: ReturnType<typeof buildDiditMock>,
  configService: ConfigService = buildConfigServiceMock(),
) {
  return new IdentityVerificationService(
    prisma as unknown as PrismaService,
    didit as unknown as DiditService,
    configService,
  );
}

describe("requerCnh/resolveDiditWorkflowId/resolveDocumentoEsperado", () => {
  it("Motorista sempre exige CNH, companyType não muda nada", () => {
    expect(requerCnh(Role.MOTORISTA, null)).toBe(true);
    expect(requerCnh(Role.MOTORISTA, "LTDA")).toBe(true);
  });

  it("Monitor/Gestor nunca exigem CNH, mesmo com companyType Autônomo/MEI (não é o caso — só Empresa é o dono)", () => {
    expect(requerCnh(Role.MONITOR, "AUTONOMO")).toBe(false);
    expect(requerCnh(Role.GESTOR, "MEI")).toBe(false);
  });

  it("Empresa comum (LTDA/SLU/EIRELI/OUTRO ou sem companyType) não exige CNH — não é quem dirige", () => {
    expect(requerCnh(Role.EMPRESA, "LTDA")).toBe(false);
    expect(requerCnh(Role.EMPRESA, null)).toBe(false);
    expect(requerCnh(Role.EMPRESA, undefined)).toBe(false);
  });

  it("Empresa Autônomo/MEI exige CNH — o próprio dono é quem dirige (schema.prisma, CompanyType.AUTONOMO)", () => {
    expect(requerCnh(Role.EMPRESA, "AUTONOMO")).toBe(true);
    expect(requerCnh(Role.EMPRESA, "MEI")).toBe(true);
  });

  it("resolveDiditWorkflowId/resolveDocumentoEsperado seguem a mesma regra de requerCnh", () => {
    expect(resolveDiditWorkflowId(Role.EMPRESA, "AUTONOMO", DIDIT_CONFIG)).toBe(
      "workflow-motorista",
    );
    expect(resolveDiditWorkflowId(Role.EMPRESA, "LTDA", DIDIT_CONFIG)).toBe("workflow-monitor");
    expect(resolveDocumentoEsperado(Role.EMPRESA, "MEI")).toContain("CNH");
    expect(resolveDocumentoEsperado(Role.EMPRESA, "LTDA")).toContain("Qualquer documento");
  });
});

describe("IdentityVerificationService", () => {
  it("createSession (Motorista) cria a sessão no workflow de CNH, grava sessionId, marca EM_ANDAMENTO e limpa o motivo anterior", async () => {
    const prisma = buildPrismaMock();
    const didit = buildDiditMock();
    didit.createVerificationSession.mockResolvedValue({
      sessionId: "sess_1",
      url: "https://verify.didit.me/session/sess_1",
      status: "not started",
    });

    const service = buildService(prisma, didit);

    const resultado = await service.createSession(
      "user-1",
      Role.MOTORISTA,
      "https://app.rotta.com.br/voltar",
    );

    expect(resultado).toEqual({
      url: "https://verify.didit.me/session/sess_1",
      sessionId: "sess_1",
    });
    expect(didit.createVerificationSession).toHaveBeenCalledWith(
      "user-1",
      "workflow-motorista",
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

  it("createSession (Monitor) usa o workflow de qualquer documento — nunca o de CNH exclusivo do Motorista", async () => {
    const prisma = buildPrismaMock();
    const didit = buildDiditMock();
    didit.createVerificationSession.mockResolvedValue({
      sessionId: "sess_2",
      url: "https://verify.didit.me/session/sess_2",
      status: "not started",
    });

    const service = buildService(prisma, didit);

    await service.createSession("user-2", Role.MONITOR);

    expect(didit.createVerificationSession).toHaveBeenCalledWith(
      "user-2",
      "workflow-monitor",
      undefined,
    );
    // Role !== EMPRESA: nunca precisa consultar companyType.
    expect(prisma.membership.findFirst).not.toHaveBeenCalled();
  });

  // Gap real: `CompanyType.AUTONOMO`/`MEI` faz o dono da empresa (role
  // "empresa") ser também quem dirige (schema.prisma + `useAppMode`,
  // apps/web) — sem este caso, um Autônomo/MEI verificaria a identidade
  // com RG/passaporte e nunca precisaria provar CNH.
  it("createSession (Empresa Autônomo) usa o workflow de CNH — o dono é quem dirige", async () => {
    const prisma = buildPrismaMock();
    (prisma.membership.findFirst as jest.Mock).mockResolvedValue({
      company: { tipo: "AUTONOMO" },
    });
    const didit = buildDiditMock();
    didit.createVerificationSession.mockResolvedValue({
      sessionId: "sess_3",
      url: "https://verify.didit.me/session/sess_3",
      status: "not started",
    });

    const service = buildService(prisma, didit);

    await service.createSession("user-3", Role.EMPRESA);

    expect(prisma.membership.findFirst).toHaveBeenCalledWith({
      where: { userId: "user-3", status: "ATIVO" },
      orderBy: { iniciadoEm: "desc" },
      select: { company: { select: { tipo: true } } },
    });
    expect(didit.createVerificationSession).toHaveBeenCalledWith(
      "user-3",
      "workflow-motorista",
      undefined,
    );
  });

  it("createSession (Empresa MEI) também usa o workflow de CNH, mesma regra do Autônomo", async () => {
    const prisma = buildPrismaMock();
    (prisma.membership.findFirst as jest.Mock).mockResolvedValue({ company: { tipo: "MEI" } });
    const didit = buildDiditMock();
    didit.createVerificationSession.mockResolvedValue({
      sessionId: "sess_4",
      url: "https://verify.didit.me/session/sess_4",
      status: "not started",
    });

    const service = buildService(prisma, didit);

    await service.createSession("user-4", Role.EMPRESA);

    expect(didit.createVerificationSession).toHaveBeenCalledWith(
      "user-4",
      "workflow-motorista",
      undefined,
    );
  });

  it("createSession (Empresa LTDA) usa o workflow de qualquer documento — o dono não é quem dirige", async () => {
    const prisma = buildPrismaMock();
    (prisma.membership.findFirst as jest.Mock).mockResolvedValue({ company: { tipo: "LTDA" } });
    const didit = buildDiditMock();
    didit.createVerificationSession.mockResolvedValue({
      sessionId: "sess_5",
      url: "https://verify.didit.me/session/sess_5",
      status: "not started",
    });

    const service = buildService(prisma, didit);

    await service.createSession("user-5", Role.EMPRESA);

    expect(didit.createVerificationSession).toHaveBeenCalledWith(
      "user-5",
      "workflow-monitor",
      undefined,
    );
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

  // Gap relatado em produção: "Em andamento" travado porque o webhook da
  // Didit nunca chegou — `refreshForSelf` é a mesma busca pull-based de
  // `refreshForAdmin`, só que o próprio usuário aciona (sem precisar de
  // um Admin Rotta pra destravar).
  it("refreshForSelf busca a decisão na Didit e devolve o status já atualizado", async () => {
    const prisma = buildPrismaMock();
    (prisma.user.findUniqueOrThrow as jest.Mock)
      .mockResolvedValueOnce({ identityVerificationSessionId: "sess_1" })
      .mockResolvedValueOnce({
        identityVerificationStatus: "APROVADA",
        identityVerifiedAt: new Date("2026-08-13T00:00:00Z"),
        identityVerificationMotivo: null,
      });
    const didit = buildDiditMock();
    didit.getSessionDecision.mockResolvedValue({
      sessionId: "sess_1",
      status: "approved",
      raw: { status: "Approved" },
    });

    const service = buildService(prisma, didit);

    const resultado = await service.refreshForSelf("user-1");

    expect(didit.getSessionDecision).toHaveBeenCalledWith("sess_1");
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: {
        identityVerificationStatus: "APROVADA",
        identityVerifiedAt: expect.any(Date),
        identityVerificationDecisao: { status: "Approved" },
        identityVerificationMotivo: null,
      },
    });
    expect(resultado.status).toBe("APROVADA");
  });

  it("refreshForSelf lança BadRequestException quando o usuário nunca iniciou uma sessão", async () => {
    const prisma = buildPrismaMock();
    (prisma.user.findUniqueOrThrow as jest.Mock).mockResolvedValue({
      identityVerificationSessionId: null,
    });
    const didit = buildDiditMock();
    const service = buildService(prisma, didit);

    await expect(service.refreshForSelf("user-1")).rejects.toBeInstanceOf(BadRequestException);
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

  it("listForAdmin mostra 'CNH' como documento esperado pra Empresa Autônomo — nunca esconde que o dono também dirige", async () => {
    const prisma = buildPrismaMock();
    (prisma.user.findMany as jest.Mock).mockResolvedValue([
      {
        id: "user-6",
        nome: "Bruno",
        email: "bruno@example.com",
        identityVerificationStatus: "EM_ANALISE",
        identityVerificationSessionId: "sess_6",
        identityVerificationMotivo: null,
        identityVerifiedAt: null,
        updatedAt: new Date("2026-08-17T00:00:00Z"),
        memberships: [
          { role: "empresa", company: { nomeFantasia: "Bruno Transportes", tipo: "AUTONOMO" } },
        ],
      },
    ]);
    (prisma.user.count as jest.Mock).mockResolvedValue(1);
    const didit = buildDiditMock();
    const service = buildService(prisma, didit);

    const resultado = await service.listForAdmin({ page: 1, pageSize: 20 });

    expect(resultado.items[0]).toMatchObject({
      role: "empresa",
      documentoEsperado: "CNH (Carteira Nacional de Habilitação)",
    });
  });
});
