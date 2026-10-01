import { TenantGuard } from "../tenant.guard";

import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { TenantContext } from "@/infra/database/tenant-context";
import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";

import { IS_PUBLIC_KEY } from "@/common/decorators/public.decorator";
import { SEM_TENANT_KEY } from "@/common/decorators/sem-tenant.decorator";
import { Role } from "@/shared/enums";

/**
 * O portão de isolamento multi-tenant.
 *
 * Metade destes testes existe por um bug real (01/10/2026): o
 * transportador autônomo recebia `Forbidden resource` ao tentar
 * verificar a identidade. A causa era este guard reprovando todo
 * usuário sem `tenantId` — e o autônomo nasce assim por desenho
 * (`AuthService.registerAutonomo` emite `issueTokens(user, null, ...)`),
 * justamente porque a verificação de identidade vem ANTES de pedir
 * vínculo com uma transportadora.
 *
 * A outra metade existe para que o conserto não vire um buraco: afrouxar
 * um guard de isolamento é o tipo de mudança que conserta uma tela e
 * abre o dado de todo mundo. Por isso os testes abaixo afirmam, com o
 * mesmo peso, o que o `@SemTenant()` libera E o que ele continua
 * barrando.
 */
interface RequisicaoDeTeste {
  user?: AuthenticatedUser;
  tenantContext?: TenantContext;
}

function montar(
  user: AuthenticatedUser | undefined,
  metadata: { publico?: boolean; semTenant?: boolean } = {},
) {
  const request: RequisicaoDeTeste = { user };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;

  const reflector = {
    getAllAndOverride: jest.fn((chave: string) => {
      if (chave === IS_PUBLIC_KEY) return metadata.publico ?? false;
      if (chave === SEM_TENANT_KEY) return metadata.semTenant ?? false;
      return undefined;
    }),
  } as unknown as jest.Mocked<Reflector>;

  return { guard: new TenantGuard(reflector), request, context };
}

function ator(overrides: Partial<AuthenticatedUser> = {}): AuthenticatedUser {
  return {
    sub: "user-1",
    tenantId: "company-1",
    role: Role.MOTORISTA,
    vinculoId: "v-1",
    ...overrides,
  };
}

describe("o autônomo sem vínculo consegue verificar a identidade", () => {
  it("rota @SemTenant() libera quem ainda não tem transportadora", () => {
    // O caso do relato. Motorista autônomo recém-cadastrado: token
    // válido, papel certo, e NENHUM `tenantId` — porque o vínculo só
    // vem depois da Didit.
    const { guard, request, context } = montar(ator({ tenantId: null }), { semTenant: true });

    expect(guard.canActivate(context)).toBe(true);
    expect(request.tenantContext).toEqual({ tenantId: null, bypass: false });
  });

  it("libera sem dar passe livre: `bypass` continua FALSO", () => {
    // É o detalhe que separa "deixar a requisição passar" de "deixar a
    // pessoa ver o banco inteiro". Com `bypass: false`, `withTenant(...)`
    // não devolve linha de NENHUMA tabela com RLS — mesmo contexto que
    // o Responsável já recebia.
    const { guard, request, context } = montar(ator({ tenantId: null, role: Role.MONITOR }), {
      semTenant: true,
    });

    guard.canActivate(context);

    expect(request.tenantContext?.bypass).toBe(false);
  });
});

describe("o isolamento não ficou mais frouxo", () => {
  it("rota NORMAL continua reprovando quem não tem transportadora", () => {
    // Se este cair, o conserto virou buraco: qualquer rota de tenant
    // passaria a aceitar requisição sem tenant nenhum.
    const { guard, request, context } = montar(ator({ tenantId: null }));

    expect(guard.canActivate(context)).toBe(false);
    expect(request.tenantContext).toBeUndefined();
  });

  it("@SemTenant() NÃO troca o tenant de quem tem um", () => {
    // A marcação é sobre a AUSÊNCIA de tenant. Quem tem continua preso
    // ao seu — a rota marcada não vira uma porta cross-tenant.
    const { guard, request, context } = montar(ator({ tenantId: "company-7" }), {
      semTenant: true,
    });

    expect(guard.canActivate(context)).toBe(true);
    expect(request.tenantContext).toEqual({ tenantId: "company-7", bypass: false });
  });

  it("sem usuário nenhum, reprova mesmo com @SemTenant()", () => {
    const { guard, context } = montar(undefined, { semTenant: true });

    expect(guard.canActivate(context)).toBe(false);
  });
});

describe("os casos que já existiam continuam valendo", () => {
  it("Admin Rotta segue cross-tenant (bypass)", () => {
    const { guard, request, context } = montar(ator({ tenantId: null, role: Role.ADMIN_ROTTA }));

    expect(guard.canActivate(context)).toBe(true);
    expect(request.tenantContext).toEqual({ tenantId: null, bypass: true });
  });

  it("Responsável passa sem tenant e SEM bypass", () => {
    const { guard, request, context } = montar(ator({ tenantId: null, role: Role.RESPONSAVEL }));

    expect(guard.canActivate(context)).toBe(true);
    expect(request.tenantContext).toEqual({ tenantId: null, bypass: false });
  });

  it("rota pública passa direto", () => {
    const { guard, context } = montar(undefined, { publico: true });

    expect(guard.canActivate(context)).toBe(true);
  });
});
