import { registerAs } from "@nestjs/config";

import { normalizeApiPublicUrl } from "./api-public-url.util";

export interface QstashConfig {
  token: string;
  currentSigningKey: string;
  nextSigningKey: string;
  /**
   * URL pública onde ESTA implantação da API é alcançável (ex.:
   * `https://api.rotta.com.br`) — o QStash entrega os jobs via HTTP
   * POST para `${apiPublicUrl}/v1/internal/queue/...`, então precisa
   * ser um endereço real, alcançável pela internet (nunca
   * `localhost`/rede interna). Em desenvolvimento local sem QStash
   * configurado, nada que dependa disto executa (ver `QueueModule`).
   *
   * Passa por `normalizeApiPublicUrl` antes de chegar aqui — mesma
   * proteção aplicada em `didit.config.ts#apiPublicUrl` contra a env var
   * já vir com `/v1` colado (bug real encontrado do lado da Didit;
   * aqui teria o mesmo efeito: `${apiPublicUrl}/v1/v1/internal/queue/...`
   * duplicado, rejeitado pelo QStash com destino inválido).
   */
  apiPublicUrl: string;
}

/**
 * Configuracao do QStash (Upstash) — motor de filas serverless que
 * substitui o BullMQ (Dossie 14) na implantacao 100% Vercel (nenhum
 * processo Node permanente disponivel para um Worker classico
 * escutar o Redis). Ver `infra/queue/qstash/` para o racional
 * completo de cada peca (publisher, assinatura, agendamento).
 */
export default registerAs("qstash", (): QstashConfig => ({
  token: process.env.QSTASH_TOKEN ?? "",
  currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? "",
  nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? "",
  apiPublicUrl:
    normalizeApiPublicUrl(process.env.API_PUBLIC_URL, process.env.API_PREFIX || "v1") ?? "",
}));
