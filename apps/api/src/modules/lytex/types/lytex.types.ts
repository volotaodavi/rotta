/**
 * O contrato da API v2 da Lytex, na parte que a Rotta usa.
 *
 * ## De onde vieram estes tipos
 *
 * Do OpenAPI publicado pela própria Lytex, lido em 23/10/2026 em
 * `https://sandbox-api-pay.lytex.com.br/v2/open-api-v3-spec.json`
 * (`LyTex Pagamentos API`, versão 2.0.0; o mesmo documento é servido em
 * produção por `https://api-pay.lytex.com.br`). Não são tipos
 * adivinhados a partir de exemplo de blog: cada campo abaixo existe no
 * documento, com o mesmo nome e a mesma obrigatoriedade.
 *
 * O que NÃO está aqui, e por quê: o formato do corpo do webhook. A Lytex
 * documenta que o webhook existe e que a resposta esperada é HTTP 200,
 * mas não publica o esquema do corpo (não há `x-webhooks` no documento,
 * nem em sandbox nem em produção). Por isso `LytexWebhookEnvelope` é
 * deliberadamente tolerante, e o controlador aceita tanto a fatura crua
 * quanto um envelope em volta dela. Ver a nota lá.
 *
 * ## Duas convenções da Lytex que mudam o código inteiro
 *
 * 1. **Valor em centavos, inteiro.** `items[].value` e `totalValue` são
 *    centavos, não reais. Isso casa com `valorCentavos` da fatura e
 *    elimina a conversão por 100 que o Asaas exigia (e o arredondamento
 *    que vinha junto).
 * 2. **O identificador é `_id`.** Com sublinhado, em todo recurso. Os
 *    campos que apontam para outro recurso seguem o mesmo padrão
 *    (`_clientId`, `_recipientId`, `_subscriptionId`).
 */

/** `POST /v2/auth/obtain_token`. */
export interface LytexTokenResponse {
  accessToken: string;
  refreshToken: string;
  /** ISO 8601. O token vive cinco minutos, segundo a introdução da documentação. */
  expireAt: string;
  refreshExpireAt: string;
}

/**
 * O corpo de erro da Lytex.
 *
 * Três formatos convivem no documento: o comum
 * (`{statusCode, message, error}`), o de validação 422
 * (`{message, error: {details: [...]}}`) e o 500 sem `error`. O tipo
 * cobre os três com campos opcionais, e `descreverErroDaLytex` se
 * encarrega de virar uma frase.
 */
export interface LytexErrorEnvelope {
  statusCode?: number;
  message?: string;
  error?:
    | string
    | {
        _original?: unknown;
        details?: { message?: string; path?: (string | number)[] }[];
      };
}

/** `pf` para o Responsável (CPF), `pj` para a transportadora com CNPJ. */
export type LytexPersonType = "pf" | "pj";

/**
 * `companyType` da subconta. São os oito valores do documento, e a
 * tradução a partir do `CompanyType` da Rotta mora em
 * `lytex-subcontas.service.ts`.
 */
export type LytexCompanyType = "mei" | "others" | "ei" | "eireli" | "slu" | "ltda" | "ss" | "sa";

export interface LytexAddress {
  street: string;
  zone: string;
  city: string;
  /** Sigla de duas letras. */
  state: string;
  number?: string;
  complement?: string;
  /** Só números. */
  zip: string;
}

// ---------------------------------------------------------------------
// Cliente (quem paga: o Responsável)
// ---------------------------------------------------------------------

export interface CreateLytexClientInput {
  type: LytexPersonType;
  name: string;
  /** Só números. Obrigatório, como no Asaas: ver a nota de CPF em `FamilyBillingService`. */
  cpfCnpj: string;
  email?: string;
  /** Só números, com ou sem o nono dígito. */
  cellphone?: string;
  /** Neutro de propósito: a Rotta não sabe o pronome de quem paga. */
  treatmentPronoun?: "you" | "mr" | "lady";
  address?: LytexAddress;
  /** Campo livre devolvido em toda resposta: é por aqui que o cliente é reencontrado. */
  referenceId?: string;
}

export interface LytexClient {
  _id: string;
  name: string;
  cpfCnpj: string;
  email?: string;
  cellphone?: string;
  referenceId?: string;
}

/** `GET /v2/clients` e as demais listagens da Lytex. */
export interface LytexListEnvelope<T> {
  results: T[];
  total?: number;
}

// ---------------------------------------------------------------------
// Fatura
// ---------------------------------------------------------------------

