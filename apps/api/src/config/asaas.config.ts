import { registerAs } from "@nestjs/config";

export interface AsaasConfig {
  apiKey: string | undefined;
  baseUrl: string;
  /** Confere o header `asaas-access-token` que o webhook cadastrado no dashboard da Asaas envia (Dossiê 26, ver `asaas-webhook.guard.ts`). Valor escolhido por nós, não pela Asaas. */
  webhookToken: string | undefined;
  /**
   * Chave simétrica (32 bytes, base64) que cifra a chave de API de cada
   * subconta de transportadora antes de ela encostar no banco.
   *
   * Vive separada da `MFA_ENCRYPTION_KEY` de propósito: são segredos de
   * donos diferentes, com ciclos de rotação diferentes. Girar a do MFA
   * não pode derrubar a cobrança, e vice-versa.
   *
   * Sem ela, a criação de subconta falha com erro claro, em vez de
   * guardar chave de terceiro em texto puro.
   */
  subcontaEncryptionKey: string | undefined;
  /**
   * O `walletId` da própria Rotta no Asaas.
   *
   * Só é usado quando a cobrança é emitida pela subconta da
   * transportadora: aí o split precisa dizer para onde vai a NOSSA
   * parte. Quando a Rotta é a emissora, o dinheiro já está na conta
   * dela e não há para onde mandar.
   *
   * Sem ele, a cobrança pela subconta sai sem split, e a Rotta não
   * retém nada. É por isso que `montarSplit` devolve `undefined` em vez
   * de inventar um destino.
   */
  rottaWalletId: string | undefined;
}

/**
 * Configuração da Asaas (asaas.com) — provedora ÚNICA de pagamento
 * (pedido do usuário 05/09/2026: "Nós usaremos 100% Asaas, esquece a
 * AbacatePay") que processa Pix, cartão de crédito/débito e boleto da
 * mensalidade da Rotta (Dossiê 26, R$ 39,90/mês). `apiKey`/
 * `webhookToken` opcionais: sem eles, a aplicação sobe normalmente e
 * `AsaasClientService` recusa a chamada com um erro claro (mesmo
 * padrão "stub honesto" de `LytexConfig`) — nunca finge uma cobrança
 * que não existe.
 */
export default registerAs("asaas", (): AsaasConfig => ({
  apiKey: process.env.ASAAS_API_KEY || undefined,
  baseUrl: process.env.ASAAS_BASE_URL || "https://api-sandbox.asaas.com/v3",
  webhookToken: process.env.ASAAS_WEBHOOK_TOKEN || undefined,
  subcontaEncryptionKey: process.env.ASAAS_SUBCONTA_ENCRYPTION_KEY || undefined,
  rottaWalletId: process.env.ASAAS_ROTTA_WALLET_ID || undefined,
}));
