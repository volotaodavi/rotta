import { Inject, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";

import type {
  AsaasCustomer,
  AsaasErrorEnvelope,
  AsaasPayment,
  AsaasSubscription,
  CreateAsaasCustomerInput,
  CreateAsaasSubscriptionInput,
} from "./types/asaas.types";

import asaasConfig from "@/config/asaas.config";
import { IntegrationHealthService } from "@/infra/observability/integration-health.service";

/** Nome usado como chave nos snapshots de `IntegrationHealthService` — mesma string em toda parte que registra ou lê a saúde desta integração. */
export const ASAAS_INTEGRATION_NAME = "asaas";

/**
 * Cliente HTTP de baixo nível para a API v3 da Asaas (Dossiê 26) — quem
 * processa cartão de crédito, débito e boleto da mensalidade da Rotta
 * (Pix continua na AbacatePay, `abacatepay-client.service.ts`).
 *
 * Ao contrário de `AbacatePayClientService` (contrato já confirmado com
 * chamadas reais), este contrato ainda NÃO foi testado contra uma conta
 * real (mesma ressalva de `RottaPayProviderService`/Lytex) — não há
 * `ASAAS_API_KEY` neste ambiente de desenvolvimento.
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

  /** Primeiro pagamento gerado por uma assinatura recém-criada — usado pra devolver linha digitável/link do boleto na resposta do checkout sem esperar o webhook. */
  listPaymentsBySubscription(subscriptionId: string): Promise<{ data: AsaasPayment[] }> {
    return this.request<{ data: AsaasPayment[] }>(
      `/payments?subscription=${encodeURIComponent(subscriptionId)}`,
      { method: "GET" },
    );
  }
}
