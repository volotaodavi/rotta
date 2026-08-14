/**
 * Normaliza `API_PUBLIC_URL` removendo um sufixo `/{apiPrefix}` (ex.:
 * `/v1`) já incluído por engano — bug real encontrado em produção via os
 * destinos de webhook cadastrados na Didit (`didit_webhook_list`, conta
 * real da Rotta): o destino auto-registrado por
 * `DiditWebhookProvisioningService` ("Rotta (auto-registrado)") tinha URL
 * `https://rotta-vt7i.onrender.com/v1/v1/webhooks/didit` — `/v1`
 * duplicado — e 100% das entregas (6/6) falhavam.
 *
 * Causa raiz: todo consumidor interno de `API_PUBLIC_URL` (este serviço,
 * `QstashPublisherService`, `QstashScheduleService`) já concatena
 * `/${API_PREFIX}` por conta própria (`${apiPublicUrl}/${apiPrefix}/...`).
 * A variável precisa ser só o host (`https://rotta-vt7i.onrender.com`),
 * mas a URL "pública" documentada/exposta a clientes da API já inclui o
 * prefixo (`https://rotta-vt7i.onrender.com/v1`, ver
 * `docs/33-infraestrutura-devops-preparacao-producao.md`) — um erro
 * natural de quem configura a variável no painel do Render colar essa
 * URL documentada em vez do host puro.
 *
 * Em vez de confiar que a variável de ambiente nunca mais vai vir errada,
 * normaliza uma vez na leitura da config: tira barra final e um sufixo
 * `/{apiPrefix}` se já estiver lá. Idempotente — uma URL já correta
 * (sem o sufixo) passa inalterada.
 */
export function normalizeApiPublicUrl(
  rawUrl: string | undefined,
  apiPrefix: string,
): string | undefined {
  if (!rawUrl) return rawUrl;

  const trimmed = rawUrl.replace(/\/+$/, "");
  const prefixSuffix = `/${apiPrefix}`;

  return trimmed.endsWith(prefixSuffix) ? trimmed.slice(0, -prefixSuffix.length) : trimmed;
}
