import { AdminRottaPapel } from "@prisma/client";


import { AdminAreaGuard } from "../admin-area.guard";

import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";

import { AdminArea, Role } from "@/shared/enums";

function buildContext(user: AuthenticatedUser | undefined): ExecutionContext {
  const request = { user };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function buildActor(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    sub: "admin-1",
    tenantId: null,
    role: Role.ADMIN_ROTTA,
    vinculoId: "v-1",
    ...overrides,
  };
}

function buildGuard(requiredAreas: AdminArea[] | undefined): AdminAreaGuard {
  const reflector = {
    getAllAndOverride: jest.fn().mockReturnValue(requiredAreas),
  } as unknown as jest.Mocked<Reflector>;
  return new AdminAreaGuard(reflector);
}

describe("AdminAreaGuard", () => {
  it("libera qualquer papel que não seja ADMIN_ROTTA, mesmo sem @AdminAreas", () => {
    const guard = buildGuard(undefined);
    const ctx = buildContext(buildActor({ role: Role.EMPRESA }));
    expect(guard.canActivate(ctx)).toBe(true);
  });

  it("libera sem usuário no request (deixa outros guards decidirem)", () => {
    const guard = buildGuard(undefined);
    expect(guard.canActivate(buildContext(undefined))).toBe(true);
  });

  it("GERAL sempre passa, com ou sem @AdminAreas na rota", () => {
    const guardSemDecorator = buildGuard(undefined);
    const guardComDecorator = buildGuard([AdminArea.FINANCEIRO]);
    const actor = buildActor({ adminPapel: AdminRottaPapel.GERAL });

    expect(guardSemDecorator.canActivate(buildContext(actor))).toBe(true);
    expect(guardComDecorator.canActivate(buildContext(actor))).toBe(true);
  });

  it("trata adminPapel ausente como GERAL (backward-compat com token antigo)", () => {
    const guard = buildGuard(undefined);
    const actor = buildActor({ adminPapel: undefined });
    expect(guard.canActivate(buildContext(actor))).toBe(true);
  });

  it("SUPORTE: rota sem @AdminAreas é recusada (default seguro)", () => {
    const guard = buildGuard(undefined);
    const actor = buildActor({ adminPapel: AdminRottaPapel.SUPORTE });
    expect(guard.canActivate(buildContext(actor))).toBe(false);
  });

  it("SUPORTE: passa em SUPORTE/IDENTIDADE/VEICULOS", () => {
    const actor = buildActor({ adminPapel: AdminRottaPapel.SUPORTE });
    expect(buildGuard([AdminArea.SUPORTE]).canActivate(buildContext(actor))).toBe(true);
    expect(buildGuard([AdminArea.IDENTIDADE]).canActivate(buildContext(actor))).toBe(true);
    expect(buildGuard([AdminArea.VEICULOS]).canActivate(buildContext(actor))).toBe(true);
  });

  it("SUPORTE: nunca acessa FINANCEIRO", () => {
    const actor = buildActor({ adminPapel: AdminRottaPapel.SUPORTE });
    expect(buildGuard([AdminArea.FINANCEIRO]).canActivate(buildContext(actor))).toBe(false);
  });

  it("FINANCEIRO: só passa em FINANCEIRO, nunca em SUPORTE/IDENTIDADE/VEICULOS", () => {
    const actor = buildActor({ adminPapel: AdminRottaPapel.FINANCEIRO });
    expect(buildGuard([AdminArea.FINANCEIRO]).canActivate(buildContext(actor))).toBe(true);
    expect(buildGuard([AdminArea.SUPORTE]).canActivate(buildContext(actor))).toBe(false);
    expect(buildGuard([AdminArea.IDENTIDADE]).canActivate(buildContext(actor))).toBe(false);
    expect(buildGuard([AdminArea.VEICULOS]).canActivate(buildContext(actor))).toBe(false);
  });

  it("uma rota marcada com mais de uma área passa se o papel tiver QUALQUER uma delas", () => {
    const actor = buildActor({ adminPapel: AdminRottaPapel.FINANCEIRO });
    const guard = buildGuard([AdminArea.SUPORTE, AdminArea.FINANCEIRO]);
    expect(guard.canActivate(buildContext(actor))).toBe(true);
  });
});
