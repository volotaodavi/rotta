import type {
  ContractInvoice,
  ContractInvoiceStatus,
  ContractStatus,
  InvoicePaymentMethod,
} from "@prisma/client";

export interface CreateContractInvoiceData {
  companyId: string;
  contractId: string;
  studentId: string;
  responsavelId: string;
  competencia: Date;
  vencimento: Date;
  valorCentavos: number;
}

export interface UpdateContractInvoiceData {
  status?: ContractInvoiceStatus;
  asaasPaymentId?: string | null;
  asaasCustomerId?: string | null;
  meioDePagamento?: InvoicePaymentMethod | null;
  linkDaFatura?: string | null;
  linhaDigitavel?: string | null;
  pagoEm?: Date | null;
  valorPagoCentavos?: number | null;
  taxaDoProvedorCentavos?: number | null;
  repasseCentavos?: number | null;
  repasseDiretoAoTransportador?: boolean;
  canceladaEm?: Date | null;
  motivoCancelamento?: string | null;
}

/** A fatura com o que a tela precisa para dizer de quem é a cobrança. */
export type ContractInvoiceComContexto = ContractInvoice & {
  student: { id: string; nome: string };
  company: { id: string; nomeFantasia: string };
};

export interface ListContractInvoicesFilter {
  companyId: string;
  status?: ContractInvoiceStatus;
  /** Primeiro dia do mês — filtra uma competência exata. */
  competencia?: Date;
  page: number;
  pageSize: number;
}

export interface ListContractInvoicesResult {
  items: ContractInvoiceComContexto[];
  total: number;
}

/** Linha de contrato ativo que ainda precisa de fatura em uma competência. */
export interface ContratoParaFaturar {
  id: string;
  companyId: string;
  studentId: string;
  responsavelId: string;
  valorMensalidadeCentavos: number;
}

/**
 * O contrato visto pelo fluxo de assinatura: o que decide se a
 * recorrência pode nascer, para quem ela cobra e até quando.
 */
export interface ContratoParaAssinar {
  id: string;
  companyId: string;
  studentId: string;
  responsavelId: string;
  valorMensalidadeCentavos: number;
  planoDescricao: string;
  status: ContractStatus;
  vigenciaInicio: Date;
  /** `null` quando o contrato não tem fim combinado. */
  vigenciaFim: Date | null;
  asaasSubscriptionId: string | null;
  asaasSubscriptionStatus: string | null;
  student: { id: string; nome: string };
  company: { id: string; nomeFantasia: string };
}

export interface AtualizarAssinaturaDoContratoData {
  asaasSubscriptionId?: string | null;
  asaasSubscriptionStatus?: string | null;
  assinaturaCriadaEm?: Date | null;
}

/**
 * `contract_invoices` tem RLS por `companyId`. Os dois métodos
 * `...AcrossTenants` existem porque o Responsável não tem tenant: ele
 * chega na fatura por um caminho que começa no próprio filho, e é o
 * `studentId`/`responsavelId` já autorizado que mantém o escopo (mesma
 * justificativa de `TripStudentEventRepository.listByStudentAcrossTenants`).
 */
export interface ContractInvoiceRepository {
  create(data: CreateContractInvoiceData): Promise<ContractInvoice>;
  findById(id: string): Promise<ContractInvoice | null>;
  update(id: string, data: UpdateContractInvoiceData): Promise<ContractInvoice>;
  list(filter: ListContractInvoicesFilter): Promise<ListContractInvoicesResult>;

  /**
   * As faturas de um aluno, mais recentes primeiro — a tela de
   * Pagamentos do Responsável. Cruza tenants: ver nota da interface.
   */
  listByStudentAcrossTenants(studentId: string): Promise<ContractInvoiceComContexto[]>;
  /** Uma fatura específica, pelo caminho do Responsável. Cruza tenants: ver nota da interface. */
  findByIdAcrossTenants(id: string): Promise<ContractInvoiceComContexto | null>;
  /**
   * Correlação de volta do webhook da Asaas. Cruza tenants porque quem
   * chama é a Asaas, sem ator e sem tenant — o `asaasPaymentId` é
   * `@unique` e vem do provedor, nunca de um cliente.
   */
  findByAsaasPaymentIdAcrossTenants(asaasPaymentId: string): Promise<ContractInvoice | null>;

