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
  ASAAS_PAYMENTS_MAX_PAGES,
  ASAAS_PAYMENTS_PAGE_SIZE,
  PENDING_SUBSCRIPTION_ID_PREFIX,
  PIX_OVERDUE_GRACE_DAYS,
  PIX_RECURRENCE_MONTHS,
  PIX_REISSUE_REPEAT_DAYS,
  PIX_REISSUE_WINDOW_DAYS,
  PRE_SIGNUP_EXPIRES_HOURS,
  ROTTA_SUBSCRIPTION_PRICE_CENTS,
  ROTTA_SUBSCRIPTION_PRODUCT_NAME,
} from "./billing.constants";

import type { CreateAdminTransferDto } from "./dto/create-admin-transfer.dto";
import type { CreateAsaasCheckoutDto } from "./dto/create-asaas-checkout.dto";
import type {
  CreatePreSignupAsaasDto,
  CreatePreSignupPixDto,
} from "./dto/create-pre-signup-checkout.dto";
import type { AbacatePayPixQrCode, AbacatePayWebhookEnvelope } from "./types/abacatepay.types";
import type {
  AsaasPayment,
  AsaasPixQrCode,
  AsaasTransfer,
  AsaasWebhookEnvelope,
} from "./types/asaas.types";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type {
  CompanyRepository,
  UpdateCompanyData,
} from "@/modules/companies/repositories/company.repository";

import { PrismaService } from "@/infra/database/prisma.service";
import { AdminInboxEmailService } from "@/infra/email/admin-inbox-email.service";
import { AuditLogService } from "@/modules/audit/audit-log.service";
import { COMPANY_REPOSITORY } from "@/modules/companies/companies.constants";
import { COMMUNICATION_REQUESTED_EVENT } from "@/modules/notifications/events/communication-requested.event";
import { MessagePersonalizationService } from "@/modules/notifications/message-personalization.service";
import { UsersService } from "@/modules/users/users.service";
import { Role } from "@/shared/enums";

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

/** `GET /billing/admin/balance` (Frente 33) — saldo atual da conta Asaas da Rotta. */
export interface BillingAdminBalance {
  configured: boolean;
  saldoCentavos: number | null;
}

/** Uma linha do extrato — mesma convenção de `AsaasFinancialTransaction`: `valorCentavos` positivo = entrada, negativo = saída. */
export interface BillingAdminStatementItem {
  data: string;
  valorCentavos: number;
  saldoAposCentavos: number;
  tipo: string;
  descricao: string | null;
}

/** `GET /billing/admin/statement` (Frente 33) — extrato paginado. */
export interface BillingAdminStatementResult {
  configured: boolean;
  items: BillingAdminStatementItem[];
  total: number;
  page: number;
  pageSize: number;
}

/** Metadados da requisição HTTP pra trilha de auditoria — mesmo formato de `CompaniesService.RequestMeta`/`BackofficeService.RequestMeta` (RN-32: toda transferência de dinheiro é obrigatoriamente auditada). */
export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

/** Um pagamento de UMA empresa — pedido do usuário 03/09/2026: "extrato completo de cada usuário que adquiriu o plano... qual foi o usuário, qual conta pagou". A Rotta cobra por `Company` (nunca por pessoa/`Responsável`), então "usuário/conta" aqui É a empresa. */
export interface BillingCompanyPaymentHistoryItem {
  id: string;
  status: string;
  valorCentavos: number;
  /** `null` quando o provedor não devolve valor líquido pra este item específico. */
  liquidoCentavos: number | null;
  taxaCentavos: number | null;
  metodo: string;
  data: string | null;
}

