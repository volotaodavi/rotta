import { Controller, Get, INestApplication } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { Test } from "@nestjs/testing";
import { Throttle, ThrottlerModule } from "@nestjs/throttler";
import request from "supertest";

import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { ThrottlerModuleOptions } from "@nestjs/throttler";
import type { NextFunction, Request, Response } from "express";

import { SemRateLimit } from "@/common/decorators/sem-rate-limit.decorator";
import { RottaThrottlerGuard } from "@/common/guards/rotta-throttler.guard";
import { faixasRateLimit, LIMITES_RATE_LIMIT } from "@/common/guards/throttler.options";


/**
 * Sobe um NestJS de verdade (sem banco, sem Redis) só com o
 * `RottaThrottlerGuard` global, para provar as coisas que teste de
 * unidade não prova:
 *
 *  - que o guard é construído pelo container de DI. `RottaThrottlerGuard`
 *    estende `ThrottlerGuard` sem redeclarar o construtor, e depende de
 *    o Nest achar os `@Inject` da classe base pela cadeia de protótipos.
 *    Se isso quebrar, a API não sobe — e quebraria em produção, não aqui.
 *  - que o 429 realmente acontece no limite configurado;
 *  - que dois usuários diferentes não derrubam um ao outro;
 *  - que `@SemRateLimit()` isenta as três faixas, não só a `default`.
 *
 * O `skipIf` de produção desliga o rate limiting quando
 * `NODE_ENV === "test"` (senão as suites E2E se auto-bloqueariam), então
 * aqui as opções são reaproveitadas SEM ele — é o único jeito de
 * exercitar o comportamento real dentro do jest.
 */
const opcoesSemSkip: ThrottlerModuleOptions = { throttlers: faixasRateLimit };

const usuarioFalso: Record<string, AuthenticatedUser> = {};

@Controller("teste")
class TesteController {
  @Get("normal")
  normal(): { ok: true } {
    return { ok: true };
  }

  /** Mesma forma dos `@Throttle(...)` reais de `AuthController`. */
  @Get("apertada")
  @Throttle({ default: { limit: 2, ttl: 60_000 } })
  apertada(): { ok: true } {
    return { ok: true };
  }

  @Get("isenta")
  @SemRateLimit()
  isenta(): { ok: true } {
    return { ok: true };
  }
}

describe("rate limiting (integração)", () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ThrottlerModule.forRoot(opcoesSemSkip)],
      controllers: [TesteController],
      providers: [{ provide: APP_GUARD, useClass: RottaThrottlerGuard }],
    }).compile();

    app = moduleRef.createNestApplication();
    // Faz o papel do `JwtAuthGuard`: quem manda `x-teste-usuario` vira
    // uma requisição autenticada daquele usuário.
    app.use((req: Request, _res: Response, next: NextFunction) => {
      const id = req.headers["x-teste-usuario"];
      if (typeof id === "string") {
        usuarioFalso[id] ??= {
          sub: id,
          tenantId: null,
          role: "MOTORISTA" as AuthenticatedUser["role"],
          vinculoId: `vinculo-${id}`,
        };
        (req as Request & { user?: AuthenticatedUser }).user = usuarioFalso[id];
      }
      next();
    });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const chamar = (rota: string, usuario: string): request.Test =>
    request(app.getHttpServer()).get(`/teste/${rota}`).set("x-teste-usuario", usuario);

  it("sobe com o guard resolvido pelo container (DI da classe base)", async () => {
    await chamar("normal", "di").expect(200);
  });

  it("devolve 429 quando a rajada estoura, e só depois dela", async () => {
    const usuario = "rajada";
    const { limite } = LIMITES_RATE_LIMIT.rajada;

    // Exatamente no limite ainda passa.
    for (let i = 0; i < limite; i += 1) {
      await chamar("normal", usuario).expect(200);
    }

    const bloqueada = await chamar("normal", usuario);
    expect(bloqueada.status).toBe(429);
    expect(bloqueada.body).toMatchObject({
      message: expect.stringContaining("Muitas requisições em pouco tempo"),
    });
  });

  it("não deixa um usuário bloqueado derrubar outro", async () => {
    // O teste acima já deixou "rajada" bloqueado; outro usuário passa.
    await chamar("normal", "vizinho").expect(200);
  });

  it("respeita o @Throttle por rota, que é mais apertado que o global", async () => {
    const usuario = "apertada";
    await chamar("apertada", usuario).expect(200);
    await chamar("apertada", usuario).expect(200);
    await chamar("apertada", usuario).expect(429);

    // A rota apertada não contamina as outras: a faixa `default` conta
    // por endpoint.
    await chamar("normal", usuario).expect(200);
  });

  it("@SemRateLimit() isenta as três faixas, não só a default", async () => {
    const usuario = "isento";
    const total = LIMITES_RATE_LIMIT.rajada.limite + 10;
    for (let i = 0; i < total; i += 1) {
      await chamar("isenta", usuario).expect(200);
    }
  });
});
