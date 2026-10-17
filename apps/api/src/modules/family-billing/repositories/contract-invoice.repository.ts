import type { ContractInvoice, ContractInvoiceStatus, InvoicePaymentMethod } from "@prisma/client";

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
}