export interface BillingCompanyPaymentHistoryResult {
  companyId: string;
  companyNome: string;
  provider: "asaas" | "abacatepay" | "nenhum";
  items: BillingCompanyPaymentHistoryItem[];
  /** Explica por que `items` pode vir vazio mesmo a empresa tendo assinatura — nunca um vazio silencioso sem motivo. */
  note?: string;
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
    private readonly auditLogService: AuditLogService,
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
        // "financeiro": evento de assinatura/pagamento (pedido do usuário
        // 03/09/2026 — remetente dedicado pra e-mails financeiros).
        void this.adminInboxEmailService.send(mensagem.titulo, mensagem.corpo, "financeiro");

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
   * Avisa a própria Empresa/Gestor sobre o resultado de UM pagamento
   * (pedido do usuário 01/09/2026: "pagamento aprovado/recusado/
   * pendente"). Diferente de `notifyAdminRottaNovaAssinaturaBestEffort`
   * (só a 1ª assinatura, só Admin Rotta): aqui é sempre o próprio
   * cliente sendo avisado, em TODO webhook relevante — inclusive
   * renovações, porque quem paga quer saber de cada cobrança, não só
   * da primeira. Best-effort, nunca impede a atualização de status em
   * si (que já aconteceu antes desta chamada).
   */
  private notifyPagamentoBestEffort(
    companyId: string,
    tipo:
      | typeof NotificationEventType.PAGAMENTO_APROVADO
      | typeof NotificationEventType.PAGAMENTO_RECUSADO
      | typeof NotificationEventType.PAGAMENTO_PENDENTE,
    valorFormatado: string,
  ): void {
    // Tudo dentro de `Promise.resolve().then(...)` de propósito — se
    // `messagePersonalizationService` lançasse por qualquer motivo, o
    // erro precisa cair no `.catch()` DESTE método (mensagem precisa),
    // nunca escapar de volta pro `try/catch` de `applyAsaasStatus`/
    // `applyStatus` (que reportaria "não foi possível ATUALIZAR a
    // empresa", enganoso — a atualização já tinha acontecido).
    Promise.resolve()
      .then(() => {
        const mensagem =
          tipo === NotificationEventType.PAGAMENTO_APROVADO
            ? this.messagePersonalizationService.pagamentoAprovado(valorFormatado)
            : tipo === NotificationEventType.PAGAMENTO_RECUSADO
              ? this.messagePersonalizationService.pagamentoRecusado(valorFormatado)
              : this.messagePersonalizationService.pagamentoPendente(valorFormatado);
        return { mensagem };
      })
      .then(async ({ mensagem }) => {
        const memberships = await this.usersService.listMembershipsByCompany(companyId);
        for (const membership of memberships) {
          if (
            (membership.role as Role) !== Role.EMPRESA &&
            (membership.role as Role) !== Role.GESTOR
          )
            continue;
          this.eventEmitter.emit(COMMUNICATION_REQUESTED_EVENT, {
            userId: membership.userId,
            companyId,
            tipo,
            titulo: mensagem.titulo,
            corpo: mensagem.corpo,
          });
        }
      })
      .catch((error: unknown) => {
        this.logger.warn(
          `Não foi possível notificar a empresa ${companyId} sobre o pagamento (${tipo}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      });
  }

  /** `value` em REAIS (contrato da Asaas, `AsaasPayment.value`) — nunca centavos. */
  private formatarValorAsaasReais(value: number): string {
    return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  /** `centavos` no padrão interno da Rotta (AbacatePay/`billing.constants.ts`). */
  private formatarValorCentavos(centavos: number): string {
    return (centavos / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  }

  /**
   * Checkout Pix embutido na própria Rotta (pedido do usuário: "para não
   * precisar ir em outro lugar") — devolve QR Code + copia-e-cola direto,
   * sem nenhum redirecionamento.
   *
   * Pix 100% via Asaas (pedido do usuário 03/09/2026: "por que não
   * tiram o Pix da AbacatePay? Aí fica direto com a Asaas" — a
   * AbacatePay ficou com a chave inválida/desatualizada em produção o
   * tempo todo desta sessão). Mesmo mecanismo de `createAsaasCheckoutForCompany`
   * (cartão/débito/boleto): cria (ou reaproveita) o `customer` na
   * Asaas, cria uma assinatura mensal com `billingType: "PIX"` e
   * devolve o QR Code do primeiro pagamento. `externalReference:
   * company.id` é o MESMO mecanismo de correlação que
   * `handleAsaasWebhookEvent`/`applyAsaasStatus` já usam pra
   * cartão/boleto — nenhum webhook novo precisou ser escrito, a
   * confirmação (`PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED`) e a renovação
   * mensal são nativas da Asaas, sem precisar do job de reemissão
   * manual que a AbacatePay exigia (`processarVencimentosPix` — deixado
   * intacto só pelas assinaturas AbacatePay já existentes, nunca mais
   * alcançado por um Pix novo).
   */
  async createPixCheckoutForCompany(companyId: string): Promise<AbacatePayPixQrCode> {
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
      billingType: "PIX",
      value: ROTTA_SUBSCRIPTION_PRICE_CENTS / 100,
      cycle: "MONTHLY",
      nextDueDate: hoje,
      description: `${ROTTA_SUBSCRIPTION_PRODUCT_NAME} — ${company.nomeFantasia}`,
      externalReference: company.id,
    });

    await this.prisma.runWithTenantContext({ tenantId: companyId, bypass: false }, () =>
      this.companyRepository.update(companyId, {
        asaasCustomerId,
        asaasSubscriptionId: subscription.id,
      }),
    );

    const { data: pagamentos } = await this.asaasClient.listPaymentsBySubscription(subscription.id);
    const primeiroPagamento = pagamentos[0];
    if (!primeiroPagamento) {
      throw new InternalServerErrorException(
        "Assinatura Pix criada na Asaas, mas nenhum pagamento foi encontrado — tente consultar novamente em instantes.",
      );
    }

    const qrCode = await this.asaasClient.getPixQrCode(primeiroPagamento.id);
    return this.toPixCheckoutFromAsaas(primeiroPagamento, qrCode);
  }

  /**
   * Consultado pelo front enquanto aguarda o webhook confirmar
   * (`PixCheckoutModal`, apps/web) — nunca a única forma de confirmar
   * (o webhook continua sendo a fonte de verdade). Busca status +
   * QR Code de novo a cada poll (o `PixCheckoutModal` troca de fonte
   * pro objeto retornado por aqui assim que a primeira resposta chega
   * — precisa continuar com `brCode`/`brCodeBase64` válidos, não só
   * `status`, senão o QR Code desaparece da tela no primeiro poll).
   */
  async getPixCheckoutStatus(id: string): Promise<AbacatePayPixQrCode> {
    const [payment, qrCode] = await Promise.all([
      this.asaasClient.getPayment(id),
      this.asaasClient.getPixQrCode(id),
    ]);
    return this.toPixCheckoutFromAsaas(payment, qrCode);
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
   *
   * Pix 100% via Asaas (pedido do usuário 03/09/2026: "por que não
   * tiram o Pix da AbacatePay? Aí fica direto com a Asaas" — a
   * AbacatePay ficou com a chave inválida/desatualizada em produção o
   * tempo todo desta sessão, mesmo motivo que já tinha motivado o
   * fallback em 02/09/2026). A AbacatePay só entra em cena aqui como
   * ÚLTIMO recurso, se a própria Asaas não estiver configurada nesta
   * implantação — nenhum checkout novo prefere a AbacatePay quando a
   * Asaas está disponível, o inverso da prioridade original. O front
   * nunca sabe qual dos dois processou — mesmo formato de resposta
   * (`AbacatePayPixQrCode`) nos dois casos, ver `toPixCheckoutFromAsaas`.
   */
  async createPreSignupPixCheckout(
    dto: CreatePreSignupPixDto,
  ): Promise<{ pendingId: string; expiresAt: string; checkout: AbacatePayPixQrCode }> {
    if (this.asaasClient.isConfigured()) {
      return this.createPreSignupPixCheckoutViaAsaas(dto);
    }
    if (this.client.isConfigured()) {
      return this.createPreSignupPixCheckoutViaAbacatePay(dto);
    }
    throw new BadRequestException(
      "Pagamento indisponível: nenhum provedor de Pix está configurado nesta implantação.",
    );
  }

  private async createPreSignupPixCheckoutViaAbacatePay(
    dto: CreatePreSignupPixDto,
  ): Promise<{ pendingId: string; expiresAt: string; checkout: AbacatePayPixQrCode }> {
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
   * Fallback via Asaas (ver comentário de `createPreSignupPixCheckout`).
   * Diferente da AbacatePay, a Asaas exige `cpfCnpj` pra criar o
   * `customer` — se quem está pagando só preencheu e-mail/telefone
   * (os únicos campos obrigatórios do fluxo Pix normal,
   * `CreatePreSignupPixDto`), pede o CPF/CNPJ explicitamente em vez de
   * falhar com um erro genérico da Asaas.
   */
  private async createPreSignupPixCheckoutViaAsaas(
    dto: CreatePreSignupPixDto,
  ): Promise<{ pendingId: string; expiresAt: string; checkout: AbacatePayPixQrCode }> {
    if (!dto.cpfCnpj) {
      throw new BadRequestException(
        "Pagamento via Pix indisponível no momento sem CPF/CNPJ — preencha esse campo e tente novamente.",
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
        billingType: "PIX",
        value: ROTTA_SUBSCRIPTION_PRICE_CENTS / 100,
        cycle: "MONTHLY",
        nextDueDate: hoje,
        description: `${ROTTA_SUBSCRIPTION_PRODUCT_NAME} — ${dto.nome}`,
        externalReference,
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

      const qrCode = await this.asaasClient.getPixQrCode(primeiroPagamento.id);

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
        checkout: this.toPixCheckoutFromAsaas(primeiroPagamento, qrCode),
      };
    } catch (error) {
      // Mesmo raciocínio do fallback AbacatePay: nunca deixa a
      // `PendingSubscription` órfã se a Asaas falhar no meio do caminho.
      await this.prisma.pendingSubscription.delete({ where: { id: pending.id } });
      throw error;
    }
  }

  /**
   * Normaliza um pagamento Pix da Asaas pro mesmo formato
   * `AbacatePayPixQrCode` que o front já consome (`brCode`/
   * `brCodeBase64`) — assim `/planos/assinar` nunca precisa saber qual
   * provedor de verdade processou o Pix.
   */
  private toPixCheckoutFromAsaas(
    payment: AsaasPayment,
    qrCode: AsaasPixQrCode,
  ): AbacatePayPixQrCode {
    return {
      id: payment.id,
      amount: Math.round(payment.value * 100),
      status: this.mapAsaasPaymentStatusToPixStatus(payment.status),
      brCode: qrCode.payload,
      brCodeBase64: qrCode.encodedImage,
      expiresAt: qrCode.expirationDate,
      createdAt: new Date().toISOString(),
    };
  }

  private mapAsaasPaymentStatusToPixStatus(
    status: AsaasPayment["status"],
  ): AbacatePayPixQrCode["status"] {
    switch (status) {
      case "RECEIVED":
      case "CONFIRMED":
      case "RECEIVED_IN_CASH":
        return "PAID";
      case "OVERDUE":
        return "EXPIRED";
      case "REFUNDED":
      case "CHARGEBACK_REQUESTED":
        return "REFUNDED";
      default:
        return "PENDING";
    }
  }

  /**
   * Reconciliação financeira da Asaas pro painel Admin (pedido do
   * usuário 02/09/2026: "veja a parte de faturamento e recebimentos,
   * provedor Asaas" — até esta entrega, `getAdminOverview` só refletia
   * `configured: true/false` pra Asaas, nunca somava valor nenhum, por
   * faltar exatamente este método). Pagina `AsaasClientService.
   * listPayments` (conta inteira, não uma assinatura só) até `hasMore`
   * virar `false` ou bater no circuit breaker `ASAAS_PAYMENTS_MAX_PAGES`.
   *
   * Só conta como "pago" o mesmo trio de status que
   * `mapAsaasPaymentStatusToPixStatus` já trata como `PAID` — nunca
   * duplica essa classificação. Taxa retida = `value - netValue`,
   * direto do que a própria Asaas devolve (confirmado com uma chamada
   * real de produção) — nada estimado por fórmula, diferente do bloco
   * da AbacatePay logo acima (`ABACATEPAY_FEE_*`), cujo `billing/list`
   * não devolve valor líquido.
   */
  private async reconciliarPagamentosAsaas(inicioDeHoje: Date): Promise<{
    totalRecebidoCentavos: number;
    totalTaxaRetidaCentavos: number;
    quantidadeCobrancasPagas: number;
  }> {
    let totalRecebidoCentavos = 0;
    let totalTaxaRetidaCentavos = 0;
    let quantidadeCobrancasPagas = 0;

    let offset = 0;
    for (let pagina = 0; pagina < ASAAS_PAYMENTS_MAX_PAGES; pagina += 1) {
      const { data: pagamentos, hasMore } = await this.asaasClient.listPayments({
        offset,
        limit: ASAAS_PAYMENTS_PAGE_SIZE,
      });

      for (const pagamento of pagamentos) {
        if (this.mapAsaasPaymentStatusToPixStatus(pagamento.status) !== "PAID") continue;
        // "Zere os dados e só conte os dados a partir do dia de hoje"
        // (pedido do usuário 03/09/2026) — ignora tudo pago antes de
        // hoje, mesmo já confirmado.
        const dataPagamento = pagamento.paymentDate ?? pagamento.dateCreated;
        if (!dataPagamento || new Date(dataPagamento) < inicioDeHoje) continue;
        const valorCentavos = Math.round(pagamento.value * 100);
        const liquidoCentavos =
          pagamento.netValue !== undefined ? Math.round(pagamento.netValue * 100) : valorCentavos;
        totalRecebidoCentavos += valorCentavos;
        totalTaxaRetidaCentavos += valorCentavos - liquidoCentavos;
        quantidadeCobrancasPagas += 1;
      }

      if (!hasMore) break;
      offset += ASAAS_PAYMENTS_PAGE_SIZE;
      if (pagina === ASAAS_PAYMENTS_MAX_PAGES - 1) {
        this.logger.warn(
          `Reconciliação de pagamentos Asaas atingiu o limite de ${ASAAS_PAYMENTS_MAX_PAGES} páginas (${offset} pagamentos) sem terminar — números do painel financeiro podem estar incompletos.`,
        );
      }
    }

    return { totalRecebidoCentavos, totalTaxaRetidaCentavos, quantidadeCobrancasPagas };
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
    // `payment.value` é o único valor de pagamento que qualquer webhook
    // desta integração de fato ecoa de volta (a AbacatePay não manda
    // `amount` em nenhum evento de assinatura, ver `applyStatus`) —
    // usado só pra compor o texto de PAGAMENTO_*, nunca pra lógica de
    // negócio (o `status` já resolvido acima continua a única fonte de
    // verdade).
    const valorFormatado =
      event.payment?.value !== undefined
        ? this.formatarValorAsaasReais(event.payment.value)
        : undefined;

    switch (event.event) {
      case "PAYMENT_CONFIRMED":
      case "PAYMENT_RECEIVED":
        await this.applyAsaasStatus(
          event.event,
          companyId,
          CompanyStatus.ATIVO,
          subscriptionId,
          NotificationEventType.PAGAMENTO_APROVADO,
          valorFormatado,
        );
        return;
      case "PAYMENT_OVERDUE":
        // Asaas não distingue "recusado" de "vencido sem pagamento" num
        // evento próprio — `PAYMENT_OVERDUE` lê melhor como "ainda
        // pendente" do ponto de vista de quem só quer saber se já
        // pagou ou não (pedido do usuário: "pagamento... pendente").
        // `PAGAMENTO_RECUSADO` fica reservado pro evento real de recusa
        // da AbacatePay (`subscription.payment_failed`, ver `applyStatus`).
        await this.applyAsaasStatus(
          event.event,
          companyId,
          CompanyStatus.INADIMPLENTE,
          subscriptionId,
          NotificationEventType.PAGAMENTO_PENDENTE,
          valorFormatado,
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
    pagamentoTipo?:
      | typeof NotificationEventType.PAGAMENTO_APROVADO
      | typeof NotificationEventType.PAGAMENTO_RECUSADO
      | typeof NotificationEventType.PAGAMENTO_PENDENTE,
    valorFormatado?: string,
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
      if (pagamentoTipo && valorFormatado) {
        this.notifyPagamentoBestEffort(companyId, pagamentoTipo, valorFormatado);
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

    // A AbacatePay não ecoa `amount` em NENHUM evento de assinatura (ver
    // `AbacatePaySubscriptionWebhookData` — só `subscription`/`checkout`/
    // `payment` com `id`+`status`) — diferente da Asaas, que manda
    // `payment.value` de verdade. Como hoje só existe o plano Starter
    // único, `ROTTA_SUBSCRIPTION_PRICE_CENTS` é o valor real cobrado,
    // não uma invenção — stub-honesto seria esconder o valor por
    // completo, o que piora a notificação sem necessidade.
    const valorFormatado = this.formatarValorCentavos(ROTTA_SUBSCRIPTION_PRICE_CENTS);

    switch (event.event) {
      case "subscription.completed":
      case "subscription.renewed":
        await this.applyStatus(
          event.event,
          companyId,
          CompanyStatus.ATIVO,
          subscriptionId,
          {},
          NotificationEventType.PAGAMENTO_APROVADO,
          valorFormatado,
        );
        return;
      case "subscription.payment_failed":
        await this.applyStatus(
          event.event,
          companyId,
          CompanyStatus.INADIMPLENTE,
          subscriptionId,
          {},
          NotificationEventType.PAGAMENTO_RECUSADO,
          valorFormatado,
        );
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

    await this.applyStatus(
      "billing.paid",
      companyId,
      CompanyStatus.ATIVO,
      undefined,
      { pixProximoVencimento: proximoVencimento, pixUltimoAvisoEm: null },
      NotificationEventType.PAGAMENTO_APROVADO,
      this.formatarValorCentavos(ROTTA_SUBSCRIPTION_PRICE_CENTS),
    );
  }

  private async applyStatus(
    eventName: string,
    companyId: string | undefined,
    status: CompanyStatus,
    subscriptionId: string | undefined,
    extra: Partial<UpdateCompanyData> = {},
    pagamentoTipo?:
      | typeof NotificationEventType.PAGAMENTO_APROVADO
      | typeof NotificationEventType.PAGAMENTO_RECUSADO
      | typeof NotificationEventType.PAGAMENTO_PENDENTE,
    valorFormatado?: string,
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
      if (pagamentoTipo && valorFormatado) {
        this.notifyPagamentoBestEffort(companyId, pagamentoTipo, valorFormatado);
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
   * Meia-noite de hoje no servidor (Render roda em UTC — mesma
   * simplificação já aceita no resto do módulo, nenhum outro ponto do
   * codebase faz conversão explícita pra `America/Sao_Paulo`; até 3h
   * de diferença perto da virada não muda o objetivo real do pedido,
   * que é "zerar o histórico de teste/QA", não bater o segundo exato).
   */
  private inicioDeHoje(): Date {
    const agora = new Date();
    return new Date(Date.UTC(agora.getUTCFullYear(), agora.getUTCMonth(), agora.getUTCDate()));
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
   *
   * Só conta cobranças pagas A PARTIR DE HOJE (pedido do usuário
   * 03/09/2026: "zere os dados e só conte os dados a partir do dia de
   * hj") — meses de teste/QA acumulados não devem aparecer como
   * "receita real" no painel. O saldo/extrato da conta Asaas
   * (`getAdminBalance`/`getAdminStatement`) continua mostrando o
   * histórico completo de verdade — são telas diferentes com objetivos
   * diferentes (saldo bancário nunca "zera", extrato é auditoria).
   */
  async getAdminOverview(): Promise<BillingAdminOverview> {
    const inicioDeHoje = this.inicioDeHoje();
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
        const pagas = billings.filter((billing) => {
          if (billing.status !== "PAID") return false;
          const dataPagamento = billing.paidAt ?? billing.createdAt;
          return dataPagamento ? new Date(dataPagamento) >= inicioDeHoje : false;
        });

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

    if (overview.asaas.configured) {
      try {
        const { totalRecebidoCentavos, totalTaxaRetidaCentavos, quantidadeCobrancasPagas } =
          await this.reconciliarPagamentosAsaas(inicioDeHoje);

        overview.totalRecebidoCentavos =
          (overview.totalRecebidoCentavos ?? 0) + totalRecebidoCentavos;
        overview.totalTaxaRetidaCentavos =
          (overview.totalTaxaRetidaCentavos ?? 0) + totalTaxaRetidaCentavos;
        overview.quantidadeCobrancasPagas =
          (overview.quantidadeCobrancasPagas ?? 0) + quantidadeCobrancasPagas;
        overview.asaas = {
          configured: true,
          totalRecebidoCentavos,
          totalTaxaRetidaCentavos,
          quantidadeCobrancasPagas,
        };
      } catch (error) {
        this.logger.warn(
          `Não foi possível buscar o histórico de pagamentos da Asaas pro painel financeiro: ${(error as Error).message}`,
        );
      }
    }

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

  /**
   * Saldo atual da conta Asaas da Rotta (Frente 33, pedido do usuário
   * 03/09/2026: "área financeira... saldo atual"). Mesmo padrão "stub
   * honesto" do resto do módulo: sem `ASAAS_API_KEY`, `configured:
   * false` e `saldoCentavos: null` (nunca 0 fingido).
   */
  async getAdminBalance(): Promise<BillingAdminBalance> {
    if (!this.asaasClient.isConfigured()) {
      return { configured: false, saldoCentavos: null };
    }
    const { balance } = await this.asaasClient.getBalance();
    return { configured: true, saldoCentavos: Math.round(balance * 100) };
  }

  /**
   * Extrato paginado da conta Asaas da Rotta (Frente 33, pedido do
   * usuário: "olhar o extrato") — toda entrada/saída real da conta, não
   * só cobranças de mensalidade (diferente de `getAdminOverview`). Só
   * mostra a partir de hoje (pedido do usuário 03/09/2026: "o
   * histórico também só deverá mostrar a partir de hoje") — via
   * `startDate` real da própria Asaas, não um filtro em memória.
   */
  async getAdminStatement(page: number, pageSize: number): Promise<BillingAdminStatementResult> {
    if (!this.asaasClient.isConfigured()) {
      return { configured: false, items: [], total: 0, page, pageSize };
    }
    const offset = (page - 1) * pageSize;
    const result = await this.asaasClient.listFinancialTransactions({
      offset,
      limit: pageSize,
      startDate: this.inicioDeHoje().toISOString().slice(0, 10),
    });
    return {
      configured: true,
      items: result.data.map((transacao) => ({
        data: transacao.date,
        valorCentavos: Math.round(transacao.value * 100),
        saldoAposCentavos: Math.round(transacao.balance * 100),
        tipo: transacao.type,
        descricao: transacao.description ?? null,
      })),
      total: result.totalCount,
      page,
      pageSize,
    };
  }

  /**
   * Transferência Pix pra fora da conta Asaas da Rotta (Frente 33,
   * pedido do usuário: "fazer transferências"). SEMPRE auditado (RN-32)
   * — dinheiro de verdade saindo da conta da plataforma. Sem
   * `companyId` no log: é uma ação sobre a conta da PRÓPRIA Rotta, não
   * sobre nenhum tenant (mesmo raciocínio de `BackofficeService.
   * accessAsSupport`, que grava com `companyId` só porque a ação em si
   * É sobre uma empresa — aqui não há empresa nenhuma envolvida).
   *
   * Nunca decorada com `@AdminAreas` no controller — por design do
   * `AdminAreaGuard` isso torna a rota GERAL-only por padrão, então
   * `AdminRottaPapel.FINANCEIRO` (que só enxerga leitura) nem chega
   * aqui; este método não reprecisa checar o papel de novo.
   */
  async createAdminTransfer(
    dto: CreateAdminTransferDto,
    actor: AuthenticatedUser,
    meta: RequestMeta,
  ): Promise<AsaasTransfer> {
    if (!this.asaasClient.isConfigured()) {
      throw new InternalServerErrorException(
        "Asaas não está configurada (ASAAS_API_KEY ausente) — transferência indisponível.",
      );
    }

    const transfer = await this.asaasClient.createTransfer({
      value: dto.valorCentavos / 100,
      pixAddressKey: dto.chavePix,
      pixAddressKeyType: dto.tipoChavePix,
      operationType: "PIX",
      description: dto.descricao,
    });

    await this.auditLogService.record({
      entidadeTipo: "AsaasTransfer",
      entidadeId: transfer.id,
      acao: "ADMIN_CREATED_TRANSFER",
      atorUserId: actor.sub,
      dadosDepois: {
        valorCentavos: dto.valorCentavos,
        tipoChavePix: dto.tipoChavePix,
        descricao: dto.descricao ?? null,
        status: transfer.status,
      },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    this.logger.log(
      `Admin ${actor.sub} criou transferência Asaas ${transfer.id} (R$ ${(dto.valorCentavos / 100).toFixed(2)}, status ${transfer.status}).`,
    );

    return transfer;
  }

  /**
   * Extrato completo de pagamentos de UMA empresa (Frente 33, pedido
   * do usuário 03/09/2026: "extrato completo de cada usuário que
   * adquiriu o plano... qual foi o usuário, qual conta pagou").
   * Correlação 100% confiável — usa `Company.asaasSubscriptionId`
   * (salvo no nosso banco, nunca "adivinhado" a partir de metadata do
   * provedor) pra pedir só os pagamentos DAQUELA assinatura.
   *
   * A AbacatePay não tem esse mesmo endpoint (`GET /billing/list` não
   * filtra por assinatura — ver comentário de `AbacatePayBilling`),
   * então uma empresa só-AbacatePay volta com `items: []` + `note`
   * explicando o motivo — nunca inventa uma correlação frágil por
   * valor/data que poderia mostrar o pagamento errado.
   */
  async getCompanyPaymentHistory(companyId: string): Promise<BillingCompanyPaymentHistoryResult> {
    const company = await this.companyRepository.findById(companyId);
    if (!company) {
      throw new NotFoundException("Empresa não encontrada.");
    }

    if (company.asaasSubscriptionId && this.asaasClient.isConfigured()) {
      const { data: pagamentos } = await this.asaasClient.listPaymentsBySubscription(
        company.asaasSubscriptionId,
      );
      // "O histórico também só deverá mostrar a partir de hoje"
      // (pedido do usuário 03/09/2026) — `listPaymentsBySubscription`
      // não tem filtro de data próprio (é sempre a assinatura inteira),
      // então filtra aqui mesmo antes de mapear pra resposta.
      const inicioDeHoje = this.inicioDeHoje();
      const pagamentosDeHoje = pagamentos.filter((pagamento) => {
        const data = pagamento.paymentDate ?? pagamento.dateCreated;
        return data ? new Date(data) >= inicioDeHoje : false;
      });
      return {
        companyId: company.id,
        companyNome: company.nomeFantasia,
        provider: "asaas",
        items: pagamentosDeHoje.map((pagamento) => ({
          id: pagamento.id,
          status: pagamento.status,
          valorCentavos: Math.round(pagamento.value * 100),
          liquidoCentavos:
            pagamento.netValue !== undefined ? Math.round(pagamento.netValue * 100) : null,
          taxaCentavos:
            pagamento.netValue !== undefined
              ? Math.round(pagamento.value * 100) - Math.round(pagamento.netValue * 100)
              : null,
          metodo: pagamento.billingType,
          data: pagamento.paymentDate ?? pagamento.dateCreated ?? null,
        })),
      };
    }

    if (company.abacatepaySubscriptionId) {
      return {
        companyId: company.id,
        companyNome: company.nomeFantasia,
        provider: "abacatepay",
        items: [],
        note: "A AbacatePay não expõe histórico de pagamentos por assinatura — veja o extrato geral da conta acima.",
      };
    }

    return {
      companyId: company.id,
      companyNome: company.nomeFantasia,
      provider: "nenhum",
      items: [],
      note: "Esta empresa ainda não tem assinatura recorrente ativa.",
    };
  }
}
