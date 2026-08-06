import { Inject, Injectable, InternalServerErrorException, Logger } from "@nestjs/common";
import { ConfigType } from "@nestjs/config";

import type {
  AbacatePayEnvelope,
  AbacatePayProduct,
  AbacatePaySubscriptionCheckout,
  CreateProductInput,
  CreateSubscriptionCheckoutInput,
} from "./types/abacatepay.types";

import abacatepayConfig from "@/config/abacatepay.config";

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
  ) {}

  isConfigured(): boolean {
    return Boolean(this.config.apiKey);
  }

  private assertConfigured(): void {
    if (!this.isConfigured()) {
      throw new InternalServerErrorException(
        "AbacatePay não está configurada (ABACATEPAY_API_KEY ausente) — cobrança indisponível.",
      );
    }
  }

  private async request<T>(
    path: string,
    init: { method: "GET" | "POST"; body?: unknown },
  ): Promise<T> {
    this.assertConfigured();

    const response = await fetch(`${this.config.baseUrl}${path}`, {
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
      throw new InternalServerErrorException(
        `AbacatePay retornou uma resposta inválida (HTTP ${response.status}) em ${path}.`,
      );
    }

    if (!response.ok || !envelope.success) {
      this.logger.warn(
        `AbacatePay ${init.method} ${path} falhou: HTTP ${response.status} — ${envelope.error ?? "erro desconhecido"}`,
      );
      throw new InternalServerErrorException(
        `Falha ao comunicar com a AbacatePay: ${envelope.error ?? `HTTP ${response.status}`}`,
      );
    }

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
}
