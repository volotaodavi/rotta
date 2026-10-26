import { Inject, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";

import { descreverErroDaLytex } from "./types/lytex.types";

import type {
  CreateLytexClientInput,
  CreateLytexInvoiceInput,
  CreateLytexSubAccountInput,
  CreateLytexSubscriptionInput,
  LytexClient,
  LytexErrorEnvelope,
  LytexInvoice,
  LytexListEnvelope,
  LytexSubAccount,
  LytexSubscription,
  LytexTokenResponse,
} from "./types/lytex.types";

import lytexConfig from "@/config/lytex.config";
import { IntegrationHealthService } from "@/infra/observability/integration-health.service";

/** Nome usado como chave nos snapshots de `IntegrationHealthService`. */
export const LYTEX_INTEGRATION_NAME = "lytex";

/**
 * Teto de tempo de uma chamada à Lytex.
 *
 * Mesmo valor do cliente da Asaas, e pelo mesmo motivo: folgado para uma
 * API de pagamento saudável, curto o bastante para não pendurar a
 * requisição do usuário. Também não há retentativa automática aqui, e é
 * decisão: ver a nota dentro de `request()`.
 */
const TIMEOUT_LYTEX_MS = 30_000;

/**
 * Margem de segurança antes de o token expirar.
 *
 * O token da Lytex vale cinco minutos. Renovar trinta segundos antes
 * evita a corrida em que a chamada sai com um token que expira no
 * caminho e volta `410 Token expirado` com a cobrança já criada do outro
 * lado.
 */
const MARGEM_DE_RENOVACAO_MS = 30_000;

/**
 * Cliente HTTP de baixo nível da API v2 da Lytex.
 *
 * ## O que muda em relação ao cliente da Asaas
 *
 * 1. **Autenticação é OAuth2 client credentials**, não header fixo. O
 *    par `clientId`/`clientSecret` vira um `accessToken` de cinco
 *    minutos em `POST /v2/auth/obtain_token`, e o token vai em
 *    `Authorization: Bearer`. Este serviço guarda o token em memória e
 *    renova sozinho; nenhum chamador precisa saber que ele existe.
 * 2. **A cobrança em nome da subconta não precisa da chave dela.** É o
 *    header `subRecipientId` nas rotas `/v2/sub-accounts/*`, com a
 *    credencial da própria plataforma. Esse é o motivo técnico de a
 *    Rotta ter trocado de provedora: no desenho do Asaas, custódia
 *    exigia guardar a chave de API de terceiro aqui dentro.
 * 3. **Valores em centavos, inteiros.** Nada de dividir por 100.
 *
 * ## O que este cliente nunca fez
 *
 * Uma chamada real com credencial válida de produção. O contrato vem do
 * OpenAPI publicado pela Lytex (lido em 23/10/2026), não de uma resposta
 * observada. `isConfigured()` existe para que a ausência de credencial
 * seja um erro claro, e não uma cobrança fingida.
 */
@Injectable()
export class LytexClientService {
  private readonly logger = new Logger(LytexClientService.name);

  /** Token em memória, renovado sozinho. Nunca é logado nem devolvido. */
  private token: { valor: string; expiraEm: number } | null = null;

  constructor(
    @Inject(lytexConfig.KEY)
    private readonly config: ConfigType<typeof lytexConfig>,
    private readonly integrationHealth: IntegrationHealthService,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.config.clientId && this.config.clientSecret);
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      void this.integrationHealth.recordNotConfigured(
        LYTEX_INTEGRATION_NAME,
        "LYTEX_CLIENT_ID/LYTEX_CLIENT_SECRET ausentes: nenhuma chamada real foi tentada.",
      );
      throw new InternalServerErrorException(
        "Lytex não está configurada (LYTEX_CLIENT_ID/LYTEX_CLIENT_SECRET ausentes): a cobrança da mensalidade está indisponível.",
      );
    }
  }

  // ---------------------------------------------------------------------
  // Autenticação
  // ---------------------------------------------------------------------

  /**
   * O token de acesso, do cache ou renovado.
   *
   * Sem trava de concorrência de propósito: duas requisições simultâneas
   * podem pedir dois tokens, e isso não quebra nada na Lytex (o token
   * anterior continua válido até expirar). Uma trava aqui seria
   * complexidade para economizar uma chamada barata.
   */
  private async obterToken(): Promise<string> {
    this.assertConfigured();

    if (this.token && this.token.expiraEm - MARGEM_DE_RENOVACAO_MS > Date.now()) {
      return this.token.valor;
    }

    const resposta = await this.chamar<LytexTokenResponse>("/v2/auth/obtain_token", {
      method: "POST",
      /* `grantType` não consta do esquema do corpo, mas consta do
         exemplo da própria introdução da documentação. Mandar a mais é
         inofensivo; faltar, se o esquema estiver incompleto, não é. */
      body: {
        grantType: "clientCredentials",
        clientId: this.config.clientId,
        clientSecret: this.config.clientSecret,
      },
      semToken: true,
    });

    if (!resposta.accessToken) {
      void this.integrationHealth.recordFailure(
        LYTEX_INTEGRATION_NAME,
        "obtain_token respondeu sem accessToken.",
      );
      throw new InternalServerErrorException(
        "A Lytex respondeu à autenticação sem token de acesso. Nenhuma cobrança foi criada.",
      );
    }

    const expiraEm = Date.parse(resposta.expireAt);
    this.token = {
      valor: resposta.accessToken,
      /* Se `expireAt` vier ilegível, vale o mínimo documentado (cinco
         minutos) em vez de um token tratado como eterno. */
      expiraEm: Number.isNaN(expiraEm) ? Date.now() + 5 * 60_000 : expiraEm,
    };

    return this.token.valor;
  }

  /** Esquece o token guardado. Usado quando a Lytex responde 401 ou 410. */
  private esquecerToken(): void {
    this.token = null;
  }

  // ---------------------------------------------------------------------
  // HTTP
  // ---------------------------------------------------------------------

  /**
   * Uma chamada à Lytex, com token e uma única retentativa de
   * autenticação.
   *
   * A retentativa é só para `401`/`410` (token inválido ou expirado), e
   * só uma vez: o token em cache pode ter morrido entre a checagem e a
   * chamada, e repetir a requisição nesse caso é seguro porque a
   * primeira nem chegou a ser processada. Qualquer outro erro NÃO é
   * repetido, pelo mesmo motivo do cliente da Asaas: tempo esgotado não
   * significa que a provedora não processou, significa que não sabemos,
   * e repetir arrisca uma segunda cobrança na mão de uma família.
   */
  private async request<T>(
    path: string,
    init: { method: "GET" | "POST" | "PUT" | "DELETE"; body?: unknown; subRecipientId?: string },
  ): Promise<T> {
    const token = await this.obterToken();

    try {
      return await this.chamar<T>(path, { ...init, token });
    } catch (erro) {
      if (!(erro instanceof ErroDeAutenticacaoDaLytex)) throw erro;

      this.logger.warn(
        `Token da Lytex recusado em ${init.method} ${path}. Renovando e tentando uma vez.`,
      );
      this.esquecerToken();
      return this.chamar<T>(path, { ...init, token: await this.obterToken() });
    }
  }

  private async chamar<T>(
    path: string,
    init: {
      method: "GET" | "POST" | "PUT" | "DELETE";
      body?: unknown;
      token?: string;
      subRecipientId?: string;
      semToken?: boolean;
    },
  ): Promise<T> {
    const startedAt = Date.now();

    /* `AbortController` com `setTimeout`, e não `AbortSignal.timeout()`,
       pelo mesmo motivo de `packages/api-client/src/http.ts`: o segundo
       não existe em todo runtime, o primeiro existe em toda parte. */
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_LYTEX_MS);

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
    };
    if (init.token) headers.Authorization = `Bearer ${init.token}`;
    /* O header que faz a cobrança nascer em nome da subconta. Ele é o
       substituto da chave de API de terceiro que o desenho do Asaas
       exigia, e é por ele que a transportadora é a emissora. */
    if (init.subRecipientId) headers.subRecipientId = init.subRecipientId;

    let response: Response;
    try {
      response = await fetch(`${this.config.baseUrl}${path}`, {
        method: init.method,
        headers,
        body: init.body ? JSON.stringify(init.body) : undefined,
        signal: controller.signal,
      });
    } catch (erro) {
      const esgotou = controller.signal.aborted;
      const motivo = esgotou
        ? `Tempo esgotado (${TIMEOUT_LYTEX_MS / 1000}s) em ${init.method} ${path}.`
        : `Falha de rede em ${init.method} ${path}: ${(erro as Error).message}`;
      void this.integrationHealth.recordFailure(LYTEX_INTEGRATION_NAME, motivo);
      throw new InternalServerErrorException(`Falha ao comunicar com a Lytex: ${motivo}`);
    } finally {
      clearTimeout(timer);
    }

    /* `204` e corpo vazio existem (cancelamentos). `json()` num corpo
       vazio levanta, e levantar aqui faria uma operação bem-sucedida
       parecer falha. */
    const texto = await response.text();
    let payload: T | LytexErrorEnvelope;
    try {
      payload = (texto ? JSON.parse(texto) : {}) as T | LytexErrorEnvelope;
    } catch {
      void this.integrationHealth.recordFailure(
        LYTEX_INTEGRATION_NAME,
        `Resposta inválida (HTTP ${response.status}) em ${path}.`,
      );
      throw new InternalServerErrorException(
        `A Lytex retornou uma resposta inválida (HTTP ${response.status}) em ${path}.`,
      );
    }

    if (!response.ok) {
      const descricao = descreverErroDaLytex(payload as LytexErrorEnvelope, response.status);
      this.logger.warn(
        `Lytex ${init.method} ${path} falhou: HTTP ${response.status}: ${descricao}`,
      );
      void this.integrationHealth.recordFailure(
        LYTEX_INTEGRATION_NAME,
        `HTTP ${response.status} em ${init.method} ${path}: ${descricao}`,
      );

      if ((response.status === 401 || response.status === 410) && !init.semToken) {
        throw new ErroDeAutenticacaoDaLytex(descricao);
      }
      throw new InternalServerErrorException(`A Lytex recusou a operação: ${descricao}`);
    }

    void this.integrationHealth.recordSuccess(LYTEX_INTEGRATION_NAME, Date.now() - startedAt);
    return payload as T;
  }

  // ---------------------------------------------------------------------
  // Cliente (quem paga)
  // ---------------------------------------------------------------------

  /**
   * Procura o cliente pelo `referenceId`, que é o id do Responsável na
   * Rotta.
   *
   * Pelo `referenceId` e não pelo CPF de propósito: é a nossa chave, ela
   * não muda, e não depende de a Lytex normalizar documento do mesmo
   * jeito que nós. Um CPF digitado com pontos de um lado e sem do outro
   * acharia dois clientes diferentes para a mesma pessoa, e a família
   * receberia duas cobranças.
   */
  async findClientByReferenceId(referenceId: string): Promise<LytexClient | null> {
    const lista = await this.request<LytexListEnvelope<LytexClient>>(
      `/v2/clients?referenceId=${encodeURIComponent(referenceId)}&perPage=1`,
      { method: "GET" },
    );
    return lista.results?.[0] ?? null;
  }

  async createClient(input: CreateLytexClientInput): Promise<LytexClient> {
    return this.request<LytexClient>("/v2/clients", { method: "POST", body: input });
  }

  // ---------------------------------------------------------------------
  // Fatura
  // ---------------------------------------------------------------------

  /**
   * Cria a cobrança.
   *
   * Com `subRecipientId`, a fatura nasce **em nome da subconta**: o
   * dinheiro cai na conta da transportadora e o split manda a taxa da
   * Rotta para o nosso `_recipientId`. Sem ele, a fatura é da conta da
   * Rotta, não há split, e o valor vira crédito no Rotta Pay. Essas são
   * as duas únicas possibilidades, e cada fatura registra qual delas
   * aconteceu.
   */
  async createInvoice(
    input: CreateLytexInvoiceInput,
    subRecipientId?: string,
  ): Promise<LytexInvoice> {
    const path = subRecipientId ? "/v2/sub-accounts/invoices" : "/v2/invoices";
    return this.request<LytexInvoice>(path, { method: "POST", body: input, subRecipientId });
  }

  /**
   * Lê a fatura de novo.
   *
   * Existe porque dois dados nascem assíncronos do lado da Lytex: a
   * linha digitável do boleto (registro bancário) e, às vezes, o Pix
   * copia e cola. A verdade dos dois está no provedor, nunca no que
   * gravamos na criação.
   */
  async getInvoice(invoiceId: string, subRecipientId?: string): Promise<LytexInvoice> {
    const path = subRecipientId
      ? `/v2/sub-accounts/invoices/${invoiceId}`
      : `/v2/invoices/${invoiceId}`;
    return this.request<LytexInvoice>(path, { method: "GET", subRecipientId });
  }

  // ---------------------------------------------------------------------
  // Assinatura
  // ---------------------------------------------------------------------

  /**
   * Cria a recorrência que cobra a família todo mês.
   *
   * ## Por que a assinatura não aceita `subRecipientId`
   *
   * Porque a Lytex não publica essa rota sob `/v2/sub-accounts`: o
   * header existe para faturas, saques e consultas de subconta, não para
   * assinaturas. A consequência é concreta e está registrada aqui para
   * ninguém descobrir sozinho depois: **a recorrência é emitida pela
   * conta da Rotta**, com split mandando a parte do transportador para a
   * subconta dele. É o inverso da fatura avulsa emitida pela subconta.
   *
   * Isso significa que a retenção (`floatConfig`) que vale para a
   * assinatura é a da conta da Rotta, não a da subconta. Quando a Lytex
   * liberar a emissão de assinatura por subconta, é este método que
   * muda, e `montarSplit` já sabe tratar os dois sentidos.
   */
  async createSubscription(input: CreateLytexSubscriptionInput): Promise<LytexSubscription> {
    return this.request<LytexSubscription>("/v2/subscriptions", { method: "POST", body: input });
  }

  /** Encerra a recorrência. O que já foi cobrado continua existindo. */
  async cancelSubscription(subscriptionId: string): Promise<void> {
    await this.request<unknown>(`/v2/subscriptions/cancel/${subscriptionId}`, { method: "PUT" });
  }

  // ---------------------------------------------------------------------
  // Subconta
  // ---------------------------------------------------------------------

  async createSubAccount(input: CreateLytexSubAccountInput): Promise<LytexSubAccount> {
    return this.request<LytexSubAccount>("/v2/sub-accounts", { method: "POST", body: input });
  }

  async getSubAccount(subAccountId: string): Promise<LytexSubAccount> {
    return this.request<LytexSubAccount>(`/v2/sub-accounts/${subAccountId}`, { method: "GET" });
  }
}

/**
 * Token recusado pela Lytex (401 ou 410).
 *
 * Classe própria, e não uma string no erro, porque é o único caso em que
 * `request()` pode repetir a chamada com segurança, e confundir isso com
 * outro erro significaria repetir uma cobrança.
 */
class ErroDeAutenticacaoDaLytex extends Error {}
