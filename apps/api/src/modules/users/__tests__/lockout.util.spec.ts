import { duracaoDoBloqueioMs, LOCKOUT_BASE_MS, LOCKOUT_TETO_MS } from "../lockout.util";

const MINUTO = 60 * 1000;
const HORA = 60 * MINUTO;

/**
 * `RN-AUTH-02`. O que estes testes protegem:
 *
 *  1. Que a espera CRESCE. Sem progressão, força bruta lenta (5 tentativas,
 *     espera, repete) fica viável para sempre — era o estado até 18/09/2026,
 *     com bloqueio fixo em 15 minutos.
 *  2. Que ela PARA de crescer. Bloqueio eterno vira negação de serviço
 *     contra a própria vítima.
 */
describe("duracaoDoBloqueioMs (RN-AUTH-02)", () => {
  it("o primeiro bloqueio vale a base de 15 minutos", () => {
    expect(duracaoDoBloqueioMs(1)).toBe(15 * MINUTO);
    expect(duracaoDoBloqueioMs(1)).toBe(LOCKOUT_BASE_MS);
  });

  it("dobra a cada bloqueio consecutivo", () => {
    expect(duracaoDoBloqueioMs(2)).toBe(30 * MINUTO);
    expect(duracaoDoBloqueioMs(3)).toBe(1 * HORA);
    expect(duracaoDoBloqueioMs(4)).toBe(2 * HORA);
    expect(duracaoDoBloqueioMs(5)).toBe(4 * HORA);
  });

  it("para no teto de 24 horas", () => {
    expect(duracaoDoBloqueioMs(10)).toBe(LOCKOUT_TETO_MS);
    expect(duracaoDoBloqueioMs(100)).toBe(LOCKOUT_TETO_MS);
  });

  it("nunca devolve valor inválido, por maior que seja o contador", () => {
    // 2^1024 é `Infinity`, e `new Date(Infinity)` é `Invalid Date` — o
    // Prisma rejeitaria com um erro obscuro em vez de bloquear a conta.
    const enorme = duracaoDoBloqueioMs(5_000);
    expect(Number.isFinite(enorme)).toBe(true);
    expect(enorme).toBe(LOCKOUT_TETO_MS);
    expect(new Date(Date.now() + enorme).toString()).not.toBe("Invalid Date");
  });

  it("trata contador corrompido como primeiro bloqueio, nunca menos que a base", () => {
    for (const valor of [0, -1, -999]) {
      expect(duracaoDoBloqueioMs(valor)).toBe(LOCKOUT_BASE_MS);
    }
  });

  it("a escala é sempre crescente até o teto", () => {
    let anterior = 0;
    for (let n = 1; n <= 12; n += 1) {
      const atual = duracaoDoBloqueioMs(n);
      expect(atual).toBeGreaterThanOrEqual(anterior);
      anterior = atual;
    }
  });
});
