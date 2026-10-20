import { buildQueryString } from "../query.util";

import type { ApiClient } from "../http";

/**
 * Cobrança da família (mensalidade do transporte escolar) — espelha
 * `apps/api/src/modules/family-billing`.
 *
 * Não confundir com `endpoints/billing.ts`, que é a Rotta cobrando a
 * transportadora pela plataforma. Aqui o pagador é o Responsável e quem
 * recebe é a transportadora.
 *
 * O Rotta Pay (`endpoints/wallet.ts`) é do TRANSPORTADOR: é lá que ele
 * vê saldo e pede saque. O Responsável nunca tem carteira — ele vê
 * quanto deve, quando vence e como pagar.
 */

interface ApiEnvelope<T> {
  data: T;
}

export type ContractInvoiceStatus = "A_VENCER" | "PAGA" | "VENCIDA" | "CANCELADA" | "ESTORNADA";
export type InvoicePaymentMethod = "PIX" | "BOLETO" | "CARTAO_CREDITO" | "CARTAO_DEBITO";

export interface ContractInvoice {
  id: string;
  contractId: string;
  studentId: string;
  studentNome: string;
  companyId: string;
  transportadoraNome: string;
  /** `AAAA-MM-DD`, sempre o primeiro dia do mês. */
  competencia: string;
  /** Já escrito, ex. "Abr/2026". */
  competenciaRotulo: string;
  /** `AAAA-MM-DD`. */
  vencimento: string;
  valorCentavos: number;
  /** Já formatado, ex. "R$ 660,00" — a tela não refaz conta de moeda. */
  valorFormatado: string;
  status: ContractInvoiceStatus;
  meioDePagamento: InvoicePaymentMethod | null;
  linkDaFatura: string | null;
  linhaDigitavel: string | null;
  pagoEm: string | null;
  valorPagoCentavos: number | null;
}

export interface ResumoDeFaturasGrupo {
  status: ContractInvoiceStatus;
  quantidade: number;
  totalCentavos: number;
  totalFormatado: string;
}

export interface PagamentosDoResponsavel {
  studentId: string;
  alunoNome: string;
  resumo: ResumoDeFaturasGrupo[];
  faturas: ContractInvoice[];
  totalEmAbertoCentavos: number;
  totalEmAbertoFormatado: string | null;
  /**
   * Falso quando a cobrança pelo app ainda não está ligada nesta
   * implantação. Os valores continuam reais — só não há como pagar por
   * aqui, e a tela diz isso em vez de oferecer um botão que falha.
   */
  pagamentoNoAppDisponivel: boolean;
}

export interface PagamentoDaFatura {
  invoiceId: string;
  meioDePagamento: "PIX" | "BOLETO";
  valorCentavos: number;
  valorFormatado: string;
  /** Pix copia e cola. */
  pixPayload: string | null;
  /** QR em base64 puro, sem o prefixo `data:image/png;base64,`. */
  pixQrCodeBase64: string | null;
  pixExpiraEm: string | null;
  linhaDigitavel: string | null;
  linkDaFatura: string | null;
  status: ContractInvoiceStatus;
}

export interface ListContractInvoicesResult {
  items: ContractInvoice[];
  total: number;
  page: number;
  pageSize: number;
}

export interface CompanyPaymentAccount {
  id: string;
  companyId: string;
  status: "PENDENTE" | "EM_ANALISE" | "ATIVA" | "RECUSADA";
  /** A subconta Asaas do transportador — o destino do split. `null` enquanto ela não existir. */
  asaasWalletId: string | null;
  /** O `id` da subconta, para conferir no painel da Asaas. */
  asaasAccountId: string | null;
  /** Para onde o transportador conclui o cadastro, quando a Asaas devolve o link. */
  asaasOnboardingUrl: string | null;
  /**
   * Se dá para emitir cobrança em nome da subconta.
   *
   * É um booleano, e não a chave: a chave de API da subconta fica
   * cifrada no servidor e NUNCA sai em resposta de API. A tela precisa
   * saber se pode, não qual é.
   */
  podeEmitirPelaSubconta: boolean;
  chavePix: string | null;
  /** Quem figura como emissor: a Rotta, ou a subconta do transportador (único modelo com custódia). */
  emissorDaCobranca: "ROTTA" | "SUBCONTA";
  custodiaAtiva: boolean;
  custodiaDiasParaLiberar: number | null;
  taxaDaPlataformaBps: number;
  /** Taxa da Rotta por meio, em pontos-base (1% = 100). */
  taxaPixBps: number;
  taxaBoletoBps: number;
  taxaCreditoVistaBps: number;
  taxaCreditoParceladoBps: number;
  observacoes: string | null;
}

