import { describe, expect, it } from "vitest";

import { TIMEOUT_PADRAO_MS, TIMEOUT_PARTIDA_FRIA_MS, TIMEOUT_UPLOAD_MS } from "../http";

/**
 * A aritmética que deixou o app do Rotta "sem abrir" em 06/10/2026.
 *
 * ## O defeito
 *
 * A API roda no plano gratuito do Render, que desliga o serviço depois
 * de 15 minutos sem tráfego. Acordar leva perto de 90 segundos, e isso
 * não é estimativa: foi medido em 03/09/2026 e está registrado na nota
 * de `apps/web/src/lib/wake-api.ts`, junto com um webhook real da Asaas
 * que expirou por causa disso.
 *
 * O teto de tempo das requisições era 60 segundos. Sessenta é menor que
 * noventa, então a PRIMEIRA chamada depois de a API dormir era abortada
 * pelo próprio app, sempre, 30 segundos antes de o servidor ficar
 * pronto. No celular isso aparece como "o app não abre": a renovação de
 * sessão estoura, o `catch` manda para a tela de login, e a tentativa
 * de login estoura de novo pelo mesmo motivo.
 *
 * A web não sofria porque ela acorda a API ao entrar na Landing Page
 * (`wakeApi()`), e a pessoa gasta o cold start lendo a página. O app não
 * tinha nada equivalente: quem pagava a espera era o usuário, e ele
 * perdia.
 *
 * ## Por que o teste é sobre números e não sobre comportamento
 *
 * Porque o defeito É um número menor que o outro. Um teste que simulasse
 * uma requisição lenta provaria que o `AbortController` funciona, que já
 * era verdade e não era o problema. O que precisa ficar travado é a
 * relação: o teto da partida fria tem que ser maior que o cold start
 * conhecido, senão o app volta a desistir antes da hora.
 */
describe("tetos de tempo contra o cold start do plano gratuito", () => {
  /** Medido em 03/09/2026 contra a API de produção. */
  const COLD_START_MEDIDO_MS = 89_000;

  it("o teto da partida fria cobre o cold start medido, com folga", () => {
    expect(TIMEOUT_PARTIDA_FRIA_MS).toBeGreaterThan(COLD_START_MEDIDO_MS);
  });

  it("a partida fria é mais tolerante que uma requisição comum", () => {
    expect(TIMEOUT_PARTIDA_FRIA_MS).toBeGreaterThan(TIMEOUT_PADRAO_MS);
  });

  it("o teto padrão continua curto, porque ele é o da tela travada", () => {
    /*
      O padrão NÃO sobe junto. Se toda requisição esperasse dois minutos,
      um servidor fora do ar viraria uma tela parada por dois minutos em
      cada toque, e o usuário não tem como saber se é lentidão ou defeito.
      O teto longo vale só para o momento em que acordar o servidor é a
      explicação mais provável: a abertura do app.
    */
    expect(TIMEOUT_PADRAO_MS).toBeLessThanOrEqual(60_000);
  });

  it("upload continua com teto próprio, maior que o comum", () => {
    expect(TIMEOUT_UPLOAD_MS).toBeGreaterThan(TIMEOUT_PADRAO_MS);
  });
});
