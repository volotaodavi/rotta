import { Inject, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";

import type {
  AbacatePayBilling,
  AbacatePayEnvelope,
  AbacatePayPixQrCode,
  AbacatePayProduct,
  AbacatePaySubscriptionCheckout,
  CreateProductInput,
  CreatePixQrCodeInput,
  CreateSubscriptionCheckoutInput,
} from "./types/abacatepay.types";

import abacatepayConfig from "@/config/abacatepay.config";
import { IntegrationHealthService } from "@/infra/observability/integration-health.service";

/** Nome usado como chave nos snapshots de `IntegrationHealthService` — mesma string em toda parte que registra ou lê a saúde desta integração. */
export const ABACATEPAY_INTEGRATION_NAME = "abacatepay";

/**
 * Cliente HTTP de baixo nível para a API v2 da AbacatePay (Dossiê 26).
 * Ao contrário de `RottaPayProviderService` (Lytex, contrato ainda não
 * verificado), o contrato aqui JÁ foi confirmado com a documentação
 * oficial e testado com chamadas reais — então este serviço faz
 * chamadas de verdade, não finge um resultado.
 *
 * `isConfigured()` segue o mesmo padrão "stub honesto" das demais
 * integrações opcionais (Didit, Lytex): sem `ABACATEPAY_API_KEY`, todo
 * método público lança um erro claro em vez de silenciosamente falhar
 * ou fingir sucesso.
 */
@Injectable()
export class AbacatePayClientService {
  private readonly logger = new Logger(AbacatePayClientService.name);

  constructor(
    @Inject(abacatepayConfig.KEY)
    private readonly config: ConfigType<typeof abacatepayConfig>,
    private readonly integrationHealth: IntegrationHealthService,
  ) {}

  isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      void this.integrationHealth.recordNotConfigured(
        ABACATEPAY_INTEGRATION_NAME,
        "ABACATEPAY_API_KEY ausente — nenhuma chamada real foi tentada.",
      );
      throw new InternalServerErrorException(
        "AbacatePay não está configurada (ABACATEPAY_API_KEY ausente) — cobrança indisponível.",
      );
    }
  }

  /**
   * `pixQrCode/create`, `pixQrCode/check` e `billing/list` só existem
   * documentados sob `/v1` (`docs.abacatepay.com/api-reference/criar-qrcode-pix`,
   * `.../listar-cobrancas`), diferente de `products`/`subscriptions`
   * (`/v2`, contrato já confirmado com chamada real). Deriva o host
   * `/v1` a partir do mesmo `ABACATEPAY_BASE_URL` configurado — nunca
   * uma segunda variável de ambiente pra manter.
   */
  private get baseUrlV1(): string {
    return this.config.baseUrl.replace(/\/v2\/?$/, "/v1");
  }

  private async request<T>(
    path: string,
    init: { method: "GET" | "POST"; body?: unknown; baseUrl?: string },
  ): Promise<T> {
    this.assertConfigured();

    const startedAt = Date.now();
    const response = await fetch(`${init.baseUrl ?? this.config.baseUrl}${path}`, {
      method: init.method,
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: init.body ? JSON.stringify(init.body) : undefined,
    });

    let envelope: AbacatePayEnvelope<T>;
    try {
      envelope = (await response.json()) as AbacatePayEnvelope<T>;
    } catch {
      void this.integrationHealth.recordFailure(
        ABACATEPAY_INTEGRATION_NAME,
        `Resposta inválida (HTTP ${response.status}) em ${path}.`,
      );
      throw new InternalServerErrorException(
        `AbacatePay retornou uma resposta inválida (HTTP ${response.status}) em ${path}.`,
      );
    }

    if (!response.ok || !envelope.success) {
      this.logger.warn(
        `AbacatePay ${init.method} ${path} falhou: HTTP ${response.status} — ${envelope.error ?? "erro desconhecido"}`,
      );
      void this.integrationHealth.recordFailure(
        ABACATEPAY_INTEGRATION_NAME,
        `HTTP ${response.status} em ${init.method} ${path} — ${envelope.error ?? "erro desconhecido"}`,
      );
      throw new InternalServerErrorException(
        `Falha ao comunicar com a AbacatePay: ${envelope.error ?? `HTTP ${response.status}`}`,
      );
    }

    void this.integrationHealth.recordSuccess(ABACATEPAY_INTEGRATION_NAME, Date.now() - startedAt);
    return envelope.data as T;
  }

  listProducts(): Promise<AbacatePayProduct[]> {
    return this.request<AbacatePayProduct[]>("/products/list", { method: "GET" });
  }

  createProduct(input: CreateProductInput): Promise<AbacatePayProduct> {
    return this.request<AbacatePayProduct>("/products/create", { method: "POST", body: input });
  }

  createSubscriptionCheckout(
    input: CreateSubscriptionCheckoutInput,
  ): Promise<AbacatePaySubscriptionCheckout> {
    return this.request<AbacatePaySubscriptionCheckout>("/subscriptions/create", {
      method: "POST",
      body: input,
    });
  }

  /**
   * Cobrança Pix embutida na própria Rotta (pedido do usuário: "para
   * não precisar ir em outro lugar") — devolve QR Code + copia-e-cola
   * direto, sem nenhuma página hospedada envolvida.
   */
  createPixQrCode(input: CreatePixQrCodeInput): Promise<AbacatePayPixQrCode> {
    return this.request<AbacatePayPixQrCode>("/pixQrCode/create", {
      method: "POST",
      body: input,
      baseUrl: this.baseUrlV1,
    });
  }

  /** Polling de status enquanto o cliente ainda não pagou/o webhook ainda não chegou (ver `PixCheckoutModal`, apps/web). */
  checkPixQrCodeStatus(id: string): Promise<AbacatePayPixQrCode> {
    return this.request<AbacatePayPixQrCode>(`/pixQrCode/check?id=${encodeURIComponent(id)}`, {
      method: "GET",
      baseUrl: this.baseUrlV1,
    });
  }

  /** Histórico de cobranças da conta — só o painel financeiro do Admin Rotta usa isto. */
  listBillings(): Promise<AbacatePayBilling[]> {
    return this.request<AbacatePayBilling[]>("/billing/list", {
      method: "GET",
      baseUrl: this.baseUrlV1,
    });
  }
}