/**
 * O que o formulário de subconta manda.
 *
 * Um campo obrigatório, e não doze: razão social, documento, endereço e
 * contato já estão no cadastro da transportadora, conferidos na Receita
 * quando ela entrou. O faturamento mensal é o único que a Rotta nunca
 * coletou, e o único que o Asaas exige.
 *
 * `walletId`, `accountId` e chave de API não entram aqui de propósito:
 * vêm da resposta do Asaas, nunca do cliente.
 */
export interface CriarSubcontaAsaasInput {
  faturamentoMensalCentavos: number;
  /** Só quando o financeiro é outro e-mail: é para cá que o Asaas manda os avisos da conta. */
  email?: string;
  /** Só quando o financeiro é outro celular. Dígitos com DDD. */
  telefone?: string;
}

export function createFamilyBillingEndpoints(apiClient: ApiClient) {
  return {
    /** Quanto a família deve, quando vence e como está cada fatura — escopo pelo ALUNO. */
    getPagamentosDoAluno: async (studentId: string): Promise<PagamentosDoResponsavel> =>
      (
        await apiClient.request<ApiEnvelope<PagamentosDoResponsavel>>(
          `/family-billing/students/${studentId}/pagamentos`,
        )
      ).data,

    /**
     * Abre o Pix de uma fatura. Reaproveita a cobrança já criada para a
     * mesma fatura — chamar duas vezes nunca gera duas cobranças.
     */
    abrirPagamentoPix: async (invoiceId: string): Promise<PagamentoDaFatura> =>
      (
        await apiClient.request<ApiEnvelope<PagamentoDaFatura>>(
          `/family-billing/invoices/${invoiceId}/pagamento-pix`,
          { method: "POST" },
        )
      ).data,

    /** Contas a receber da transportadora — o outro lado da mesma fatura. */
    listInvoices: async (params?: {
      status?: ContractInvoiceStatus;
      competencia?: string;
      page?: number;
      pageSize?: number;
    }): Promise<ListContractInvoicesResult> =>
      (
        await apiClient.request<ApiEnvelope<ListContractInvoicesResult>>(
          `/family-billing/invoices${buildQueryString({ ...params })}`,
        )
      ).data,

    getContaDeRecebimento: async (): Promise<CompanyPaymentAccount | null> =>
      (
        await apiClient.request<ApiEnvelope<CompanyPaymentAccount | null>>(
          "/family-billing/conta-de-recebimento",
        )
      ).data,

    salvarContaDeRecebimento: async (input: { chavePix: string }): Promise<CompanyPaymentAccount> =>
      (
        await apiClient.request<ApiEnvelope<CompanyPaymentAccount>>(
          "/family-billing/conta-de-recebimento",
          { method: "PUT", body: input },
        )
      ).data,

    /**
     * Abre a conta de recebimento da transportadora no Asaas, sem ela
     * sair da Rotta.
     *
     * O corpo pede um campo porque os outros já estão no cadastro da
     * transportadora. A conta nasce `EM_ANALISE` e o estado muda sozinho
     * quando o Asaas termina a análise. Chamar de novo com subconta já
     * criada é recusado: a chave de acesso só aparece na criação, e a
     * primeira ficaria inacessível.
     */
    criarSubcontaAsaas: async (input: CriarSubcontaAsaasInput): Promise<CompanyPaymentAccount> =>
      (
        await apiClient.request<ApiEnvelope<CompanyPaymentAccount>>(
          "/family-billing/conta-de-recebimento/subconta",
          { method: "POST", body: input },
        )
      ).data,

    // --- Admin Rotta ---

    /** A conta de recebimento de uma transportadora, pelo painel do Admin. */
    getContaDeRecebimentoDaEmpresa: async (
      companyId: string,
    ): Promise<CompanyPaymentAccount | null> =>
      (
        await apiClient.request<ApiEnvelope<CompanyPaymentAccount | null>>(
          `/family-billing/admin/companies/${companyId}/conta-de-recebimento`,
        )
      ).data,

    /** O mesmo que `criarSubcontaAsaas`, mas PELA transportadora, do painel do Admin. */
    criarSubcontaAsaasParaEmpresa: async (
      companyId: string,
      input: CriarSubcontaAsaasInput,
    ): Promise<CompanyPaymentAccount> =>
      (
        await apiClient.request<ApiEnvelope<CompanyPaymentAccount>>(
          `/family-billing/admin/companies/${companyId}/subconta`,
          { method: "POST", body: input },
        )
      ).data,
  };
}
