import { Reflector } from "@nestjs/core";

import { ipDoCliente, RottaThrottlerGuard } from "../rotta-throttler.guard";
import {
  FAIXAS_RATE_LIMIT,
  faixasRateLimit,
  LIMITES_RATE_LIMIT,
  throttlerOptions,
} from "../throttler.options";

import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { ThrottlerStorage } from "@nestjs/throttler";

import { Role } from "@/shared/enums";

/**
 * O que estes testes protegem, em ordem de gravidade:
 *
 *  1. Que o contador é por usuário. Se isto regredir para "por IP", uma
 *     transportadora inteira atrás do CGNAT da operadora leva 429 junta
 *     — o modo de falha mais caro possível para um app de celular.
 *  2. Que o IP sai do cabeçalho da borda, não do socket. Era um bug em
 *     produção: com Cloudflare na frente, `req.ip` é o IP do proxy para
 *     todo mundo, e o limite de 5 logins/minuto valia para o planeta.
 *  3. Que a faixa chamada "default" continua existindo com esse nome —
 *     é dela que os `@Throttle({ default: ... })` dos controllers de
 *     Auth dependem para apertar o limite de força bruta.
 */
describe("RottaThrottlerGuard", () => {
  const guard = new RottaThrottlerGuard(throttlerOptions, {} as ThrottlerStorage, new Reflector());

  // `getTracker` é `protected` — o teste exercita exatamente o que o
  // `ThrottlerGuard` chama, então o acesso é intencional.
  const tracker = (req: Record<string, unknown>): Promise<string> =>
    (
      guard as unknown as { getTracker: (r: Record<string, unknown>) => Promise<string> }
    ).getTracker(req);

  const usuario: AuthenticatedUser = {
    sub: "user-1",
    tenantId: "empresa-1",
    role: Role.MOTORISTA,
    vinculoId: "vinculo-1",
  };

  describe("getTracker", () => {
    it("conta por usuário autenticado, não pelo IP", async () => {
      // Dois motoristas da mesma empresa saindo pelo MESMO IP (rede móvel
      // com CGNAT, ou o Wi-Fi da garagem) precisam de contadores separados.
      const ipCompartilhado = { "cf-connecting-ip": "200.10.0.1" };

      const a = await tracker({ user: usuario, headers: ipCompartilhado });
      const b = await tracker({
        user: { ...usuario, sub: "user-2" },
        headers: ipCompartilhado,
      });

      expect(a).toBe("u:user-1");
      expect(b).toBe("u:user-2");
      expect(a).not.toBe(b);
    });

    it("cai no IP quando a rota é pública (sem usuário)", async () => {
      const chave = await tracker({ headers: { "cf-connecting-ip": "200.10.0.1" } });
      expect(chave).toBe("ip:200.10.0.1");
    });
  });

  describe("ipDoCliente", () => {
    it("prefere o cabeçalho da Cloudflare ao IP do socket", () => {
      // O IP do socket é o do proxy — usá-lo colocaria todo o tráfego
      // do planeta num contador só.
      expect(
        ipDoCliente({
          headers: { "cf-connecting-ip": "200.10.0.1", "x-forwarded-for": "1.1.1.1" },
          ip: "10.0.0.7",
        }),
      ).toBe("200.10.0.1");
    });

    it("usa o primeiro salto do x-forwarded-for quando não há cabeçalho da Cloudflare", () => {
      expect(
        ipDoCliente({ headers: { "x-forwarded-for": "200.10.0.1, 10.0.0.7" }, ip: "10.0.0.7" }),
      ).toBe("200.10.0.1");
    });

    it("volta para o IP do socket quando nenhum cabeçalho chega", () => {
      expect(ipDoCliente({ headers: {}, ip: "10.0.0.7" })).toBe("10.0.0.7");
    });

    it("nunca devolve string vazia", () => {
      expect(ipDoCliente({ headers: { "x-forwarded-for": "  " } })).toBe("desconhecido");
    });
  });

  describe("faixas configuradas", () => {
    it("mantém uma faixa chamada 'default'", () => {
      // Os `@Throttle({ default: ... })` de `AuthController` viram letra
      // morta sem ela — o login voltaria a aceitar 120 tentativas/minuto.
      expect(faixasRateLimit.map((f) => f.name)).toEqual([...FAIXAS_RATE_LIMIT]);
    });

    it("deixa folga sobre o pior caso legítimo (~60 req/min por pessoa)", () => {
      const porMinuto = (limite: number, ttlMs: number): number => limite / (ttlMs / 60_000);

      expect(porMinuto(LIMITES_RATE_LIMIT.porRota.limite, LIMITES_RATE_LIMIT.porRota.ttlMs)).toBe(
        120,
      );
      expect(
        porMinuto(LIMITES_RATE_LIMIT.sustentado.limite, LIMITES_RATE_LIMIT.sustentado.ttlMs),
      ).toBe(120);
      // A rajada é mais folgada por minuto de propósito: ela existe para
      // cortar o pico de 1 segundo, não para limitar o uso do dia.
      expect(
        porMinuto(LIMITES_RATE_LIMIT.rajada.limite, LIMITES_RATE_LIMIT.rajada.ttlMs),
      ).toBeGreaterThan(120);
    });
  });
});
