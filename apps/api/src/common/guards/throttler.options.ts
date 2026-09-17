import type { ThrottlerModuleOptions, ThrottlerOptions } from "@nestjs/throttler";

/**
 * Os números do rate limiting, num arquivo só (pedido do usuário
 * 17/09/2026). A lógica de COMO contar está em
 * `rotta-throttler.guard.ts`; aqui fica QUANTO.
 *
 * São três faixas, e as três valem ao mesmo tempo para cada requisição
 * — a mais apertada que estourar é a que devolve 429:
 *
 *  - `default` — POR ROTA, por usuário. É a faixa que os controllers já
 *    existentes apertam com `@Throttle({ default: ... })` (login 5/min,
 *    convite 10/min, pré-cadastro 8/min). O nome PRECISA continuar
 *    sendo "default", senão aqueles decorators viram letra morta e o
 *    login volta a aceitar 120 tentativas por minuto.
 *  - `rajada` — TODAS as rotas somadas, por usuário, em 10 segundos.
 *    É esta que responde ao pedido literal ("milhares de requisições em
 *    1 seg"): um flood estoura 90 antes do primeiro segundo terminar e
 *    passa os 10 segundos seguintes levando 429.
 *  - `sustentado` — TODAS as rotas somadas, por usuário, em 5 minutos.
 *    Pega o abuso devagar, que passa por baixo da rajada: 2 req/s
 *    constantes durante horas nunca dispara a faixa de 10s, mas queima
 *    banco e banda — e é exatamente o que estoura cota de plano free.
 *
 * De onde saem os valores (uso real medido no app, não chute):
 *
 *  - O maior polling da plataforma é o GPS, `GPS_LIVE_POLL_INTERVAL_MS`
 *    = 3s, dos dois lados: o motorista enviando posição e o responsável
 *    lendo. São 20 requisições/minuto em cada rota.
 *  - Os demais `refetchInterval` do web/mobile/admin são 10s, 15s, 30s
 *    e 60s.
 *  - Abrir uma tela pesada dispara ~15 requisições em paralelo.
 *
 * Então o pior caso legítimo é da ordem de 60 req/min por pessoa
 * (motorista em viagem: 20 de GPS + 20 de leitura + navegação). Cada
 * faixa fica com folga de ~4× em cima disso, que é o suficiente para
 * nenhum usuário honesto encostar no limite e nenhum atacante conseguir
 * derrubar a API antes de ser cortado.
 */
/**
 * Nomes das três faixas. Exportado porque `@SemRateLimit()` precisa
 * dispensar TODAS elas — o `@SkipThrottle()` do pacote, chamado sem
 * argumento, dispensa só a faixa chamada "default" e deixaria a rota
 * ainda sujeita a `rajada`/`sustentado`, que é justamente o oposto do
 * que o decorator promete.
 */
export const FAIXAS_RATE_LIMIT = ["default", "rajada", "sustentado"] as const;

export const LIMITES_RATE_LIMIT = {
  porRota: { ttlMs: 60_000, limite: 120 },
  rajada: { ttlMs: 10_000, limite: 90 },
  sustentado: { ttlMs: 300_000, limite: 600 },
} as const;

/**
 * A mesma chave para qualquer rota — é o que diferencia as faixas
 * globais (`rajada`/`sustentado`) da `default`, que usa o gerador
 * padrão do pacote (um hash de classe + handler, ou seja, um contador
 * separado por endpoint).
 */
const chaveGlobal = (_contexto: unknown, tracker: string, faixa: string): string =>
  `${faixa}:${tracker}`;

/**
 * As faixas em si, exportadas à parte do objeto de opções porque o
 * teste de integração precisa montar um módulo com elas SEM o `skipIf`
 * (que, dentro do jest, desligaria justamente o que está sendo testado).
 */
export const faixasRateLimit: ThrottlerOptions[] = [
  {
    name: "default",
    ttl: LIMITES_RATE_LIMIT.porRota.ttlMs,
    limit: LIMITES_RATE_LIMIT.porRota.limite,
  },
  {
    name: "rajada",
    ttl: LIMITES_RATE_LIMIT.rajada.ttlMs,
    limit: LIMITES_RATE_LIMIT.rajada.limite,
    generateKey: chaveGlobal,
  },
  {
    name: "sustentado",
    ttl: LIMITES_RATE_LIMIT.sustentado.ttlMs,
    limit: LIMITES_RATE_LIMIT.sustentado.limite,
    generateKey: chaveGlobal,
  },
];

export const throttlerOptions: ThrottlerModuleOptions = {
  throttlers: faixasRateLimit,
  // Suites E2E disparam dezenas de requisições/minuto contra o mesmo
  // processo de propósito (Dossiê 23 §10) — rate limiting é uma
  // preocupação de produção, nunca deveria fazer um teste falhar por
  // ser "rápido demais". Nenhum código de produção lê `NODE_ENV` para
  // decidir comportamento de negócio, só este guard técnico.
  skipIf: () => process.env.NODE_ENV === "test",
};
