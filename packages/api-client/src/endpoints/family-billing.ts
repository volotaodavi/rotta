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
 * A resposta de "para onde vai o dinheiro desta transportadora".
 *
 * `conta` é nula quando ela ainda não tem conta de recebimento, que é o
 * estado de quase toda transportadora — e justamente quem mais precisa
 * de resposta. `dadosParaAbrirConta` é o que já temos para abrir uma,
 * para a tela poder montar o convite em vez de só dizer "não tem".
 */
export interface ContaDeRecebimentoComConvite {
  conta: CompanyPaymentAccount | null;
  /** Presente enquanto não há subconta criada. */
  dadosParaAbrirConta?: DadosParaAbrirConta;
}

/**
 * O que a Rotta já sabe e vai mandar ao provedor quando a conta for
 * aberta.
 *
 * Existe para a tela mostrar, em vez de deixar implícito: o formulário
 * pede um campo porque os outros oito obrigatórios já estão no cadastro,
 * e um formulário de um campo parece incompleto se a pessoa não vê o
 * resto indo.
 */
export interface DadosParaAbrirConta {
  /** Vai como nome do titular: é a razão social, porque tem que bater com o documento. */
  razaoSocial: string;
  cpfCnpj: string;
  email: string;
  telefone: string;
  /** Uma linha, já escrita. */
  endereco: string;
  cep: string;
  /** `FISICA` para transportador autônomo. Muda o que o provedor pede na análise. */
  tipoDePessoa: "JURIDICA" | "FISICA";
  /** O que o formulário ainda pergunta, em linguagem de tela. */
  faltando: string[];
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

/**
 * O formulário que liga a cobrança mensal automática de um contrato.
 *
 * Tão pouco campo porque o contrato já diz quem é o aluno, quem paga,
 * quanto é a mensalidade e até quando vale a vigência.
 */
export interface CriarAssinaturaDaFamiliaInput {
  /**
   * CPF de quem paga, obrigatório só quando o responsável ainda não tem
   * CPF no cadastro — e a Rotta não pede CPF de responsável desde
   * 14/09/2026. O provedor de pagamento exige o documento do pagador.
   */
  cpfDoResponsavel?: string;
  /** Dia do vencimento de cada mês. Em branco, dia 5. Máximo 28. */
  diaDeVencimento?: number;
  /** `UNDEFINED` deixa a família escolher na página da cobrança. */
  meioDePagamento?: "PIX" | "BOLETO" | "UNDEFINED";
}

/**
 * Os controles do recebimento de uma transportadora, do painel do Admin.
 *
 * Tudo opcional: só o que vai no corpo muda. As três são decisões do
 * fundador — taxa é preço, o emissor decide quem responde por chargeback
 * de até 540 dias, e a custódia tem tarifa recorrente por subconta
 * ligada.
 */
export interface ConfigurarRecebimentoInput {
  /** Pontos-base (1% = 100). Tabela aprovada em 20/10/2026: 129, 129, 99, 49. */
  taxaPixBps?: number;
  taxaBoletoBps?: number;
  taxaCreditoVistaBps?: number;
  taxaCreditoParceladoBps?: number;
  emissorDaCobranca?: "ROTTA" | "SUBCONTA";
  custodia?: {
    ativa: boolean;
    diasParaLiberar?: number;
    tarifaPagaPor?: "CONTA_PRINCIPAL" | "SUBCONTA";
  };
}

/**
 * Uma linha da tela de cobrança mensal da transportadora.
 *
 * O CPF de quem paga não vem nesta resposta: `precisaDeCpf` diz apenas
 * se o formulário vai ter que pedir.
 */
export interface ContratoParaCobrar {
  contractId: string;
  alunoNome: string;
  responsavelNome: string;
  responsavelTelefone: string;
  valorCentavos: number;
  valorFormatado: string;
  statusDoContrato: string;
  vigenciaFim: string | null;
  cobrancaMensalAtiva: boolean;
  statusDaAssinatura: string | null;
  precisaDeCpf: boolean;
  /** O que impede ligar agora, em uma frase. `null` quando dá para ligar. */
  impedimento: string | null;
}

export interface AssinaturaDaFamilia {
  contractId: string;
  asaasSubscriptionId: string;
  status: string;
  meioDePagamento: string;
  valorCentavos: number;
  valorFormatado: string;
  primeiroVencimento: string;
  /** `null` em contrato sem fim de vigência combinado. */
  ultimoVencimento: string | null;
  /** `true` quando o dinheiro cai direto na conta da transportadora, por split. */
  repasseDiretoAoTransportador: boolean;
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

