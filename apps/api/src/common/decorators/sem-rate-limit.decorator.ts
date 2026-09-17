import { SkipThrottle } from "@nestjs/throttler";

import { FAIXAS_RATE_LIMIT } from "@/common/guards/throttler.options";

/**
 * Dispensa a rota (ou o controller inteiro) do rate limiting — as três
 * faixas de uma vez.
 *
 * Existe porque o `@SkipThrottle()` do pacote, chamado sem argumento,
 * dispensa APENAS a faixa chamada "default"; a rota continuaria sujeita
 * a `rajada` e `sustentado`, e o decorator pareceria funcionar até o dia
 * em que uma rajada de callbacks tomasse 429 em produção.
 *
 * Use só onde o limite não faz sentido conceitualmente:
 *
 *  - Health check — o monitoramento do Render bate de forma previsível
 *    e precisa de resposta mesmo quando a API está sob ataque; um 429
 *    aqui faria o Render achar que o serviço caiu e reiniciar o
 *    container no pior momento possível.
 *  - Callbacks de fila (`internal/queue/*`) — quem chama é o QStash,
 *    sempre dos mesmos poucos IPs e em rajada de propósito (é o ponto
 *    de uma fila). Limitá-los por IP transformaria "chegaram 200
 *    notificações para enviar" em "180 notificações perdidas".
 *  - Webhooks de provedor (`webhooks/*`) — mesma lógica: Asaas e Didit
 *    chamam de IPs próprios, e cada um desses endpoints já é protegido
 *    por verificação de assinatura, que é um controle mais forte que
 *    contagem de requisições.
 *
 * Nunca use em rota que um cliente do app/web chama.
 */
export const SemRateLimit = (): MethodDecorator & ClassDecorator =>
  SkipThrottle(Object.fromEntries(FAIXAS_RATE_LIMIT.map((faixa) => [faixa, true])));
