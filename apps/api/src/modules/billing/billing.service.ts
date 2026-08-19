import { BadRequestException, Inject, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { CompanyStatus } from "@prisma/client";

import { AbacatePayClientService } from "./abacatepay-client.service";
import {
  ABACATEPAY_FEE_CARD_FIXED_CENTS,
  ABACATEPAY_FEE_CARD_PERCENT,
  ABACATEPAY_FEE_PIX_CENTS,
  ABACATEPAY_PIX_EXPIRES_IN_SECONDS,
  ROTTA_SUBSCRIPTION_PRICE_CENTS,
  ROTTA_SUBSCRIPTION_PRODUCT_EXTERNAL_ID,
  ROTTA_SUBSCRIPTION_PRODUCT_NAME,
} from "./billing.constants";

import type { AbacatePayPixQrCode, AbacatePayWebhookEnvelope } from "./types/abacatepay.types";
import type { CompanyRepository } from "@/modules/companies/repositories/company.repository";
import type { OnModuleInit } from "@nestjs/common";

import { PrismaService } from "@/infra/database/prisma.service";
import { COMPANY_REPOSITORY } from "@/modules/companies/companies.constants";

export interface CreateCheckoutResult {
  url: string;
  checkoutId: string;
}

export interface BillingAdminCompanySummary {
  id: string;
  nomeFantasia: string;
  razaoSocial: string;
  planoNome: string;
  abacatepaySubscriptionId: string | null;
  ativaDesde: string;
}

export interface BillingAdminPlanSummary {
  codigo: string;
  nome: string;
  quantidadeEmpresas: number;
}

export interface BillingAdminOverview {
  /** `false` = `ABACATEPAY_API_KEY` ausente — os campos de valores/taxa abaixo ficam `null` (nunca 0 fingido). */
  abacatepayConfigured: boolean;
  quantidadeEmpresasAtivas: number;
  planos: BillingAdminPlanSummary[];
  empresasAtivas: BillingAdminCompanySummary[];
  totalRecebidoCentavos: number | null;
  totalTaxaRetidaCentavos: number | null;
  quantidadeCobrancasPagas: number | null;
}

/**
 * Núcleo de negócio da cobrança de mensalidade da Rotta via AbacatePay
 * (Dossiê 26). Nunca cobra o Responsável — este service só é acionado
 * a partir de `Company` (empresa/transportadora/autônomo), que é quem
 * tem `Plan`/mensalidade no schema; `Role.RESPONSAVEL` não tem
 * `Company`/`tenantId` (ver `AuthenticatedUser`), então não há caminho
 * de código aqui que o alcance.
 */
@Injectable()
export class BillingService implements OnModuleInit {
  private readonly logger = new Logger(BillingService.name);
  private productId: string | null = null;

  constructor(
    private readonly client: AbacatePayClientService,
    @Inject(COMPANY_REPOSITORY) private readonly companyRepository: CompanyRepository,
    private readonly prisma: PrismaService,
  ) {}

  async onModuleInit(): Promise<void> {
    if (!this.client.isConfigured()) {
      this.logger.warn(
        "AbacatePay não configurada (ABACATEPAY_API_KEY ausente) — cobrança de mensalidade indisponível até configurar.",
      );
      return;
    }
    try {
      await this.ensureProduct();
    } catch (error) {
      // Mesmo padrão de autoprovisionamento de `CompaniesService.onModuleInit`:
      // nunca derruba o boot da aplicação por causa disto — só loga e
      // tenta de novo, de forma preguiçosa, na próxima chamada real.
      this.logger.error(
        `Falha ao provisionar o produto de assinatura da Rotta na AbacatePay: ${(error as Error).message}`,
      );
    }
  }

  /**
   * Garante que o produto de assinatura da Rotta existe na conta
   * AbacatePay configurada — busca por `externalId` (nunca por nome,
   * já que a conta fornecida tem produtos de outro negócio) antes de
   * criar, para nunca duplicar em reinicializações sucessivas.
   */
  private async ensureProduct(): Promise<string> {
    if (this.productId) return this.productId;

    const products = await this.client.listProducts();
    const existing = products.find(
      (product) => product.externalId === ROTTA_SUBSCRIPTION_PRODUCT_EXTERNAL_ID,
    );
    if (existing) {
      this.productId = existing.id;
      return existing.id;
    }

    const created = await this.client.createProduct({
      externalId: ROTTA_SUBSCRIPTION_PRODUCT_EXTERNAL_ID,
      name: ROTTA_SUBSCRIPTION_PRODUCT_NAME,
      price: ROTTA_SUBSCRIPTION_PRICE_CENTS,
      currency: "BRL",
      cycle: "MONTHLY",
      description: "Assinatura mensal da plataforma Rotta — gestão de transporte escolar.",
    });
    this.productId = created.id;
    return created.id;
  }

  /**
   * Cria um checkout de assinatura para `companyId` — o pagamento real
   * só existe quando o cliente completa o pagamento na página
   * hospedada retornada em `url` (a AbacatePay não expõe uma forma de
   * cobrar cartão sem sair para a página dela, ver nota em
   * `TrialBanner`/`billing.controller.ts`). `externalId: companyId` é o
   * que permite ao webhook (`abacatepay-webhook.controller.ts`)
   * correlacionar de volta para esta empresa sem outra consulta.
   */
  async createCheckoutForCompany(
    companyId: string,
    returnUrl: string,
  ): Promise<CreateCheckoutResult> {
    if (!this.client.isConfigured()) {
      throw new BadRequestException(
        "Pagamento indisponível: a AbacatePay ainda não está configurada nesta implantação.",
      );
    }

    const company = await this.prisma.runWithTenantContext(
      { tenantId: companyId, bypass: false },
      () => this.companyRepository.findById(companyId),
    );
    if (!company) {
      throw new NotFoundException("Empresa não encontrada.");
    }

    const productId = await this.ensureProduct();
    const completionUrl = `${returnUrl}${returnUrl.includes("?") ? "&" : "?"}billing=success`;

    const checkout = await this.client.createSubscriptionCheckout({
      items: [{ id: productId, quantity: 1 }],
      externalId: company.id,
      returnUrl,
      completionUrl,
      methods: ["CARD"],
    });

    return { url: checkout.url, checkoutId: checkout.id };
  }

  /**
   * Checkout Pix embutido na própria Rotta (pedido do usuário: "para não
   * precisar ir em outro lugar") — devolve QR Code + copia-e-cola direto,
   * sem nenhum redirecionamento. `metadata.externalId: companyId` é o
   * mesmo mecanismo de correlação do checkout de assinatura, só que pro
   * evento `billing.paid` (ver `applyPixPayment`).
   *
   * Diferença importante de `createCheckoutForCompany`: isto é uma
   * cobrança AVULSA (não uma assinatura recorrente da AbacatePay) — o
   * pagamento confirmado ativa a empresa por este ciclo, mas não cria
   * renovação automática. Documentado explicitamente pro usuário: um
   * agendador mensal pra reemitir o Pix automaticamente é um próximo
   * passo, ainda não construído.
   */
  async createPixCheckoutForCompany(companyId: string): Promise<AbacatePayPixQrCode> {
    if (!this.client.isConfigured()) {
      throw new BadRequestException(
        "Pagamento indisponível: a AbacatePay ainda não está configurada nesta implantação.",
      );
    }

    const company = await this.prisma.runWithTenantContext(
      { tenantId: companyId, bypass: false },
      () => this.companyRepository.findById(companyId),
    );
    if (!company) {
      throw new NotFoundException("Empresa não encontrada.");
    }

    return this.client.createPixQrCode({
      amount: ROTTA_SUBSCRIPTION_PRICE_CENTS,
      expiresIn: ABACATEPAY_PIX_EXPIRES_IN_SECONDS,
      description: `${ROTTA_SUBSCRIPTION_PRODUCT_NAME} — ${company.nomeFantasia}`,
      metadata: { externalId: company.id },
    });
  }

  /** Consultado pelo front enquanto aguarda o webhook (`PixCheckoutModal`, apps/web) — nunca a única forma de confirmar (o webhook continua sendo a fonte de verdade). */
  getPixCheckoutStatus(id: string): Promise<AbacatePayPixQrCode> {
    return this.client.checkPixQrCodeStatus(id);
  }

  /**
   * Processa um evento de webhook já autenticado (secret + HMAC
   * verificados pelo controller). Idempotente por design: reaplicar o
   * mesmo evento duas vezes (reentrega da AbacatePay) só reescreve o
   * mesmo `status`/`abacatepaySubscriptionId`, nunca duplica nada —
   * dispensa uma tabela de deduplicação dedicada.
   */
  async handleWebhookEvent(event: AbacatePayWebhookEnvelope): Promise<void> {
    const companyId = event.data.checkout?.externalId ?? undefined;
    const subscriptionId = event.data.subscription?.id;

    switch (event.event) {
      case "subscription.completed":
      case "subscription.renewed":
        await this.applyStatus(event.event, companyId, CompanyStatus.ATIVO, subscriptionId);
        return;
      case "subscription.payment_failed":
        await this.applyStatus(event.event, companyId, CompanyStatus.INADIMPLENTE, subscriptionId);
        return;
      case "subscription.cancelled":
        await this.applyStatus(event.event, companyId, CompanyStatus.CANCELADO, subscriptionId);
        return;
      case "billing.paid":
        await this.applyPixPayment(event);
        return;
      default:
        this.logger.debug(`Evento AbacatePay não tratado (ignorado de propósito): ${event.event}`);
    }
  }

  /**
   * `billing.paid` — cobrança avulsa confirmada (Pix embutido,
   * `createPixCheckoutForCompany`). O `metadata.externalId` pode vir
   * dentro de `data.billing` ou `data.pixQrCode` (o formato exato deste
   * evento específico não foi confirmado com uma conta real, ver
   * `AbacatePayOneTimeBillingWebhookData`) — tenta os dois antes de
   * desistir, e loga o payload bruto quando nenhum bate, pra facilitar
   * ajustar isto assim que o primeiro evento real chegar em produção.
   */
  private async applyPixPayment(event: AbacatePayWebhookEnvelope): Promise<void> {
    const companyId =
      event.data.billing?.metadata?.externalId ?? event.data.pixQrCode?.metadata?.externalId;

    if (!companyId) {
      this.logger.warn(
        `Webhook AbacatePay "billing.paid" sem metadata.externalId reconhecível — payload: ${JSON.stringify(event.data)}`,
      );
      return;
    }

    await this.applyStatus("billing.paid", companyId, CompanyStatus.ATIVO, undefined);
  }

  private async applyStatus(
    eventName: string,
    companyId: string | undefined,
    status: CompanyStatus,
    subscriptionId: string | undefined,
  ): Promise<void> {
    if (!companyId) {
      this.logger.warn(
        `Webhook AbacatePay "${eventName}" sem checkout.externalId — não é possível correlacionar com nenhuma Company.`,
      );
      return;
    }

    try {
      // Fora do fluxo HTTP autenticado normal (webhook público, sem
      // JWT/TenantGuard) — mesmo padrão de bypass explícito e
      // já-validado do resgate de convite (`PrismaService.runInBypassTransaction`):
      // o `companyId` aqui não veio de um parâmetro de cliente não
      // verificado, veio ecoado pela própria AbacatePay do `externalId`
      // que NÓS demos a ela ao criar o checkout.
      await this.prisma.runWithTenantContext({ tenantId: null, bypass: true }, () =>
        this.companyRepository.update(companyId, {
          status,
          ...(subscriptionId ? { abacatepaySubscriptionId: subscriptionId } : {}),
        }),
      );
      this.logger.log(
        `Empresa ${companyId} -> status ${status} (webhook AbacatePay "${eventName}").`,
      );
    } catch (error) {
      this.logger.warn(
        `Não foi possível atualizar a empresa ${companyId} a partir do webhook AbacatePay "${eventName}": ${(error as Error).message}`,
      );
    }
  }

  /**
   * Painel financeiro do Admin Rotta (pedido do usuário: "valores
   * recebidos, taxas retidas, quantidade de empresas/planos, quais
   * empresas estão usando"). Duas fontes deliberadamente separadas:
   *
   * - Empresas/planos: sempre do banco local (`Company.status ATIVO`,
   *   confiável, nunca depende da AbacatePay estar no ar).
   * - Valores recebidos/taxa: da AbacatePay (`billing/list`) — se a
   *   chamada falhar ou a integração não estiver configurada, os
   *   campos ficam `null` (nunca 0 fingido, mesmo padrão "stub honesto"
   *   do resto do módulo) e `abacatepayConfigured`/o log dizem o
   *   motivo.
   */
  async getAdminOverview(): Promise<BillingAdminOverview> {
    const { items: empresasAtivas } = await this.companyRepository.list({
      status: CompanyStatus.ATIVO,
      page: 1,
      pageSize: 1000,
      sortBy: "nomeFantasia",
      sortOrder: "asc",
    });

    const planosPorCodigo = new Map<string, BillingAdminPlanSummary>();
    for (const company of empresasAtivas) {
      const atual = planosPorCodigo.get(company.plan.code);
      if (atual) {
        atual.quantidadeEmpresas += 1;
      } else {
        planosPorCodigo.set(company.plan.code, {
          codigo: company.plan.code,
          nome: company.plan.name,
          quantidadeEmpresas: 1,
        });
      }
    }

    const overview: BillingAdminOverview = {
      abacatepayConfigured: this.client.isConfigured(),
      quantidadeEmpresasAtivas: empresasAtivas.length,
      planos: [...planosPorCodigo.values()],
      empresasAtivas: empresasAtivas.map((company) => ({
        id: company.id,
        nomeFantasia: company.nomeFantasia,
        razaoSocial: company.razaoSocial,
        planoNome: company.plan.name,
        abacatepaySubscriptionId: company.abacatepaySubscriptionId,
        ativaDesde: company.updatedAt.toISOString(),
      })),
      totalRecebidoCentavos: null,
      totalTaxaRetidaCentavos: null,
      quantidadeCobrancasPagas: null,
    };

    if (!overview.abacatepayConfigured) return overview;

    try {
      const billings = await this.client.listBillings();
      const pagas = billings.filter((billing) => billing.status === "PAID");

      overview.quantidadeCobrancasPagas = pagas.length;
      overview.totalRecebidoCentavos = pagas.reduce((soma, billing) => soma + billing.amount, 0);
      overview.totalTaxaRetidaCentavos = pagas.reduce((soma, billing) => {
        const metodo = billing.methods?.[0] ?? "CARD";
        const taxa =
          metodo === "PIX"
            ? ABACATEPAY_FEE_PIX_CENTS
            : Math.round(billing.amount * ABACATEPAY_FEE_CARD_PERCENT) +
              ABACATEPAY_FEE_CARD_FIXED_CENTS;
        return soma + taxa;
      }, 0);
    } catch (error) {
      this.logger.warn(
        `Não foi possível buscar o histórico de cobranças da AbacatePay pro painel financeiro: ${(error as Error).message}`,
      );
    }

    return overview;
  }
}