    /**
     * Abre o boleto de uma fatura. Reaproveita a cobrança já criada,
     * inclusive a que a assinatura gerou.
     *
     * `linhaDigitavel` pode voltar `null` na primeira abertura: o
     * registro bancário é assíncrono do lado do provedor. Nesse caso use
     * `linkDaFatura`, que funciona sempre, e a linha aparece depois.
     */
    abrirPagamentoBoleto: async (invoiceId: string): Promise<PagamentoDaFatura> =>
      (
        await apiClient.request<ApiEnvelope<PagamentoDaFatura>>(
          `/family-billing/invoices/${invoiceId}/pagamento-boleto`,
          { method: "POST" },
        )
      ).data,

    /**
     * Os contratos da transportadora com o estado da cobrança mensal —
     * a tela em que ela liga a recorrência das famílias já cadastradas.
     */
    listarContratosParaCobrar: async (): Promise<ContratoParaCobrar[]> =>
      (await apiClient.request<ApiEnvelope<ContratoParaCobrar[]>>("/family-billing/contracts"))
        .data,

    /**
     * Liga a cobrança mensal automática de um contrato: a partir daí o
     * provedor gera a cobrança de cada mês sozinho, com o split já
     * aplicado, e a família paga pelo link — sem precisar de conta.
     *
     * Recusado quando o contrato já tem recorrência, quando não está
     * ativo, e quando a mensalidade está em R$ 0,00.
     */
    criarAssinaturaDoContrato: async (
      contractId: string,
      input: CriarAssinaturaDaFamiliaInput,
    ): Promise<AssinaturaDaFamilia> =>
      (
        await apiClient.request<ApiEnvelope<AssinaturaDaFamilia>>(
          `/family-billing/contracts/${contractId}/assinatura`,
          { method: "POST", body: input },
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

    getContaDeRecebimento: async (): Promise<ContaDeRecebimentoComConvite> =>
      (
        await apiClient.request<ApiEnvelope<ContaDeRecebimentoComConvite>>(
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
    ): Promise<ContaDeRecebimentoComConvite> =>
      (
        await apiClient.request<ApiEnvelope<ContaDeRecebimentoComConvite>>(
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

    /**
     * Taxa por meio, emissor da cobrança e custódia de uma
     * transportadora. Só Admin Rotta.
     *
     * Tudo opcional: só o que vai no corpo muda. Virar o emissor para
     * `SUBCONTA` exige a chave da subconta guardada e a conta já
     * aprovada; ligar custódia exige emissor `SUBCONTA`, porque a
     * retenção segue a conta que recebe.
     */
    configurarRecebimentoDaEmpresa: async (
      companyId: string,
      input: ConfigurarRecebimentoInput,
    ): Promise<CompanyPaymentAccount> =>
      (
        await apiClient.request<ApiEnvelope<CompanyPaymentAccount>>(
          `/family-billing/admin/companies/${companyId}/recebimento`,
          { method: "PUT", body: input },
        )
      ).data,

    /** O mesmo que `criarAssinaturaDoContrato`, pelo painel do Admin. */
    criarAssinaturaParaContrato: async (
      contractId: string,
      input: CriarAssinaturaDaFamiliaInput,
    ): Promise<AssinaturaDaFamilia> =>
      (
        await apiClient.request<ApiEnvelope<AssinaturaDaFamilia>>(
          `/family-billing/admin/contracts/${contractId}/assinatura`,
          { method: "POST", body: input },
        )
      ).data,
  };
}
