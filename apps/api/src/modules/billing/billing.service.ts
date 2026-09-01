import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { EventEmitter2 } from "@nestjs/event-emitter";
import {
  CompanyStatus,
  NotificationEventType,
  PendingSubscriptionProvider,
  PendingSubscriptionStatus,
} from "@prisma/client";

import { AbacatePayClientService } from "./abacatepay-client.service";
import { AsaasClientService } from "./asaas-client.service";
import {
  ABACATEPAY_FEE_CARD_FIXED_CENTS,
  ABACATEPAY_FEE_CARD_PERCENT,
  ABACATEPAY_FEE_PIX_CENTS,
  ABACATEPAY_PIX_EXPIRES_IN_SECONDS,
  PENDING_SUBSCRIPTION_ID_PREFIX,
  PIX_OVERDUE_GRACE_DAYS,
  PIX_RECURRENCE_MONTHS,
  PIX_REISSUE_REPEAT_DAYS,
  PIX_REISSUE_WINDOW_DAYS,
  PRE_SIGNUP_EXPIRES_HOURS,
  ROTTA_SUBSCRIPTION_PRICE_CENTS,
  ROTTA_SUBSCRIPTION_PRODUCT_NAME,
} from "./billing.constants";

import type { CreateAsaasCheckoutDto } from "./dto/create-asaas-checkout.dto";
import type {
  CreatePreSignupAsaasDto,
  CreatePreSignupPixDto,
} from "./dto/create-pre-signup-checkout.dto";
import type { AbacatePayPixQrCode, AbacatePayWebhookEnvelope } from "./types/abacatepay.types";
import type { AsaasPayment, AsaasWebhookEnvelope } from "./types/asaas.types";
import type {
  CompanyRepository,
  UpdateCompanyData,
} from "@/modules/companies/repositories/company.repository";

