import { CompanyStatus } from "@prisma/client";

import { TrialExpiradoException } from "../../exceptions/trial-expirado.exception";
import { TrialGuard } from "../trial.guard";

import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { PrismaService } from "@/infra/database/prisma.service";
import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";

import { Role } from "@/shared/enums";

function buildContext(method: string, user: AuthenticatedUser | undefined): ExecutionContext {
  const request = { method, user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function buildActor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    sub: "user-1",
    tenantId: "company-1",
    role: Role.EMPRESA,
    vinculoId: "m-1",
    ...overrides,
  };
}

describe("TrialGuard", () => {
  let reflector: jest.Mocked<Reflector>;
  let prisma: jest.Mocked<PrismaService>;
  let guard: TrialGuard;
  let findUnique: jest.Mock;

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false),
    } as unknown as jest.Mocked<Reflector>;
    findUnique = jest.fn();
    prisma = {
      withBypass: jest.fn((op: unknown) => op),
      company: { findUnique },
    } as unknown as jest.Mocked<PrismaService>;
    guard = new TrialGuard(reflector, prisma);
  });

  it("libera @SkipTrialGuard() sem consultar o banco", async () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = buildContext("POST", buildActor());

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("libera leitura (GET) mesmo com trial vencido", async () => {
    findUnique.mockResolvedValue({
      status: CompanyStatus.TRIAL,
      trialExpiraEm: new Date("2000-01-01"),
    });
    const context = buildContext("GET", buildActor());

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("libera papéis fora de Empresa/Gestor (ex. Motorista) mesmo com escrita", async () => {
    const context = buildContext(
      "POST",
      buildActor({ role: Role.MOTORISTA, tenantId: "company-1" }),
    );

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });

  it("libera escrita dentro do trial (ainda não venceu)", async () => {
    const emAndamento = new Date();
    emAndamento.setDate(emAndamento.getDate() + 10);
    findUnique.mockResolvedValue({ status: CompanyStatus.TRIAL, trialExpiraEm: emAndamento });
    const context = buildContext("POST", buildActor());

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("libera escrita no dia de graça (1 dia após o vencimento do trial)", async () => {
    const venceuHoje = new Date();
    venceuHoje.setHours(venceuHoje.getHours() - 12); // venceu há 12h, ainda dentro do 1 dia de graça
    findUnique.mockResolvedValue({ status: CompanyStatus.TRIAL, trialExpiraEm: venceuHoje });
    const context = buildContext("PATCH", buildActor());

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("bloqueia escrita depois do dia de graça (trial vencido há mais de 1 dia)", async () => {
    const venceuFaz3Dias = new Date();
    venceuFaz3Dias.setDate(venceuFaz3Dias.getDate() - 3);
    findUnique.mockResolvedValue({ status: CompanyStatus.TRIAL, trialExpiraEm: venceuFaz3Dias });
    const context = buildContext("POST", buildActor());

    await expect(guard.canActivate(context)).rejects.toThrow(TrialExpiradoException);
  });

  it("bloqueia empresa INADIMPLENTE independente de trialExpiraEm", async () => {
    findUnique.mockResolvedValue({ status: CompanyStatus.INADIMPLENTE, trialExpiraEm: null });
    const context = buildContext("DELETE", buildActor());

    await expect(guard.canActivate(context)).rejects.toThrow(TrialExpiradoException);
  });

  it("bloqueia empresa SUSPENSO", async () => {
    findUnique.mockResolvedValue({ status: CompanyStatus.SUSPENSO, trialExpiraEm: null });
    const context = buildContext("PUT", buildActor());

    await expect(guard.canActivate(context)).rejects.toThrow(TrialExpiradoException);
  });

  it("bloqueia empresa CANCELADO", async () => {
    findUnique.mockResolvedValue({ status: CompanyStatus.CANCELADO, trialExpiraEm: null });
    const context = buildContext("POST", buildActor());

    await expect(guard.canActivate(context)).rejects.toThrow(TrialExpiradoException);
  });

  it("libera empresa ATIVO (assinatura em dia)", async () => {
    findUnique.mockResolvedValue({ status: CompanyStatus.ATIVO, trialExpiraEm: null });
    const context = buildContext("POST", buildActor());

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("libera quando a empresa não é encontrada (nunca derruba a requisição por um lookup ausente)", async () => {
    findUnique.mockResolvedValue(null);
    const context = buildContext("POST", buildActor());

    await expect(guard.canActivate(context)).resolves.toBe(true);
  });

  it("libera quando não há usuário autenticado (guards de auth já cuidam disso antes)", async () => {
    const context = buildContext("POST", undefined);

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(findUnique).not.toHaveBeenCalled();
  });
});