/**
 * O split de uma fatura ou assinatura.
 *
 * `percentage` é o que a Rotta usa: a taxa é um percentual da
 * mensalidade, e com `fixedValue` cada reajuste de contrato exigiria
 * recalcular e reescrever a assinatura na Lytex.
 */
export interface LytexSplitInput {
  type: "fixedValue" | "percentage";
  recipients: {
    /** `_recipientId` de quem RECEBE a comissão. */
    _recipientId: string;
    /** Centavos em `fixedValue`, percentual em `percentage`. */
    value: number;
    description?: string;
    referenceId?: string;
  }[];
}

/**
 * Quais meios a fatura aceita. Os três são obrigatórios no documento,
 * mesmo quando desligados: é `enable: false` que desliga, não a
 * ausência da chave.
 */
export interface LytexPaymentMethodsInput {
  pix: { enable: boolean };
  boleto: { enable: boolean };
  creditCard: { enable: boolean; maxParcels?: number };
}

export interface CreateLytexInvoiceInput {
  /** Cliente já existente. Um dos dois caminhos; a Rotta sempre usa este. */
  _clientId: string;
  items: { name: string; quantity: number; value: number }[];
  /** ISO 8601. */
  dueDate: string;
  paymentMethods: LytexPaymentMethodsInput;
  description?: string;
  split?: LytexSplitInput;
  /** Onde vai o prefixo que diz ao webhook de que fluxo é a cobrança. */
  referenceId?: string;
}

/**
 * `status` de uma fatura. Os nove valores do documento.
 *
 * `waitingPayment` é o estado inicial; `paid` é o único que credita
 * alguém; `refund` e `chargeback` são os dois caminhos de volta.
 */
export type LytexInvoiceStatus =
  | "paid"
  | "recused"
  | "refund"
  | "canceled"
  | "chargeback"
  | "processing"
  | "waitingPayment"
  | "overdue"
  | "error";

export interface LytexInvoice {
  _id: string;
  _clientId?: string;
  _recipientId?: string;
  /** Presente quando a fatura foi gerada por uma assinatura. */
  _subscriptionId?: string;
  referenceId?: string;
  totalValue: number;
  dueDate: string;
  status?: LytexInvoiceStatus;
  /** A página de pagamento hospedada pela Lytex: o caminho que funciona sempre. */
  linkCheckout?: string;
  linkBoleto?: string;
  paymentMethods?: {
    pix?: {
      enable?: boolean;
      /** Pix copia e cola. A Lytex não devolve imagem de QR Code pronta. */
      qrcode?: string;
      txId?: string;
      dueDate?: string;
      validUntil?: string;
    };
    boleto?: {
      enable?: boolean;
      digitableLine?: string;
      barcode?: string;
      ourNumber?: string;
    };
    creditCard?: { enable?: boolean; maxParcels?: number };
  };
  /**
   * O que a Lytex informa sobre o pagamento em si. Os nomes dos campos
   * internos não constam do documento com tipo fechado, então são lidos
   * com cuidado em `lytex-webhook.controller.ts` e nunca assumidos.
   */
  paymentData?: {
    paymentMethod?: string;
    payedAt?: string;
    value?: number;
    liquidValue?: number;
    rate?: number;
  };
  rates?: Record<string, unknown>;
  split?: LytexSplitInput;
  createdAt?: string;
}

// ---------------------------------------------------------------------
// Assinatura
// ---------------------------------------------------------------------

export interface CreateLytexSubscriptionInput {
  _clientId: string;
  items: { name: string; quantity: number; value: number }[];
  /** `monthly` é o ciclo da mensalidade escolar. */
  type: "weekly" | "biweekly" | "monthly" | "bimonthly" | "quarterly" | "semiannual" | "annual";
  /** ISO 8601: o vencimento da primeira cobrança. */
  nextDueDate: string;
  /**
   * Por quanto tempo a recorrência cobra. `infinity` só quando o
   * contrato não tem fim combinado: assinatura sem limite num contrato
   * com fim seguiria cobrando a família depois do último mês.
   */
  duration: { unit: "months" | "years" | "infinity"; value?: number };
  paymentMethods: LytexPaymentMethodsInput;
  description?: string;
  split?: LytexSplitInput;
  referenceId?: string;
}

export interface LytexSubscription {
  _id: string;
  _clientId?: string;
  status?: string;
  nextDueDate?: string;
  referenceId?: string;
}

// ---------------------------------------------------------------------
// Subconta
// ---------------------------------------------------------------------

