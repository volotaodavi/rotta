import { Inject, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";

import type {
  AsaasBalance,
  AsaasCustomer,
  AsaasErrorEnvelope,
  AsaasFinancialTransaction,
  AsaasListEnvelope,
  AsaasPayment,
  AsaasPixQrCode,
  AsaasSubscription,
  AsaasTransfer,
  CreateAsaasCustomerInput,
  CreateAsaasSubscriptionInput,
  CreateAsaasTransferInput,
} from "./types/asaas.types";

import asaasConfig from "@/config/asaas.config";
import { IntegrationHealthService } from "@/infra/observability/integration-health.service";

/** Nome usado como chave nos snapshots de `IntegrationHealthService` — mesma string em toda parte que registra ou lê a saúde desta integração. */
export const ASAAS_INTEGRATION_NAME = "asaas";

/**
 * Cliente HTTP de baixo nível para a API v3 da Asaas (Dossiê 26) — quem
 * processa cartão de crédito, débito e boleto da mensalidade da Rotta
 * (Pix é normalmente da AbacatePay, `abacatepay-client.service.ts`, mas
 * `getPixQrCode` também serve de fallback quando a AbacatePay não está
 * configurada/saudável — ver `AsaasBillingType`, campo `"PIX"`).
 *
 * Ao contrário de `AbacatePayClientService` (contrato já confirmado com
 * chamadas reais e autenticadas), este cliente NUNCA foi exercitado com
 * uma `ASAAS_API_KEY` válida (mesma ressalva de `RottaPayProviderService`/
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
        "ASAAS_API_KEY ausente — nenhuma chamada real foi tentada.",
      );
      throw new InternalServerErrorException(
        "Asaas não está configurada (ASAAS_API_KEY ausente) — cobrança de cartão/boleto indisponível.",
      );
    }
  }

  /**
   * Diferente da AbacatePay: sem envelope `{success, data}` — o corpo
   * de sucesso É o próprio recurso; o de erro é `{errors: [...]}`.
   * Autenticação por header custom `access_token` (não `Bearer`).
   */
  private async request<T>(
    path: string,
    init: { method: "GET" | "POST" | "DELETE"; body?: unknown },
  ): Promise<T> {
    this.assertConfigured();

    const startedAt = Date.now();
    const response = await fetch(`${this.config.baseUrl}${path}`, {
      method: init.method,
      headers: {
        access_token: this.config.apiKey as string,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });

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
        `Asaas ${init.method} ${path} falhou: HTTP ${response.status} — ${descricao}`,
      );
      void this.integrationHealth.recordFailure(
        ASAAS_INTEGRATION_NAME,
        `HTTP ${response.status} em ${init.method} ${path} — ${descricao}`,
      );
      throw new InternalServerErrorException(`Falha ao comunicar com a Asaas: ${descricao}`);
    }

    void this.integrationHealth.recordSuccess(ASAAS_INTEGRATION_NAME, Date.now() - startedAt);
    return payload as T;
  }

  createCustomer(input: CreateAsaasCustomerInput): Promise<AsaasCustomer> {
    return this.request<AsaasCustomer>("/customers", { method: "POST", body: input });
  }

  createSubscription(input: CreateAsaasSubscriptionInput): Promise<AsaasSubscription> {
    return this.request<AsaasSubscription>("/subscriptions", { method: "POST", body: input });
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
   * "PIX"` (fallback da AbacatePay, ver `AsaasBillingType`). Só existe
   * pra um pagamento PIX de verdade — chamar isto pra um pagamento
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

  /** Extrato de verdade da conta — toda entrada/saída, não só cobranças (pedido do usuário: "olhar o extrato"). */
  listFinancialTransactions(params: {
    offset: number;
    limit: number;
  }): Promise<AsaasListEnvelope<AsaasFinancialTransaction>> {
    return this.request<AsaasListEnvelope<AsaasFinancialTransaction>>(
      `/financialTransactions?offset=${params.offset}&limit=${params.limit}`,
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