import { PrismaService } from "@/infra/database/prisma.service";
import { AdminInboxEmailService } from "@/infra/email/admin-inbox-email.service";
import { COMPANY_REPOSITORY } from "@/modules/companies/companies.constants";
import { COMMUNICATION_REQUESTED_EVENT } from "@/modules/notifications/events/communication-requested.event";
import { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import { UsersService } from "@/modules/users/users.service";

export interface BillingAdminCompanySummary {
  id: string;
  nomeFantasia: string;
  razaoSocial: string;
  planoNome: string;
  abacatepaySubscriptionId: string | null;
  asaasSubscriptionId: string | null;
  ativaDesde: string;
}

export interface BillingAdminPlanSummary {
  codigo: string;
  nome: string;
  quantidadeEmpresas: number;
}

/**
 * Bloco de valores de UM provedor (AbacatePay ou Asaas) — mesmo formato
 * pros dois, pra o painel financeiro do Admin (pedido do usuário:
 * "taxas da Asaas, quanto as taxas da Abacatepay, o lucro líquido de
 * cada operação") desenhar os dois lado a lado sem duplicar lógica.
 */
export interface BillingProviderOverview {
  /** `false` = chave da API ausente — os campos abaixo ficam `null` (nunca 0 fingido). */
  configured: boolean;
  totalRecebidoCentavos: number | null;
  totalTaxaRetidaCentavos: number | null;
  quantidadeCobrancasPagas: number | null;
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
  /** AbacatePay (Pix) e Asaas (cartão/débito/boleto) lado a lado — mesmos números dos 3 campos "total*" acima, só que já separados por provedor. */
  abacatepay: BillingProviderOverview;
  asaas: BillingProviderOverview;
  /** Recebido (Pix + cartão/débito/boleto) menos taxa retida dos dois provedores — `null` se NENHUM dos dois estiver configurado. */
  lucroLiquidoCentavos: number | null;
}

/**
 * Núcleo de negócio da cobrança de mensalidade da Rotta (Dossiê 26) —
 * Pix via AbacatePay, cartão/débito/boleto via Asaas. Nunca cobra o
 * Responsável — este service só é acionado a partir de `Company`
 * (empresa/transportadora/autônomo), que é quem tem `Plan`/mensalidade
 * no schema; `Role.RESPONSAVEL` não tem `Company`/`tenantId` (ver
 * `AuthenticatedUser`), então não há caminho de código aqui que o
 * alcance.
 */
@Injectable()
export class BillingService {
  private readonly logger = new Logger(BillingService.name);

  constructor(
    private readonly client: AbacatePayClientService,
    private readonly asaasClient: AsaasClientService,
    @Inject(COMPANY_REPOSITORY) private readonly companyRepository: CompanyRepository,
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
    private readonly messagePersonalizationService: MessagePersonalizationService,
    private readonly eventEmitter: EventEmitter2,
    private readonly adminInboxEmailService: AdminInboxEmailService,
  ) {}

  /**
   * Informativo pro Admin Rotta (pedido do usuário 01/09/2026: "planos
   * assinados... nova assinatura de plano"). Chamado só depois de
   * confirmar que a empresa estava NÃO-ATIVA antes desta atualização —
   * uma renovação (empresa que já estava ATIVA continuando ATIVA) nunca
   * deve gerar este aviso. Best-effort, nunca impede a atualização de
   * status em si (que já aconteceu antes desta chamada).
   */
  private notifyAdminRottaNovaAssinaturaBestEffort(companyId: string): void {
    this.companyRepository
      .findById(companyId)
      .then((company) => {
        if (!company) return;
        const mensagem = this.messagePersonalizationService.planoNovaAssinatura(
          company.nomeFantasia,
        );

        // Caixa fixa da Rotta (pedido do usuário 01/09/2026) — garante a
        // entrega mesmo sem nenhuma conta Admin Rotta real configurada.
        void this.adminInboxEmailService.send(mensagem.titulo, mensagem.corpo);

        return this.usersService.listAdminRottaUserIds().then((adminIds) => {
          for (const adminUserId of adminIds) {
            this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
              userId: adminUserId,
              companyId,
              tipo: NotificationEventType.PLANO_NOVA_ASSINATURA,
              titulo: mensagem.titulo,
              corpo: mensagem.corpo,
            });
          }
        });
      })
      .catch((error: unknown) => {
        this.logger.warn(
          `Não foi possível notificar Admin Rotta sobre a nova assinatura da empresa ${companyId}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
  }

  /**
   * Checkout Pix embutido na própria Rotta (pedido do usuário: "para não
   * precisar ir em outro lugar") — devolve QR Code + copia-e-cola direto,
   * sem nenhum redirecionamento. `metadata.externalId: companyId` é o
   * mesmo mecanismo de correlação do checkout de assinatura, só que pro
   * evento `billing.paid` (ver `applyPixPayment`).
   *
   * Diferença importante do checkout de cartão/débito/boleto (Asaas,
   * `createAsaasCheckoutForCompany`): isto é uma cobrança AVULSA (não
   * uma assinatura recorrente da AbacatePay) — o pagamento confirmado
   * ativa a empresa por este ciclo e agenda `pixProximoVencimento`
   * (`applyPixPayment`), que o job diário (`processarVencimentosPix`)
   * usa pra reemitir um novo Pix automaticamente perto do vencimento —
   * a "renovação automática" do Pix é simulada por esse agendador, já
   * que a AbacatePay em si não tem assinatura recorrente de Pix.
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
   * Checkout próprio da Rotta pra cartão de crédito/débito/boleto
   * (Dossiê 26 — "página própria para receber os pagamentos, porém
   * utilizando a Asaas por trás"). Cria (ou reaproveita, se já existir
   * `asaasCustomerId`) o cliente na Asaas, cria a assinatura mensal e
   * devolve o primeiro pagamento gerado (o front usa `invoiceUrl`/
   * `bankSlipUrl`/`identificationField` pra boleto, ou só o `id` pra
   * poll de status pra cartão — mesmo papel de `getPixCheckoutStatus`).
   *
   * Cartão/débito exigem `cartao`+`titular` no `dto` (validado em
   * `CreateAsaasCheckoutDto`); boleto não precisa de nenhum dos dois —
   * a Asaas gera o boleto só com `customer`+`value`+`nextDueDate`.
   */
  async createAsaasCheckoutForCompany(
    companyId: string,
    dto: CreateAsaasCheckoutDto,
  ): Promise<AsaasPayment> {
    if (!this.asaasClient.isConfigured()) {
      throw new BadRequestException(
        "Pagamento indisponível: a Asaas ainda não está configurada nesta implantação.",
      );
    }

    const company = await this.prisma.runWithTenantContext(
      { tenantId: companyId, bypass: false },
      () => this.companyRepository.findById(companyId),
    );
    if (!company) {
      throw new NotFoundException("Empresa não encontrada.");
    }

    let asaasCustomerId = company.asaasCustomerId;
    if (!asaasCustomerId) {
      const customer = await this.asaasClient.createCustomer({
        name: company.nomeFantasia,
        cpfCnpj: company.cpfCnpj,
        email: company.email,
        externalReference: company.id,
      });
      asaasCustomerId = customer.id;
    }

    const hoje = new Date().toISOString().slice(0, 10);
    const subscription = await this.asaasClient.createSubscription({
      customer: asaasCustomerId,
      billingType: dto.billingType,
      // Asaas trabalha em reais (não centavos) — única conversão deste tipo no módulo, os demais valores internos ficam sempre em centavos.
      value: ROTTA_SUBSCRIPTION_PRICE_CENTS / 100,
      cycle: "MONTHLY",
      nextDueDate: hoje,
      description: `${ROTTA_SUBSCRIPTION_PRODUCT_NAME} — ${company.nomeFantasia}`,
      externalReference: company.id,
      ...(dto.billingType !== "BOLETO" && dto.cartao && dto.titular
        ? {
            creditCard: dto.cartao,
            creditCardHolderInfo: {
              name: dto.titular.name,
              email: dto.titular.email,
              cpfCnpj: dto.titular.cpfCnpj,
              postalCode: dto.titular.postalCode,
              addressNumber: dto.titular.addressNumber,
              phone: dto.titular.phone,
            },
          }
        : {}),
    });

    await this.prisma.runWithTenantContext({ tenantId: companyId, bypass: false }, () =>
      this.companyRepository.update(companyId, {
        asaasCustomerId,
        asaasSubscriptionId: subscription.id,
      }),
    );

    // A Asaas gera o primeiro pagamento de forma síncrona ao criar a
    // assinatura, mas não o devolve dentro da resposta de
    // `/subscriptions` — precisa desta segunda chamada pra pegar
    // `bankSlipUrl`/`identificationField` (boleto) ou o `id` pra poll
    // (cartão, enquanto o webhook de confirmação não chega).
    const { data: pagamentos } = await this.asaasClient.listPaymentsBySubscription(subscription.id);
    const primeiroPagamento = pagamentos[0];
    if (!primeiroPagamento) {
      throw new InternalServerErrorException(
        "Assinatura criada na Asaas, mas nenhum pagamento foi encontrado — tente consultar novamente em instantes.",
      );
    }
    return primeiroPagamento;
  }

  /** Consultado pelo front enquanto aguarda o webhook de confirmação (mesmo papel de `getPixCheckoutStatus`). */
  getAsaasCheckoutStatus(paymentId: string): Promise<AsaasPayment> {
    return this.asaasClient.getPayment(paymentId);
  }

  /**
   * Checkout Pix ANTES de existir conta/empresa (Dossiê 26, pedido do
   * usuário 31/08/2026 — "segunda forma de assinar", ao lado do fluxo
   * autenticado `createPixCheckoutForCompany`). Sem `companyId`: a
   * correlação com o webhook usa `pending:<PendingSubscription.id>` no
   * lugar do `company.id` de sempre (`PENDING_SUBSCRIPTION_ID_PREFIX`)
   * — é esse prefixo que `applyPixPayment` usa pra saber que deve
   * marcar a `PendingSubscription` como `PAGO` em vez de tentar achar
   * uma `Company`.
   */
  async createPreSignupPixCheckout(
    dto: CreatePreSignupPixDto,
  ): Promise<{ pendingId: string; expiresAt: string; checkout: AbacatePayPixQrCode }> {
    if (!this.client.isConfigured()) {
      throw new BadRequestException(
        "Pagamento indisponível: a AbacatePay ainda não está configurada nesta implantação.",
      );
    }

    const expiresAt = new Date(Date.now() + PRE_SIGNUP_EXPIRES_HOURS * 60 * 60 * 1000);
    const pending = await this.prisma.pendingSubscription.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        cpfCnpj: dto.cpfCnpj,
        telefone: dto.telefone,
        valorCentavos: ROTTA_SUBSCRIPTION_PRICE_CENTS,
        provider: PendingSubscriptionProvider.ABACATEPAY,
        providerCheckoutId: "",
        expiresAt,
      },
    });

    let checkout: AbacatePayPixQrCode;
    try {
      checkout = await this.client.createPixQrCode({
        amount: ROTTA_SUBSCRIPTION_PRICE_CENTS,
        expiresIn: ABACATEPAY_PIX_EXPIRES_IN_SECONDS,
        description: `${ROTTA_SUBSCRIPTION_PRODUCT_NAME} — ${dto.nome}`,
        metadata: { externalId: `${PENDING_SUBSCRIPTION_ID_PREFIX}${pending.id}` },
      });
    } catch (error) {
      // Não deixa a `PendingSubscription` órfã (sem `providerCheckoutId`
      // nenhum, presa em PENDENTE pra sempre) se a AbacatePay falhar —
      // mesmo raciocínio da transação atômica de `CompaniesService.create`.
      await this.prisma.pendingSubscription.delete({ where: { id: pending.id } });
      throw error;
    }

    await this.prisma.pendingSubscription.update({
      where: { id: pending.id },
      data: { providerCheckoutId: checkout.id },
    });

    return { pendingId: pending.id, expiresAt: expiresAt.toISOString(), checkout };
  }

  /**
   * Checkout cartão/débito/boleto ANTES de existir conta (mesmo
   * raciocínio de `createPreSignupPixCheckout`, provedor Asaas). Cria
   * o `customer` na Asaas já com `externalReference:
   * pending:<PendingSubscription.id>` — mesma chave de correlação de
   * `createAsaasCheckoutForCompany`, só que apontando pra um pagamento
   * ainda sem `Company` dona.
   */
  async createPreSignupAsaasCheckout(
    dto: CreatePreSignupAsaasDto,
  ): Promise<{ pendingId: string; expiresAt: string; payment: AsaasPayment }> {
    if (!this.asaasClient.isConfigured()) {
      throw new BadRequestException(
        "Pagamento indisponível: a Asaas ainda não está configurada nesta implantação.",
      );
    }

    const expiresAt = new Date(Date.now() + PRE_SIGNUP_EXPIRES_HOURS * 60 * 60 * 1000);
    const pending = await this.prisma.pendingSubscription.create({
      data: {
        nome: dto.nome,
        email: dto.email,
        cpfCnpj: dto.cpfCnpj,
        telefone: dto.telefone,
        valorCentavos: ROTTA_SUBSCRIPTION_PRICE_CENTS,
        provider: PendingSubscriptionProvider.ASAAS,
        providerCheckoutId: "",
        expiresAt,
      },
    });

    try {
      const externalReference = `${PENDING_SUBSCRIPTION_ID_PREFIX}${pending.id}`;
      const customer = await this.asaasClient.createCustomer({
        name: dto.nome,
        cpfCnpj: dto.cpfCnpj,
        email: dto.email,
        externalReference,
      });

      const hoje = new Date().toISOString().slice(0, 10);
      const subscription = await this.asaasClient.createSubscription({
        customer: customer.id,
        billingType: dto.billingType,
        value: ROTTA_SUBSCRIPTION_PRICE_CENTS / 100,
        cycle: "MONTHLY",
        nextDueDate: hoje,
        description: `${ROTTA_SUBSCRIPTION_PRODUCT_NAME} — ${dto.nome}`,
        externalReference,
        ...(dto.billingType !== "BOLETO" && dto.cartao && dto.titular
          ? {
              creditCard: dto.cartao,
              creditCardHolderInfo: {
                name: dto.titular.name,
                email: dto.titular.email,
                cpfCnpj: dto.titular.cpfCnpj,
                postalCode: dto.titular.postalCode,
                addressNumber: dto.titular.addressNumber,
                phone: dto.titular.phone,
              },
            }
          : {}),
      });

      const { data: pagamentos } = await this.asaasClient.listPaymentsBySubscription(
        subscription.id,
      );
      const primeiroPagamento = pagamentos[0];
      if (!primeiroPagamento) {
        throw new InternalServerErrorException(
          "Assinatura criada na Asaas, mas nenhum pagamento foi encontrado — tente consultar novamente em instantes.",
        );
      }

      await this.prisma.pendingSubscription.update({
        where: { id: pending.id },
        data: {
          providerCheckoutId: primeiroPagamento.id,
          providerCustomerId: customer.id,
          providerSubscriptionId: subscription.id,
        },
      });

      return {
        pendingId: pending.id,
        expiresAt: expiresAt.toISOString(),
        payment: primeiroPagamento,
      };
    } catch (error) {
      // Mesmo raciocínio de `createPreSignupPixCheckout`: nunca deixa
      // um registro órfão preso em PENDENTE se a Asaas falhar no meio
      // do caminho.
      await this.prisma.pendingSubscription.delete({ where: { id: pending.id } });
      throw error;
    }
  }

  /**
   * Consultado pelo front (mesmo papel de `getPixCheckoutStatus`/
   * `getAsaasCheckoutStatus`) — mas aqui olha o STATUS PRÓPRIO da
   * `PendingSubscription`, não o provedor direto, porque o "confirmado"
   * que importa pro front é "o webhook já marcou `PAGO`", não só "o
   * provedor recebeu o dinheiro" (o webhook é sempre a fonte de
   * verdade, mesmo padrão do resto do módulo).
   */
  async getPreSignupStatus(pendingId: string): Promise<{
    status: PendingSubscriptionStatus;
    paidAt: Date | null;
    expiresAt: Date;
    linkedCompanyId: string | null;
  }> {
    const pending = await this.prisma.pendingSubscription.findUnique({
      where: { id: pendingId },
    });
    if (!pending) {
      throw new NotFoundException("Pagamento não encontrado.");
    }
    return {
      status: pending.status,
      paidAt: pending.paidAt,
      expiresAt: pending.expiresAt,
      linkedCompanyId: pending.linkedCompanyId,
    };
  }

  /**
   * Job diário (`internal/queue/billing/expire-pending-subscriptions`,
   * mesmo mecanismo de `processarVencimentosPix`) que fecha o outro
   * lado do fluxo "pagar antes de ter conta" (decisão do usuário:
   * "Expira em 48h e reembolsa"): pagamentos `PAGO` que passaram do
   * `expiresAt` sem ninguém completar o cadastro são reembolsados e
   * marcados `REEMBOLSADO` — se o reembolso falhar (provedor fora do
   * ar, chave ausente), marca `EXPIRADO` mesmo assim, pra nunca ficar
   * preso em `PAGO` esperando um cadastro que não vai vir (o log
   * registra a falha pra reconciliação manual).
   */
  async processarPendingSubscriptionsExpiradas(): Promise<{
    reembolsados: number;
    expirados: number;
  }> {
    const agora = new Date();
    const candidatas = await this.prisma.pendingSubscription.findMany({
      where: { status: PendingSubscriptionStatus.PAGO, expiresAt: { lt: agora } },
    });

    let reembolsados = 0;
    let expirados = 0;

    for (const pending of candidatas) {
      try {
        if (pending.provider === PendingSubscriptionProvider.ABACATEPAY) {
          if (!this.client.isConfigured()) {
            throw new Error("AbacatePay não configurada.");
          }
          await this.client.refundPixQrCode(pending.providerCheckoutId);
        } else {
          if (!this.asaasClient.isConfigured()) {
            throw new Error("Asaas não configurada.");
          }
          if (pending.providerSubscriptionId) {
            await this.asaasClient.cancelSubscription(pending.providerSubscriptionId);
          }
          await this.asaasClient.refundPayment(pending.providerCheckoutId);
        }

        await this.prisma.pendingSubscription.update({
          where: { id: pending.id },
          data: { status: PendingSubscriptionStatus.REEMBOLSADO, refundedAt: agora },
        });
        reembolsados += 1;
      } catch (error) {
        this.logger.warn(
          `Falha ao reembolsar PendingSubscription ${pending.id} expirada (marcando EXPIRADO mesmo assim, pra reconciliação manual): ${(error as Error).message}`,
        );
        await this.prisma.pendingSubscription.update({
          where: { id: pending.id },
          data: { status: PendingSubscriptionStatus.EXPIRADO },
        });
        expirados += 1;
      }
    }

    this.logger.log(
      `Processamento de PendingSubscription expiradas: ${reembolsados} reembolsada(s), ${expirados} marcada(s) EXPIRADO (falha no reembolso).`,
    );
    return { reembolsados, expirados };
  }

  /**
   * Aplica o resultado de um webhook (Pix `billing.paid` ou Asaas
   * `PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED`) que correlacionou com uma
   * `PendingSubscription` em vez de uma `Company` (prefixo `pending:`,
   * ver `PENDING_SUBSCRIPTION_ID_PREFIX`). Idempotente por design, mesmo
   * raciocínio do resto do módulo: já `VINCULADO`/`REEMBOLSADO` é estado
   * final — reaplicar o mesmo evento não regride nada.
   */
  private async markPendingSubscriptionPaid(eventName: string, pendingId: string): Promise<void> {
    try {
      const pending = await this.prisma.pendingSubscription.findUnique({
        where: { id: pendingId },
      });
      if (!pending) {
        this.logger.warn(
          `Webhook "${eventName}" referencia PendingSubscription ${pendingId}, que não existe (mais).`,
        );
        return;
      }
      if (
        pending.status === PendingSubscriptionStatus.VINCULADO ||
        pending.status === PendingSubscriptionStatus.REEMBOLSADO
      ) {
        // Estado final já alcançado — reaplicar o webhook não regride nada.
        return;
      }

      await this.prisma.pendingSubscription.update({
        where: { id: pendingId },
        data: { status: PendingSubscriptionStatus.PAGO, paidAt: pending.paidAt ?? new Date() },
      });
      this.logger.log(`PendingSubscription ${pendingId} -> PAGO (webhook "${eventName}").`);
    } catch (error) {
      this.logger.warn(
        `Não foi possível marcar a PendingSubscription ${pendingId} como PAGO a partir do webhook "${eventName}": ${(error as Error).message}`,
      );
    }
  }

  /** `pending:<uuid>` -> `<uuid>`, ou `null` se `correlationId` não usa o prefixo (é um `company.id` normal). */
  private extractPendingSubscriptionId(correlationId: string): string | null {
    return correlationId.startsWith(PENDING_SUBSCRIPTION_ID_PREFIX)
      ? correlationId.slice(PENDING_SUBSCRIPTION_ID_PREFIX.length)
      : null;
  }

  /**
   * Processa um evento de webhook da Asaas já autenticado (token do
   * header verificado pelo controller). Idempotente por design, mesmo
   * raciocínio de `handleWebhookEvent` (AbacatePay) — reaplicar o mesmo
   * evento só reescreve o mesmo `status`/`asaasSubscriptionId`.
   */
  async handleAsaasWebhookEvent(event: AsaasWebhookEnvelope): Promise<void> {
    const companyId = event.payment?.externalReference ?? undefined;
    const subscriptionId = event.payment?.subscription;

    switch (event.event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED":
        await this.applyAsaasStatus(event.event, companyId, CompanyStatus.ATIVO, subscriptionId);
        return;
      case "PAYMENT_OVERDUE":
        await this.applyAsaasStatus(
          event.event,
          companyId,
          CompanyStatus.INADIMPLENTE,
          subscriptionId,
        );
        return;
      case "SUBSCRIPTION_DELETED":
        await this.applyAsaasStatus(
          event.event,
          companyId,
          CompanyStatus.CANCELADO,
          subscriptionId,
        );
        return;
      default:
        this.logger.debug(`Evento Asaas não tratado (ignorado de propósito): ${event.event}`);
    }
  }

  /**
   * `event.payment.externalReference` — diferente da AbacatePay
   * (`checkout.externalId`), a Asaas ecoa a referência dentro do
   * próprio objeto `payment` (mesmo `externalReference: company.id`
   * passado em `createSubscription`, ver `AsaasPayment`).
   */
  private async applyAsaasStatus(
    eventName: string,
    companyId: string | undefined,
    status: CompanyStatus,
    subscriptionId: string | undefined,
  ): Promise<void> {
    if (!companyId) {
      this.logger.warn(
        `Webhook Asaas "${eventName}" sem payment.externalReference — não é possível correlacionar com nenhuma Company.`,
      );
      return;
    }

    const pendingId = this.extractPendingSubscriptionId(companyId);
    if (pendingId) {
      if (status === CompanyStatus.ATIVO) {
        await this.markPendingSubscriptionPaid(eventName, pendingId);
      } else {
        // Sem Company ainda pra atualizar (INADIMPLENTE/CANCELADO só
        // fazem sentido pra assinatura já vinculada) — ignora de
        // propósito, nunca cria/atualiza nada a partir daqui.
        this.logger.debug(
          `Webhook Asaas "${eventName}" para PendingSubscription ${pendingId} com status ${status} — ignorado (só o evento de pagamento confirmado é aplicável antes do cadastro existir).`,
        );
      }
      return;
    }

    try {
      // Lido ANTES do update só pra saber se é uma assinatura NOVA
      // (pedido do usuário 01/09/2026 — nunca notifica renovação, só
      // transição pra ATIVO vindo de um status não-ATIVO).
      const antes = await this.companyRepository.findById(companyId);

      // Mesmo padrão de bypass explícito e já-validado de `applyStatus`
      // (AbacatePay) — fora do fluxo HTTP autenticado normal (webhook
      // público, sem JWT/TenantGuard).
      await this.prisma.runWithTenantContext({ tenantId: null, bypass: true }, () =>
        this.companyRepository.update(companyId, {
          status,
          ...(subscriptionId ? { asaasSubscriptionId: subscriptionId } : {}),
        }),
      );
      this.logger.log(`Empresa ${companyId} -> status ${status} (webhook Asaas "${eventName}").`);

      if (status === CompanyStatus.ATIVO && antes && antes.status !== CompanyStatus.ATIVO) {
        this.notifyAdminRottaNovaAssinaturaBestEffort(companyId);
      }
    } catch (error) {
      this.logger.warn(
        `Não foi possível atualizar a empresa ${companyId} a partir do webhook Asaas "${eventName}": ${(error as Error).message}`,
      );
    }
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
    const correlationId =
      event.data.billing?.metadata?.externalId ?? event.data.pixQrCode?.metadata?.externalId;

    if (!correlationId) {
      this.logger.warn(
        `Webhook AbacatePay "billing.paid" sem metadata.externalId reconhecível — payload: ${JSON.stringify(event.data)}`,
      );
      return;
    }

    const pendingId = this.extractPendingSubscriptionId(correlationId);
    if (pendingId) {
      await this.markPendingSubscriptionPaid("billing.paid", pendingId);
      return;
    }
    const companyId = correlationId;

    // Agenda o próximo vencimento (Pix "recorrente" simulado — ver nota
    // em `createPixCheckoutForCompany`) e limpa o controle de reenvio,
    // pra o próximo ciclo poder reemitir de novo perto do vencimento.
    const proximoVencimento = new Date();
    proximoVencimento.setMonth(proximoVencimento.getMonth() + PIX_RECURRENCE_MONTHS);

    await this.applyStatus("billing.paid", companyId, CompanyStatus.ATIVO, undefined, {
      pixProximoVencimento: proximoVencimento,
      pixUltimoAvisoEm: null,
    });
  }

  private async applyStatus(
    eventName: string,
    companyId: string | undefined,
    status: CompanyStatus,
    subscriptionId: string | undefined,
    extra: Partial<UpdateCompanyData> = {},
  ): Promise<void> {
    if (!companyId) {
      this.logger.warn(
        `Webhook AbacatePay "${eventName}" sem checkout.externalId — não é possível correlacionar com nenhuma Company.`,
      );
      return;
    }

    try {
      // Lido ANTES do update — mesmo raciocínio de `applyAsaasStatus`
      // (pedido do usuário 01/09/2026): só notifica assinatura NOVA,
      // nunca uma renovação (a recorrência de Pix passa por aqui a
      // cada ciclo, sempre com `status: ATIVO`).
      const antes = await this.companyRepository.findById(companyId);

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
          ...extra,
        }),
      );
      this.logger.log(
        `Empresa ${companyId} -> status ${status} (webhook AbacatePay "${eventName}").`,
      );

      if (status === CompanyStatus.ATIVO && antes && antes.status !== CompanyStatus.ATIVO) {
        this.notifyAdminRottaNovaAssinaturaBestEffort(companyId);
      }
    } catch (error) {
      this.logger.warn(
        `Não foi possível atualizar a empresa ${companyId} a partir do webhook AbacatePay "${eventName}": ${(error as Error).message}`,
      );
    }
  }

  /**
   * Job diário (`internal/queue/billing/reissue-pix`, registrado por
   * `BillingSchedulerService` via QStash — mesmo mecanismo do
   * `InepSyncSchedulerService`) que simula a "assinatura recorrente" que
   * a AbacatePay não tem pra Pix avulso (Dossiê 26): reemite um novo Pix
   * perto do vencimento e marca `INADIMPLENTE` quem não pagou depois da
   * folga (`PIX_OVERDUE_GRACE_DAYS`, mesma folga do trial). Nunca mexe
   * em quem paga por Asaas (cartão/débito/boleto) — a renovação desses é
   * da própria assinatura Asaas.
   */
  async processarVencimentosPix(): Promise<{ reenviados: number; marcadosInadimplentes: number }> {
    if (!this.client.isConfigured()) {
      this.logger.log("AbacatePay não configurada — reenvio automático de Pix pulado.");
      return { reenviados: 0, marcadosInadimplentes: 0 };
    }

    const candidatas = await this.companyRepository.listComPixProximoVencimento();
    const agora = new Date();
    let reenviados = 0;
    let marcadosInadimplentes = 0;

    for (const empresa of candidatas) {
      const vencimento = empresa.pixProximoVencimento;
      if (!vencimento) continue;

      const diasParaVencer = (vencimento.getTime() - agora.getTime()) / (24 * 60 * 60 * 1000);

      if (diasParaVencer < -PIX_OVERDUE_GRACE_DAYS) {
        await this.applyStatus(
          "pix.vencido-sem-pagamento",
          empresa.id,
          CompanyStatus.INADIMPLENTE,
          undefined,
        );
        marcadosInadimplentes += 1;
        continue;
      }

      const diasDesdeUltimoAviso = empresa.pixUltimoAvisoEm
        ? (agora.getTime() - empresa.pixUltimoAvisoEm.getTime()) / (24 * 60 * 60 * 1000)
        : Number.POSITIVE_INFINITY;

      if (
        diasParaVencer <= PIX_REISSUE_WINDOW_DAYS &&
        diasDesdeUltimoAviso >= PIX_REISSUE_REPEAT_DAYS
      ) {
        try {
          await this.client.createPixQrCode({
            amount: ROTTA_SUBSCRIPTION_PRICE_CENTS,
            expiresIn: ABACATEPAY_PIX_EXPIRES_IN_SECONDS,
            description: `${ROTTA_SUBSCRIPTION_PRODUCT_NAME} — ${empresa.nomeFantasia} (renovação)`,
            metadata: { externalId: empresa.id },
          });
          await this.prisma.runWithTenantContext({ tenantId: null, bypass: true }, () =>
            this.companyRepository.update(empresa.id, { pixUltimoAvisoEm: agora }),
          );
          reenviados += 1;
        } catch (error) {
          this.logger.warn(
            `Falha ao reemitir Pix de renovação da empresa ${empresa.id}: ${(error as Error).message}`,
          );
        }
      }
    }

    this.logger.log(
      `Processamento de vencimentos Pix: ${reenviados} reenvio(s), ${marcadosInadimplentes} empresa(s) marcada(s) INADIMPLENTE.`,
    );
    return { reenviados, marcadosInadimplentes };
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
        asaasSubscriptionId: company.asaasSubscriptionId,
        ativaDesde: company.updatedAt.toISOString(),
      })),
      totalRecebidoCentavos: null,
      totalTaxaRetidaCentavos: null,
      quantidadeCobrancasPagas: null,
      abacatepay: {
        configured: this.client.isConfigured(),
        totalRecebidoCentavos: null,
        totalTaxaRetidaCentavos: null,
        quantidadeCobrancasPagas: null,
      },
      asaas: {
        configured: this.asaasClient.isConfigured(),
        totalRecebidoCentavos: null,
        totalTaxaRetidaCentavos: null,
        quantidadeCobrancasPagas: null,
      },
      lucroLiquidoCentavos: null,
    };

    if (overview.abacatepayConfigured) {
      try {
        const billings = await this.client.listBillings();
        const pagas = billings.filter((billing) => billing.status === "PAID");

        const totalRecebido = pagas.reduce((soma, billing) => soma + billing.amount, 0);
        const totalTaxa = pagas.reduce((soma, billing) => {
          const metodo = billing.methods?.[0] ?? "CARD";
          const taxa =
            metodo === "PIX"
              ? ABACATEPAY_FEE_PIX_CENTS
              : Math.round(billing.amount * ABACATEPAY_FEE_CARD_PERCENT) +
                ABACATEPAY_FEE_CARD_FIXED_CENTS;
          return soma + taxa;
        }, 0);

        overview.quantidadeCobrancasPagas = pagas.length;
        overview.totalRecebidoCentavos = totalRecebido;
        overview.totalTaxaRetidaCentavos = totalTaxa;
        overview.abacatepay = {
          configured: true,
          quantidadeCobrancasPagas: pagas.length,
          totalRecebidoCentavos: totalRecebido,
          totalTaxaRetidaCentavos: totalTaxa,
        };
      } catch (error) {
        this.logger.warn(
          `Não foi possível buscar o histórico de cobranças da AbacatePay pro painel financeiro: ${(error as Error).message}`,
        );
      }
    }

    // Asaas não expõe um "billing/list" equivalente já mapeado neste
    // módulo (contrato não testado, ver `types/asaas.types.ts`) — por
    // ora, o bloco `asaas` do painel financeiro só reflete
    // `configured`; os valores populam assim que a Frente de
    // reconciliação (consultar pagamentos por assinatura) for
    // construída. Nunca finge 0 — fica `null` (stub honesto).

    const totalTaxaCombinada =
      (overview.abacatepay.totalTaxaRetidaCentavos ?? 0) +
      (overview.asaas.totalTaxaRetidaCentavos ?? 0);
    const totalRecebidoCombinado =
      (overview.abacatepay.totalRecebidoCentavos ?? 0) +
      (overview.asaas.totalRecebidoCentavos ?? 0);
    if (overview.abacatepay.configured || overview.asaas.configured) {
      overview.lucroLiquidoCentavos = totalRecebidoCombinado - totalTaxaCombinada;
    }

    return overview;
  }
}