export interface CreateLytexSubAccountInput {
  type: LytexPersonType;
  /** Razão social: para a Lytex este é o titular, e o nome bate com o documento. */
  name: string;
  fantasyName?: string;
  /** Opcional no documento, mas sem ele o KYC não libera (suporte, 22/10/2026). */
  cpfCnpj?: string;
  cellphone: string;
  email: string;
  companyType?: LytexCompanyType;
  address: LytexAddress;
  aboutBusiness?: string;
  /** Webhook por subconta. A Rotta aponta todas para a mesma rota. */
  webhookUrl?: string;
  numberOfExpectedMonthlyEmissions?: number;
  /** Em centavos, como todo valor da Lytex. */
  expectedMonthlyBilling?: number;
}

/** Os quatro valores de `status` de subconta no documento. */
export type LytexSubAccountStatus = "active" | "blocked" | "disabled" | "pending_exclusion";

export interface LytexSubAccount {
  _id: string;
  /**
   * O id de estabelecimento, que é o que o split endereça. Em subconta
   * recém-criada a Lytex devolve os dois; quando só vier `_id`, é ele
   * que vale para o header `subRecipientId`.
   */
  _recipientId?: string;
  status?: LytexSubAccountStatus;
  corporateName?: string;
  fantasyName?: string;
  cpfCnpj?: string;
  /** `true` quando o split já está liberado para esta subconta. */
  splitAutorization?: boolean;
  /**
   * A retenção, por meio de pagamento, em dias. É esta a "custódia" da
   * Lytex: o suporte confirmou em 22/10/2026 que `floatConfig` é a
   * configuração de retenção, com boleto em D+2 e Pix em D+0.
   */
  floatConfig?: { boleto?: number; pix?: number; creditCard?: number };
  wallet?: { balance?: number; blockedBalance?: number };
  webhookUrl?: string;
}

// ---------------------------------------------------------------------
// Webhook
// ---------------------------------------------------------------------

/**
 * O corpo que a Lytex entrega no webhook.
 *
 * **A Lytex não publica o esquema deste corpo.** O documento OpenAPI
 * descreve o webhook em prosa ("retorne um status HTTP 200") e não traz
 * `x-webhooks`. Então este tipo é a única parte deste arquivo que não
 * sai de um esquema publicado, e por isso ele é tolerante de propósito:
 *
 * - aceita a fatura crua no corpo (`{_id, status, ...}`), que é o
 *   formato que a descrição sugere;
 * - aceita um envelope com a fatura dentro (`{event, data}` ou
 *   `{event, invoice}`), que é o formato da maioria das provedoras;
 * - não exige nenhum campo além de um identificador.
 *
 * Quem resolve qual dos formatos chegou é `extrairFaturaDoWebhook`, e o
 * que ele não entender vira aviso no log com o corpo recebido, nunca
 * exceção: webhook que responde erro é webhook que a provedora pausa.
 */
export interface LytexWebhookEnvelope {
  event?: string;
  type?: string;
  data?: LytexInvoice & { event?: string };
  invoice?: LytexInvoice;
  /** Quando a fatura vem crua no corpo. */
  _id?: string;
  status?: LytexInvoiceStatus;
  referenceId?: string;
  [chave: string]: unknown;
}

/**
 * Vira o corpo do webhook, em qualquer um dos formatos aceitos, numa
 * fatura. `null` quando não há identificador nenhum, que é o único caso
 * em que não há o que fazer.
 */
export function extrairFaturaDoWebhook(corpo: LytexWebhookEnvelope): LytexInvoice | null {
  const candidata = corpo.data ?? corpo.invoice ?? (corpo as unknown as LytexInvoice);
  return candidata && typeof candidata._id === "string" && candidata._id.length > 0
    ? candidata
    : null;
}

/** O nome do evento, quando o envelope traz um. Só serve para log e idempotência. */
export function nomeDoEventoDoWebhook(corpo: LytexWebhookEnvelope): string {
  return corpo.event ?? corpo.type ?? corpo.data?.event ?? "desconhecido";
}

/** Vira o corpo de erro da Lytex numa frase, nos três formatos que ela usa. */
export function descreverErroDaLytex(envelope: LytexErrorEnvelope, status: number): string {
  const detalhes =
    typeof envelope.error === "object" && envelope.error?.details?.length
      ? envelope.error.details
          .map((detalhe) => detalhe.message ?? detalhe.path?.join("."))
          .filter(Boolean)
          .join("; ")
      : undefined;

  const texto =
    detalhes ?? envelope.message ?? (typeof envelope.error === "string" ? envelope.error : "");
  /* `||`, e não `??`: string vazia é tão inútil quanto `undefined` aqui,
     e o `??` a deixaria passar como se fosse uma descrição. */
  return texto || `HTTP ${status}`;
}
