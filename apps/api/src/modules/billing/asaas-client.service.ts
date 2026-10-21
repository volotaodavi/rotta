import { Inject, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";

import type {
  AsaasBalance,
  AsaasDocumentoPendente,
  AsaasSituacaoDaConta,
  AsaasSubaccount,
  ConfigurarCustodiaAsaasInput,
  CreateAsaasSubaccountInput,
  AsaasCustomer,
  AsaasErrorEnvelope,
  AsaasFinancialTransaction,
  AsaasListEnvelope,
  AsaasPayment,
  AsaasPixQrCode,
  AsaasSubscription,
  AsaasTransfer,
  CreateAsaasCustomerInput,
  CreateAsaasPaymentInput,
  CreateAsaasSubscriptionInput,
  CreateAsaasTransferInput,
  UpdateAsaasSubscriptionInput,
} from "./types/asaas.types";

import asaasConfig from "@/config/asaas.config";
import { IntegrationHealthService } from "@/infra/observability/integration-health.service";

/** Nome usado como chave nos snapshots de `IntegrationHealthService` — mesma string em toda parte que registra ou lê a saúde desta integração. */
export const ASAAS_INTEGRATION_NAME = "asaas";

/**
 * Teto de tempo de uma chamada à Asaas.
 *
 * Trinta segundos é folgado para uma API de pagamento saudável e curto
 * o bastante para a requisição do usuário não ficar pendurada. Não
 * existe retentativa automática em cima deste teto, e isso é decisão,
 * não esquecimento: ver a nota dentro de `request()`.
 */
const TIMEOUT_ASAAS_MS = 30_000;

/**
 * Cliente HTTP de baixo nível para a API v3 da Asaas (Dossiê 26) — quem
 * processa Pix, cartão de crédito, débito e boleto da mensalidade da
 * Rotta, 100% Asaas desde 05/09/2026 (pedido do usuário: "esquece a
 * AbacatePay" — ver `AsaasBillingType`, campo `"PIX"`).
 *
 * Este cliente NUNCA foi exercitado com uma `ASAAS_API_KEY` válida
 * (mesma ressalva de `RottaPayProviderService`/
 * Lytex) — o formato de payload de sucesso (`createSubscription`,
 * `getPayment` etc.) segue a documentação pública, não uma resposta real.
 * O mecanismo de autenticação e o envelope de erro, porém, já foram
 * confirmados batendo direto em `api.asaas.com`/`api-sandbox.asaas.com`
 * sem chave (nov/2026): header `access_token` (não `Bearer`) é o correto —
 * `Authorization: Bearer` retorna `invalid_jwt`, um `access_token`
 * inválido retorna exatamente `{"errors":[{"code":"invalid_access_token",
 * "description":"..."}]}`, igual ao que este `request()` espera.
 *
 * `isConfigured()` segue o mesmo padrão "stub honesto" das demais
 * integrações opcionais: sem `ASAAS_API_KEY`, todo método público lança
 * um erro claro em vez de silenciosamente falhar ou fingir sucesso.
 */
@Injectable()
export class AsaasClientService {
  private readonly logger = new Logger(AsaasClientService.name);

  constructor(
    @Inject(asaasConfig.KEY)
    private readonly config: ConfigType<typeof asaasConfig>,
    private readonly integrationHealth: IntegrationHealthService,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      void this.integrationHealth.recordNotConfigured(
        ASAAS_INTEGRATION_NAME,
        "ASAAS_API_KEY ausente: nenhuma chamada real foi tentada.",
      );
      throw new InternalServerErrorException(
        "Asaas não está configurada (ASAAS_API_KEY ausente): cobrança de cartão/boleto indisponível.",
      );
    }
  }

  /**
   * Sem envelope `{success, data}` — o corpo de sucesso É o próprio
   * recurso; o de erro é `{errors: [...]}`. Autenticação por header
   * custom `access_token` (não `Bearer`).
   */
  private async request<T>(
    path: string,
    init: {
      method: "GET" | "POST" | "PUT" | "DELETE";
      body?: unknown;
      /**
       * Chave de API a usar no lugar da chave da conta principal.
       *
       * Existe por causa da inversão da arquitetura de custódia: a
       * documentação de conta escrow diz que "apenas as subcontas com o
       * recurso habilitado terão seus recebimentos submetidos ao fluxo
       * de retenção". Ou seja, para haver retenção, quem recebe tem que
       * ser a subconta — e a cobrança precisa ser criada com a chave
       * DELA, não com a da conta pai.
       *
       * Nunca é logada, nem aqui nem em `IntegrationHealthService`.
       */
      accessToken?: string;
    },
  ): Promise<T> {
    if (!init.accessToken) this.assertConfigured();

    const startedAt = Date.now();

    /*
      Teto de tempo, acrescentado em 14/10/2026. Até aqui esta chamada
      não tinha nenhum: um `fetch` pendurado na Asaas prendia a
      requisição HTTP do usuário para sempre, e no plano gratuito do
      Render, com poucos processos, requisições presas derrubam a
      capacidade do serviço inteiro.

      `AbortController` com `setTimeout`, e não `AbortSignal.timeout()`,
      pelo mesmo motivo documentado em `packages/api-client/src/http.ts`:
      o segundo não existe em todo runtime, o primeiro existe em toda
      parte.

      IMPORTANTE, e é a razão de NÃO haver retentativa aqui: a
      documentação de boas práticas da Asaas diz, com todas as letras,
      para não reenviar a mesma operação depois de um timeout, e sim
      conferir pelos eventos se ela já foi criada. Tempo esgotado não
      significa que a Asaas não processou: significa que não sabemos.
      Reenviar seria arriscar uma cobrança duplicada na mão de uma
      família. Quem reconcilia é o webhook.
    */
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TIMEOUT_ASAAS_MS);

    let response: Response;
    try {
      response = await fetch(`${this.config.baseUrl}${path}`, {
        method: init.method,
        headers: {
          access_token: (init.accessToken ?? this.config.apiKey) as string,
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: init.body ? JSON.stringify(init.body) : undefined,
        signal: controller.signal,
      });
    } catch (erro) {
      const esgotou = controller.signal.aborted;
      const motivo = esgotou
        ? `Tempo esgotado (${TIMEOUT_ASAAS_MS / 1000}s) em ${init.method} ${path}.`
        : `Falha de rede em ${init.method} ${path}: ${(erro as Error).message}`;
      void this.integrationHealth.recordFailure(ASAAS_INTEGRATION_NAME, motivo);
      throw new InternalServerErrorException(`Falha ao comunicar com a Asaas: ${motivo}`);
    } finally {
      clearTimeout(timer);
    }

    let payload: T | AsaasErrorEnvelope;
    try {
      payload = (await response.json()) as T | AsaasErrorEnvelope;
    } catch {
      void this.integrationHealth.recordFailure(
        ASAAS_INTEGRATION_NAME,
        `Resposta inválida (HTTP ${response.status}) em ${path}.`,
      );
      throw new InternalServerErrorException(
        `Asaas retornou uma resposta inválida (HTTP ${response.status}) em ${path}.`,
      );
    }

    if (!response.ok) {
      const errorEnvelope = payload as AsaasErrorEnvelope;
      const descricao =
        errorEnvelope.errors?.map((error) => error.description).join("; ") ??
        `HTTP ${response.status}`;
      this.logger.warn(
        `Asaas ${init.method} ${path} falhou: HTTP ${response.status}: ${descricao}`,
      );
      void this.integrationHealth.recordFailure(
        ASAAS_INTEGRATION_NAME,
        `HTTP ${response.status} em ${init.method} ${path}: ${descricao}`,
      );
      throw new InternalServerErrorException(`Falha ao comunicar com a Asaas: ${descricao}`);
    }

    void this.integrationHealth.recordSuccess(ASAAS_INTEGRATION_NAME, Date.now() - startedAt);
    return payload as T;
  }

  createCustomer(input: CreateAsaasCustomerInput): Promise<AsaasCustomer> {
    return this.request<AsaasCustomer>("/customers", { method: "POST", body: input });
  }

  /**
   * `accessToken` chega quando a recorrencia tem que ser criada EM NOME
   * da subconta, pelo mesmo motivo de `createPayment`: a custodia segue
   * a conta que RECEBE, e a conta pai nao tem custodia.
   *
   * Sem ele, a assinatura e da conta principal, com split para a
   * subconta e sem nenhuma retencao.
   */
  createSubscription(
    input: CreateAsaasSubscriptionInput,
    accessToken?: string,
  ): Promise<AsaasSubscription> {
    return this.request<AsaasSubscription>("/subscriptions", {
      method: "POST",
      body: input,
      accessToken,
    });
  }

  /**
   * `PUT /v3/subscriptions/{id}`.
   *
   * Cuidado com `split`: omitir mantem, `null` ou `[]` desliga (ver
   * `UpdateAsaasSubscriptionInput`). Quem monta o corpo tem que decidir
   * entre os tres casos de proposito, nunca por acidente de um campo
   * `undefined` que virou `null` no caminho.
   *
   * O `accessToken` e obrigatorio quando a assinatura foi criada pela
   * subconta: uma assinatura so e visivel para a conta que a emitiu.
   */
  updateSubscription(
    subscriptionId: string,
    input: UpdateAsaasSubscriptionInput,
    accessToken?: string,
  ): Promise<AsaasSubscription> {
    return this.request<AsaasSubscription>(`/subscriptions/${encodeURIComponent(subscriptionId)}`, {
      method: "PUT",
      body: input,
      accessToken,
    });
  }

  /**
   * As cobrancas que a recorrencia JA gerou —
   * `GET /v3/subscriptions/{id}/payments`.
   *
   * A documentacao avisa que cobranca futura ainda nao criada nao
   * aparece aqui, e que consulta tambem consome cota (25.000
   * requisicoes a cada 12 horas por conta). Por isso isto e para
   * conciliacao pontual, nunca para acompanhar estado: quem acompanha e
   * o webhook.
   */
  async listarCobrancasDaAssinatura(
    subscriptionId: string,
    accessToken?: string,
  ): Promise<AsaasPayment[]> {
    const { data } = await this.request<AsaasListEnvelope<AsaasPayment>>(
      `/subscriptions/${encodeURIComponent(subscriptionId)}/payments`,
      { method: "GET", accessToken },
    );
    return data;
  }

  /**
   * Cobrança avulsa — `POST /payments` — diferente de
   * `createSubscription` (sempre recorrente). Usado pra gerar um QR
   * Pix (ou boleto/cartão) de um valor qualquer, não vinculado a
   * nenhuma mensalidade (pedido do usuário 03/09/2026: "posso pedir o
   * recebimento de transferências... incluindo o QR Code pix?").
   */
  /**
   * `accessToken` chega quando a cobranca tem que ser criada EM NOME da
   * subconta, que e o unico jeito de a custodia valer (ver `request`).
   * Sem ele, a cobranca e da conta principal, com split para a subconta
   * e sem nenhuma retencao.
   */
  createPayment(input: CreateAsaasPaymentInput, accessToken?: string): Promise<AsaasPayment> {
    return this.request<AsaasPayment>("/payments", { method: "POST", body: input, accessToken });
  }

  /**
   * Cria a subconta do transportador — `POST /v3/accounts`.
   *
   * O retorno traz `walletId` e a chave de API, e a chave **so aparece
   * aqui**: recuperar depois exige `POST /v3/accounts/{id}/accessTokens`,
   * que fica bloqueado por padrao, precisa ser liberado na interface web
   * e vale 2 horas. Quem chama tem a obrigacao de persistir cifrada na
   * mesma operacao. Ver `AsaasSubaccount` para os DOIS lugares em que a
   * chave pode vir.
   *
   * Isto e o que faz o transportador nunca precisar abrir o Asaas: a
   * conta dele nasce de um formulario dentro da Rotta.
   */
  createSubaccount(input: CreateAsaasSubaccountInput): Promise<AsaasSubaccount> {
    return this.request<AsaasSubaccount>("/accounts", { method: "POST", body: input });
  }

  /**
   * O que falta para a subconta ser aprovada —
   * `GET /v3/myAccount/documents`, COM A CHAVE DELA.
   *
   * `myAccount` significa "a conta de quem assina a requisicao": e por
   * isso que a chave da subconta e obrigatoria aqui, e nao a da conta
   * principal. E daqui que sai o `onboardingUrl`, que NAO vem na
   * resposta da criacao.
   *
   * A documentacao pede pelo menos 15 segundos depois da criacao antes
   * de consultar.
   */
  async listarDocumentosPendentes(accessToken: string): Promise<AsaasDocumentoPendente[]> {
    const { data } = await this.request<AsaasListEnvelope<AsaasDocumentoPendente>>(
      "/myAccount/documents",
      { method: "GET", accessToken },
    );
    return data;
  }

  /**
   * A situacao cadastral da subconta — `GET /v3/myAccount/status`, COM A
   * CHAVE DELA.
   *
   * E a alternativa ao webhook de situacao da conta: enquanto os eventos
   * nao estiverem marcados no painel do Asaas, e esta consulta que diz
   * se a conta foi aprovada. A conta esta aprovada quando `general` e
   * `APPROVED`.
   */
  consultarSituacaoDaConta(accessToken: string): Promise<AsaasSituacaoDaConta> {
    return this.request<AsaasSituacaoDaConta>("/myAccount/status", {
      method: "GET",
      accessToken,
    });
  }

  /**
   * Liga ou desliga a custodia de UMA subconta —
   * `POST /v3/accounts/{id}/escrow`, com a chave da conta principal.
   *
   * Nunca o endpoint que configura todas de uma vez: ver
   * `ConfigurarCustodiaAsaasInput`.
   */
  configurarCustodiaDaSubconta(
    accountId: string,
    input: ConfigurarCustodiaAsaasInput,
  ): Promise<unknown> {
    return this.request<unknown>(`/accounts/${encodeURIComponent(accountId)}/escrow`, {
      method: "POST",
      body: input,
    });
  }

  /**
   * `GET /customers?cpfCnpj=X` — evita criar um `AsaasCustomer`
   * duplicado toda vez que o admin gera uma cobrança avulsa pra um
   * mesmo CPF/CNPJ (diferente de `createCustomer`, que sempre cria um
   * novo). `null` quando não existe nenhum ainda.
   */
  async findCustomerByCpfCnpj(cpfCnpj: string): Promise<AsaasCustomer | null> {
    const { data } = await this.request<AsaasListEnvelope<AsaasCustomer>>(
      `/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}`,
      { method: "GET" },
    );
    return data[0] ?? null;
  }

  cancelSubscription(id: string): Promise<AsaasSubscription> {
    return this.request<AsaasSubscription>(`/subscriptions/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }

  /** Consultado pelo front enquanto aguarda o boleto ser pago/o webhook chegar (mesmo papel do polling Pix). */
  getPayment(id: string): Promise<AsaasPayment> {
    return this.request<AsaasPayment>(`/payments/${encodeURIComponent(id)}`, { method: "GET" });
  }

  /**
   * `POST /payments/{id}/refund` — reembolso de um pagamento, usado só
   * pelo job de `PendingSubscription` expirada (Dossiê 26, "Expira em
   * 48h e reembolsa", decisão do usuário). Diferente de
   * `createSubscription`/`getPayment` (contrato nunca testado com uma
   * chave real), este endpoint É bem documentado publicamente
   * (`docs.asaas.com/reference/estornar-cobranca`), mesmo sem ter sido
   * exercitado aqui.
   */
  refundPayment(id: string): Promise<AsaasPayment> {
    return this.request<AsaasPayment>(`/payments/${encodeURIComponent(id)}/refund`, {
      method: "POST",
    });
  }

  /** Primeiro pagamento gerado por uma assinatura recém-criada — usado pra devolver linha digitável/link do boleto na resposta do checkout sem esperar o webhook. */
  listPaymentsBySubscription(subscriptionId: string): Promise<{ data: AsaasPayment[] }> {
    return this.request<{ data: AsaasPayment[] }>(
      `/payments?subscription=${encodeURIComponent(subscriptionId)}`,
      { method: "GET" },
    );
  }

  /**
   * QR Code + copia-e-cola de um pagamento criado com `billingType:
   * "PIX"` (ver `AsaasBillingType`). Só existe pra um pagamento PIX de
   * verdade — chamar isto pra um pagamento
   * cartão/boleto retorna erro da própria Asaas, nunca chamado assim
   * neste código (`BillingService` só chama depois de criar a
   * assinatura com `billingType: "PIX"`).
   */
  getPixQrCode(paymentId: string): Promise<AsaasPixQrCode> {
    return this.request<AsaasPixQrCode>(`/payments/${encodeURIComponent(paymentId)}/pixQrCode`, {
      method: "GET",
    });
  }

  /**
   * Uma página de pagamentos da CONTA INTEIRA (não de uma assinatura
   * só, diferente de `listPaymentsBySubscription`) — usado pela
   * reconciliação financeira do painel Admin (pedido do usuário
   * 02/09/2026: "veja a parte de faturamento e recebimentos, provedor
   * Asaas" — até esta entrega, `getAdminOverview` só refletia
   * `configured` pra Asaas, nunca somava valor nenhum). `BillingService`
   * pagina chamando isto em loop até `hasMore` virar `false`. Limite
   * máximo de 100 por página, o mesmo da própria API da Asaas.
   */
  listPayments(params: {
    offset: number;
    limit: number;
  }): Promise<AsaasListEnvelope<AsaasPayment>> {
    return this.request<AsaasListEnvelope<AsaasPayment>>(
      `/payments?offset=${params.offset}&limit=${params.limit}`,
      { method: "GET" },
    );
  }

  /** Saldo atual da conta Asaas da Rotta (pedido do usuário 03/09/2026 — "área financeira... saldo atual"). */
  getBalance(): Promise<AsaasBalance> {
    return this.request<AsaasBalance>("/finance/balance", { method: "GET" });
  }

  /**
   * Extrato de verdade da conta — toda entrada/saída, não só cobranças
   * (pedido do usuário: "olhar o extrato"). `startDate` (formato
   * AAAA-MM-DD, filtro real da própria Asaas —
   * `docs.asaas.com/reference/listar-extrato`) — pedido do usuário
   * 03/09/2026: "o histórico também só deverá mostrar a partir de
   * hoje", opcional pra continuar dando pra consultar sem filtro se
   * algum consumidor futuro precisar.
   */
  listFinancialTransactions(params: {
    offset: number;
    limit: number;
    startDate?: string;
  }): Promise<AsaasListEnvelope<AsaasFinancialTransaction>> {
    const query = new URLSearchParams({
      offset: String(params.offset),
      limit: String(params.limit),
    });
    if (params.startDate) query.set("startDate", params.startDate);
    return this.request<AsaasListEnvelope<AsaasFinancialTransaction>>(
      `/financialTransactions?${query.toString()}`,
      { method: "GET" },
    );
  }

  /**
   * Envia dinheiro pra fora da conta Asaas da Rotta (pedido do usuário:
   * "fazer transferências") — Pix por chave. Quem chama isto SEMPRE
   * audita (ver `BillingController.createAdminTransfer`, `AdminArea`
   * sem `@AdminAreas` = GERAL-only por padrão do guard).
   */
  createTransfer(input: CreateAsaasTransferInput): Promise<AsaasTransfer> {
    return this.request<AsaasTransfer>("/transfers", { method: "POST", body: input });
  }
}