  /**
   * Escrita vinda do webhook da Asaas.
   *
   * ## Por que `update` não serve, e isto não é preferência de estilo
   *
   * `contract_invoices` tem `FORCE ROW LEVEL SECURITY` com política
   * `companyId = app.tenant_id OR app.bypass_rls = 'on'`. A rota do
   * webhook é `@Public()`, então o `TenantGuard` sai antes de pôr
   * `tenantContext` na requisição, e `PrismaService.withTenant` cai no
   * padrão seguro `{ tenantId: null, bypass: false }` — que faz a
   * política ser falsa para TODA linha.
   *
   * Resultado de usar `update` aqui: a escrita não acha linha nenhuma, o
   * Prisma levanta erro, o webhook responde 500, e a Asaas reentrega.
   * Quinze respostas não-200 seguidas **pausam a fila inteira da
   * configuração**, inclusive a confirmação de pagamento da assinatura
   * da própria Rotta, e evento guardado por mais de 14 dias é apagado
   * para sempre.
   *
   * Por isso toda escrita alcançável pelo webhook passa por aqui.
   */
  updateAcrossTenants(id: string, data: UpdateContractInvoiceData): Promise<ContractInvoice>;

  /**
   * Cria a fatura de um mês a partir do webhook. Existe porque a
   * recorrência do Asaas gera a cobrança **até 40 dias antes do
   * vencimento**: quando ela chega, a fatura daquele mês muitas vezes
   * ainda não foi gerada pela rotina mensal da Rotta.
   *
   * Cruza tenants pelo mesmo motivo de `updateAcrossTenants`.
   */
  createAcrossTenants(data: CreateContractInvoiceData): Promise<ContractInvoice>;

  /**
   * Contratos ATIVOS com mensalidade acima de zero que ainda não têm
   * fatura nesta competência. Cruza tenants porque a geração mensal
   * roda para a plataforma inteira, sem ator (é um job agendado).
   */
  listContratosSemFaturaAcrossTenants(competencia: Date): Promise<ContratoParaFaturar[]>;
  /**
   * Marca como `VENCIDA` toda fatura `A_VENCER` cujo vencimento já
   * passou. Cruza tenants pelo mesmo motivo do método acima. Devolve
   * quantas mudaram.
   */
  marcarVencidasAcrossTenants(hoje: Date): Promise<number>;

  // --- A assinatura da família, que mora no contrato ---

  /**
   * O contrato para o qual a recorrência vai ser criada. Cruza tenants
   * porque quem chama já provou acesso à empresa antes (mesmo desenho de
   * `getContaDeRecebimentoDaEmpresa`), e porque o Admin Rotta chega aqui
   * por um `companyId` que não é o tenant dele.
   */
  findContratoParaAssinarAcrossTenants(contractId: string): Promise<ContratoParaAssinar | null>;

  /**
   * O contrato dono de uma assinatura do Asaas. Cruza tenants porque
   * quem chama é o webhook: sem ator, sem tenant, e o
   * `asaasSubscriptionId` é `@unique` e veio do provedor.
   */
  findContratoPorAssinaturaAcrossTenants(
    asaasSubscriptionId: string,
  ): Promise<ContratoParaAssinar | null>;

  /** Grava o vínculo da recorrência no contrato. Cruza tenants: ver acima. */
  atualizarAssinaturaDoContratoAcrossTenants(
    contractId: string,
    data: AtualizarAssinaturaDoContratoData,
  ): Promise<void>;

  /**
   * A fatura de um mês de um contrato. É o que liga a cobrança que a
   * recorrência gerou à competência dela, já que toda cobrança gerada
   * carrega o mesmo `externalReference` da assinatura e não um por mês.
   */
  findPorContratoECompetenciaAcrossTenants(
    contractId: string,
    competencia: Date,
  ): Promise<ContractInvoice | null>;
}
