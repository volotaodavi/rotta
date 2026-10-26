import { registerAs } from "@nestjs/config";

export interface LytexConfig {
  clientId: string | undefined;
  clientSecret: string | undefined;
  /**
   * Sem barra no fim. O padrão é o SANDBOX, pelo mesmo motivo do
   * `asaas.config.ts`: um ambiente novo que suba sem a variável cobra em
   * teste, não no dinheiro de uma família.
   *
   * Produção é `https://api-pay.lytex.com.br`. Os dois valores saem dos
   * `servers` do OpenAPI da Lytex, lido em 23/10/2026.
   */
  baseUrl: string;
  /**
   * Confere o header que o webhook cadastrado no painel da Lytex envia.
   * Valor escolhido por nós, como no Asaas: a Lytex não assina o corpo
   * do webhook, então a única barreira possível é um segredo combinado.
   */
  webhookToken: string | undefined;
  /**
   * O `_recipientId` da própria Rotta na Lytex: para onde vai a nossa
   * taxa quando a cobrança é emitida pela subconta da transportadora.
   *
   * Sem ele não há split, e `montarSplit` devolve `undefined` em vez de
   * inventar um destino. A consequência é explícita no log: a cobrança
   * sai, o transportador recebe tudo, e a Rotta não retém nada.
   */
  rottaRecipientId: string | undefined;
}

/**
 * Configuração da Lytex (lytex.com.br), a provedora que passa a emitir a
 * mensalidade da família e a fazer o split da taxa da Rotta.
 *
 * ## Por que a Lytex, e desde quando
 *
 * Decisão do fundador em 23/10/2026, depois da comparação de cinco
 * provedoras (Asaas, Pagar.me, Zoop, Efí e Lytex) registrada em
 * `empresa/financeiro/`. O que decidiu:
 *
 * - **Subconta sem guardar chave de terceiro.** A Lytex emite a cobrança
 *   em nome da subconta pelo header `subRecipientId`, com a credencial
 *   da plataforma. O Asaas exigia a chave de API da subconta guardada
 *   aqui dentro, que era o ponto mais delicado daquele desenho.
 * - **Split liberado na hora**, sem período de avaliação regulatória com
 *   teto por subconta.
 * - **Retenção real** (`floatConfig`), confirmada pelo suporte em
 *   22/10/2026: boleto D+2, Pix D+0.
 *
 * O Asaas **continua** sendo quem cobra a assinatura da própria Rotta
 * das transportadoras (`BillingService`). Esta mudança é só do dinheiro
 * da família, que é onde o split existe.
 *
 * Sem `clientId`/`clientSecret` a aplicação sobe normalmente e
 * `LytexClientService` recusa a chamada com erro claro: o mesmo padrão
 * de stub honesto das demais integrações opcionais. Credenciais
 * presentes e integração funcionando continuam sendo dois estados
 * diferentes, e quem responde por essa diferença é `isConfigured()`.
 */
export default registerAs("lytex", (): LytexConfig => ({
  clientId: process.env.LYTEX_CLIENT_ID || undefined,
  clientSecret: process.env.LYTEX_CLIENT_SECRET || undefined,
  baseUrl: (process.env.LYTEX_BASE_URL || "https://sandbox-api-pay.lytex.com.br").replace(
    /\/+$/,
    "",
  ),
  webhookToken: process.env.LYTEX_WEBHOOK_TOKEN || undefined,
  rottaRecipientId: process.env.LYTEX_ROTTA_RECIPIENT_ID || undefined,
}));
