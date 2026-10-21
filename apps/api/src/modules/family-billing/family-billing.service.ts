import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { ConfigType } from "@nestjs/config";
import { formatarCentavos } from "@rotta/utils";

import {
  COMPANY_PAYMENT_ACCOUNT_REPOSITORY,
  CONTRACT_INVOICE_REPOSITORY,
  DIA_DE_VENCIMENTO_PADRAO,
  FAMILY_CONTRACT_ID_PREFIX,
  FAMILY_INVOICE_ID_PREFIX,
} from "./family-billing.constants";
import {
  toContaDeRecebimentoResponse,
  toDadosParaAbrirConta,
  type ContaDeRecebimentoComConviteResponse,
  type ContaDeRecebimentoResponse,
} from "./mappers/company-payment-account.mapper";
import {
  FATURA_EM_ABERTO,
  toContractInvoiceResponseDto,
  toListContractInvoicesResponseDto,
  toResumoDeFaturas,
} from "./mappers/contract-invoice.mapper";

import type {
  ListContractInvoicesResponseDto,
  PagamentoDaFaturaResponseDto,
  PagamentosDoResponsavelResponseDto,
} from "./dto/contract-invoice-response.dto";
import type {
  CompanyPaymentAccountRepository,
  UpsertCompanyPaymentAccountData,
} from "./repositories/company-payment-account.repository";
import type {
  ContractInvoiceComContexto,
  ContractInvoiceRepository,
} from "./repositories/contract-invoice.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AsaasCompanyType } from "@/modules/billing/types/asaas.types";
import type {
  CompanyPaymentAccount,
  CompanyPaymentAccountStatus,
  CompanyType,
  ContractInvoiceStatus,
  InvoicePaymentMethod,
} from "@prisma/client";

import asaasConfig from "@/config/asaas.config";
import { AsaasClientService } from "@/modules/billing/asaas-client.service";
import { AsaasSubcontasService } from "@/modules/billing/asaas-subcontas.service";
import { CompaniesService } from "@/modules/companies/companies.service";
import { StudentsService } from "@/modules/students/students.service";
import { UsersService } from "@/modules/users/users.service";
import { WalletService } from "@/modules/wallet/wallet.service";
import { Role } from "@/shared/enums";

export interface ResultadoDaGeracao {
  competencia: string;
  contratosAvaliados: number;
  faturasCriadas: number;
  falhas: number;
}

/**
 * O que o formulário de subconta traz. Tudo opcional menos o
 * faturamento: o resto vem do cadastro da transportadora.
 */
export interface DadosDaSubconta {
  faturamentoMensalCentavos: number;
  email?: string;
  telefone?: string;
}

/** O que o formulário de cobrança mensal automática traz. */
export interface DadosDaAssinaturaDaFamilia {
  /**
   * CPF do Responsável, obrigatório quando ele ainda não tem um no
   * cadastro — e desde 14/09/2026 nenhum Responsável novo tem. O Asaas
   * exige `cpfCnpj` para criar o cliente da cobrança, então sem este
   * número não existe cobrança para essa família.
   */
  cpfDoResponsavel?: string;
  /** Dia do vencimento. `DIA_DE_VENCIMENTO_PADRAO` quando não vem. */
  diaDeVencimento?: number;
  /**
   * `PIX` (padrão), `BOLETO`, ou `UNDEFINED` para o pagador escolher na
   * página da cobrança.
   */
  meioDePagamento?: "PIX" | "BOLETO" | "UNDEFINED";
}

/**
 * As quatro taxas configuráveis, numa lista só.
 *
 * Existe para o laço que as aplica não precisar de quatro blocos iguais
 * — e para que uma taxa nova no schema apareça aqui, e não seja
 * esquecida em um dos quatro.
 */
const TAXAS_CONFIGURAVEIS = [
  "taxaPixBps",
  "taxaBoletoBps",
  "taxaCreditoVistaBps",
  "taxaCreditoParceladoBps",
] as const;

export interface ConfigurarRecebimentoDados {
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

/** Uma linha da tela de cobrança mensal. Sem CPF: ver `listarContratosParaCobrar`. */
export interface ContratoParaCobrarResponse {
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
  /** `true` quando o formulário vai precisar pedir o CPF de quem paga. */
  precisaDeCpf: boolean;
  /** O que impede ligar agora, em uma frase. `null` quando dá para ligar. */
  impedimento: string | null;
}

export interface AssinaturaDaFamiliaResponse {
  contractId: string;
  asaasSubscriptionId: string;
  status: string;
  meioDePagamento: string;
  valorCentavos: number;
  valorFormatado: string;
  primeiroVencimento: string;
  /** `null` em contrato sem fim de vigência combinado. */
  ultimoVencimento: string | null;
  repasseDiretoAoTransportador: boolean;
}

/**
 * `accountStatus.general` do Asaas traduzido para o estado da conta de
 * recebimento.
 *
 * Os quatro valores vêm da documentação de eventos de situação da conta,
 * conferida em 20/10/2026: `APPROVED`, `AWAITING_APPROVAL`, `PENDING` e
 * `REJECTED`.
 *
 * `PENDING` e `AWAITING_APPROVAL` caem no mesmo `EM_ANALISE` de
 * propósito. A diferença entre eles é de quem está esperando quem — num
 * cadastro que a Rotta preencheu inteiro, pelos dados que já tinha, não
 * há ação do transportador que os distinga, e inventar dois estados na
 * tela seria fingir uma escolha que ele não tem.
 */
const SITUACAO_GERAL_DA_SUBCONTA: Record<string, CompanyPaymentAccountStatus | undefined> = {
  APPROVED: "ATIVA",
  AWAITING_APPROVAL: "EM_ANALISE",
  PENDING: "EM_ANALISE",
  REJECTED: "RECUSADA",
};

/**
 * O tipo de empresa da Rotta traduzido para o do Asaas.
 *
 * O Asaas aceita quatro valores, e **só quando o titular é pessoa
 * jurídica** (`AccountSaveRequestDTO`, conferido em 20/10/2026). Em CPF
 * o campo não vai, e é por isso que `AUTONOMO` mapeia para `undefined`
 * em vez de para algum valor parecido.
 *
 * `SOCIEDADE_SIMPLES` e `OUTRO` caem em `LIMITED` porque é o que mais se
 * aproxima de uma sociedade comum, e `COOPERATIVA` em `ASSOCIATION`.
 * Nenhum dos dois é exato; errar para o mais próximo é melhor que
 * omitir um campo que o Asaas pede de PJ.
 */
const TIPO_DE_EMPRESA_NO_ASAAS: Record<CompanyType, AsaasCompanyType | undefined> = {
  AUTONOMO: undefined,
  MEI: "MEI",
  LTDA: "LIMITED",
  SA: "LIMITED",
  COOPERATIVA: "ASSOCIATION",
  SOCIEDADE_SIMPLES: "LIMITED",
  OUTRO: "LIMITED",
};

/**
 * Primeiro dia do mês, em UTC — a chave de competência. UTC de
 * propósito: a coluna é `@db.Date` e o mês de competência não pode
 * mudar porque o servidor está em outro fuso.
 */
export function competenciaDe(data: Date): Date {
  return new Date(Date.UTC(data.getUTCFullYear(), data.getUTCMonth(), 1));
}

/**
 * O vencimento de uma competência. `dia` é limitado ao último dia do
 * mês: dia 31 em fevereiro não existe, e `new Date(2026, 1, 31)`
 * silenciosamente vira 3 de março.
 */
export function vencimentoDe(competencia: Date, dia: number): Date {
  const ultimoDia = new Date(
    Date.UTC(competencia.getUTCFullYear(), competencia.getUTCMonth() + 1, 0),
  ).getUTCDate();
  return new Date(
    Date.UTC(competencia.getUTCFullYear(), competencia.getUTCMonth(), Math.min(dia, ultimoDia)),
  );
}

/**
 * A mensalidade do transporte: o Responsável paga a TRANSPORTADORA.
 *
 * ## O que é, e o que não é
 *
 * Não é o `BillingService`. Lá a Rotta cobra a transportadora pela
 * plataforma. Aqui a transportadora cobra a família pelo transporte.
 * Pagador, recebedor e ciclo são diferentes, e o único pedaço
 * compartilhado é o cliente HTTP da Asaas (`AsaasClientService`), de
 * propósito: mesma chave, mesmo tratamento de erro, mesmo registro de
 * saúde da integração.
 *
 * O Rotta Pay (`WalletService`) é do TRANSPORTADOR — autônomo, MEI ou
 * empresa. É onde ele vê o que entrou e pede saque. O Responsável nunca
 * tem carteira: ele vê quanto deve, quando vence e como pagar.
 *
 * ## O que já funciona e o que espera a Asaas
 *
 * Funciona hoje, sem depender de nada externo: a fatura mensal (geração
 * idempotente por competência), o estado dela (a vencer, vencida, paga),
 * a tela do Responsável, as contas a receber da transportadora, e o
 * crédito no Rotta Pay quando um pagamento é confirmado.
 *
 * Espera a Asaas em dois pontos, os dois explícitos no código em vez de
 * fingidos:
 *
 * 1. `abrirPagamento` precisa de `ASAAS_API_KEY`. Sem ela, a API diz
 *    que o pagamento pelo app ainda não está disponível — e a tela
 *    continua mostrando valor e vencimento, porque esse dado é nosso e
 *    não depende de provedor nenhum.
 * 2. O split depende de `CompanyPaymentAccount.asaasWalletId`, a
 *    subconta do transportador, que depende do comercial/white label da
 *    Asaas. Com ela preenchida, a cobrança sai com split e o dinheiro
 *    cai direto na conta dele. Sem ela, cai na conta da Rotta e vira
 *    crédito no Rotta Pay — e cada fatura registra qual dos dois
 *    caminhos aconteceu (`repasseDiretoAoTransportador`), para a
 *    conciliação nunca ter que adivinhar.
 */
@Injectable()
export class FamilyBillingService {
  private readonly logger = new Logger(FamilyBillingService.name);

  constructor(
    @Inject(CONTRACT_INVOICE_REPOSITORY)
    private readonly invoiceRepository: ContractInvoiceRepository,
    @Inject(COMPANY_PAYMENT_ACCOUNT_REPOSITORY)
    private readonly paymentAccountRepository: CompanyPaymentAccountRepository,
    private readonly asaasClient: AsaasClientService,
    private readonly subcontas: AsaasSubcontasService,
    @Inject(asaasConfig.KEY)
    private readonly config: ConfigType<typeof asaasConfig>,
    private readonly studentsService: StudentsService,
    private readonly usersService: UsersService,
    private readonly walletService: WalletService,
    /* Só para a subconta: é de `Company` que saem razão social,
       documento e endereço do titular, e é `CompaniesService` que decide
       se este ator pode mexer nesta empresa. */
    private readonly companiesService: CompaniesService,
  ) {}

  // ---------------------------------------------------------------------
  // Geração mensal
  // ---------------------------------------------------------------------

  /**
   * Emite a fatura do mês para todo contrato ATIVO com mensalidade
   * acima de zero.
   *
   * Idempotente pelo banco, não pela lógica: `@@unique([contractId,
   * competencia])`. Rodar duas vezes no mesmo mês não cria fatura
   * dobrada nem precisa de trava distribuída, e uma falha no meio não
   * deixa o mês pela metade — a próxima execução completa o que faltou.
   *
   * Contrato com mensalidade zero é pulado de propósito: os contratos
   * que existem hoje estão todos em R$ 0,00 (valor nunca foi negociado
   * de verdade no produto), e emitir fatura de zero real seria mandar a
   * família pagar nada.
   */
  async gerarFaturasDaCompetencia(referencia = new Date()): Promise<ResultadoDaGeracao> {
    const competencia = competenciaDe(referencia);
    const vencimento = vencimentoDe(competencia, DIA_DE_VENCIMENTO_PADRAO);

    const contratos = await this.invoiceRepository.listContratosSemFaturaAcrossTenants(competencia);

    let criadas = 0;
    let falhas = 0;

    for (const contrato of contratos) {
      try {
        await this.invoiceRepository.create({
          companyId: contrato.companyId,
          contractId: contrato.id,
          studentId: contrato.studentId,
          responsavelId: contrato.responsavelId,
          competencia,
          vencimento,
          valorCentavos: contrato.valorMensalidadeCentavos,
        });
        criadas += 1;
      } catch (error) {
        /* Uma fatura que falhou não pode impedir as outras: são famílias
           diferentes, e a próxima execução tenta de novo. */
        falhas += 1;
        this.logger.warn(
          `Falha ao emitir a fatura do contrato ${contrato.id} na competencia ${competencia.toISOString().slice(0, 10)}`,
        );
        this.logger.warn(error instanceof Error ? error.message : String(error));
      }
    }

    return {
      competencia: competencia.toISOString().slice(0, 10),
      contratosAvaliados: contratos.length,
      faturasCriadas: criadas,
      falhas,
    };
  }

  /** Vira `A_VENCER` em `VENCIDA` quando o dia passou — roda junto da geração. */
  async marcarFaturasVencidas(hoje = new Date()): Promise<number> {
    const inicioDoDia = new Date(
      Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()),
    );
    return this.invoiceRepository.marcarVencidasAcrossTenants(inicioDoDia);
  }

  // ---------------------------------------------------------------------
  // Leitura: Responsável
  // ---------------------------------------------------------------------

  /**
   * A tela de Pagamentos do Responsável.
   *
   * O caminho começa no aluno e passa por `StudentsService.
   * findByIdOrThrow`, que é quem prova a posse — mesmo padrão de
   * `TripsService.findEtaForStudent`. Um responsável nunca pede a
   * fatura por id de fatura ou de contrato.
   */
  async getPagamentosDoAluno(
    studentId: string,
    actor: AuthenticatedUser,
  ): Promise<PagamentosDoResponsavelResponseDto> {
    const aluno = await this.studentsService.findByIdOrThrow(studentId, actor);
    const faturas = await this.invoiceRepository.listByStudentAcrossTenants(studentId);

    const emAberto = faturas.filter((fatura) => FATURA_EM_ABERTO.includes(fatura.status));
    const totalEmAbertoCentavos = emAberto.reduce((soma, f) => soma + f.valorCentavos, 0);

    return {
      studentId,
      alunoNome: aluno.nome,
      resumo: toResumoDeFaturas(faturas),
      faturas: faturas.map(toContractInvoiceResponseDto),
      totalEmAbertoCentavos,
      totalEmAbertoFormatado:
        totalEmAbertoCentavos > 0 ? formatarCentavos(totalEmAbertoCentavos) : null,
      pagamentoNoAppDisponivel: this.asaasClient.isConfigured(),
    };
  }

  // ---------------------------------------------------------------------
  // Leitura: transportadora
  // ---------------------------------------------------------------------

  /** As contas a receber da transportadora — o outro lado da mesma fatura. */
  async listarFaturasDaEmpresa(
    actor: AuthenticatedUser,
    filtros: { status?: ContractInvoiceStatus; competencia?: string },
    page: number,
    pageSize: number,
  ): Promise<ListContractInvoicesResponseDto> {
    const companyId = this.companyIdDoAtor(actor);
    const resultado = await this.invoiceRepository.list({
      companyId,
      status: filtros.status,
      competencia: filtros.competencia
        ? competenciaDe(new Date(`${filtros.competencia}T00:00:00.000Z`))
        : undefined,
      page,
      pageSize,
    });
    return toListContractInvoicesResponseDto(resultado, page, pageSize);
  }

  // ---------------------------------------------------------------------
  // Pagamento
  // ---------------------------------------------------------------------

  /**
   * Abre (ou reaproveita) a cobrança Pix de uma fatura e devolve o que
   * a família copia, lê ou escaneia.
   *
   * Reaproveita de propósito: duas tentativas de pagar a mesma fatura
   * não podem gerar duas cobranças na Asaas, ou a família paga duas
   * vezes. `asaasPaymentId` guardado na fatura é a trava.
   *
   * Cartão continua de fora. Exigiria o número passando pelo nosso
   * servidor (a Asaas confirmou em 16/10/2026 que não há SDK mobile nem
   * tokenização pelo front), o que colocaria a Rotta em escopo PCI DSS
   * — uma decisão que não é técnica e não foi tomada.
   */
  async abrirPagamentoPix(
    invoiceId: string,
    actor: AuthenticatedUser,
  ): Promise<PagamentoDaFaturaResponseDto> {
    const fatura = await this.faturaParaPagar(invoiceId, actor);

    const asaasPaymentId = fatura.asaasPaymentId ?? (await this.criarCobranca(fatura, "PIX"));
    const qrCode = await this.asaasClient.getPixQrCode(asaasPaymentId);

    return {
      invoiceId: fatura.id,
      meioDePagamento: "PIX",
      valorCentavos: fatura.valorCentavos,
      valorFormatado: formatarCentavos(fatura.valorCentavos),
      pixPayload: qrCode.payload,
      pixQrCodeBase64: qrCode.encodedImage,
      pixExpiraEm: qrCode.expirationDate,
      linhaDigitavel: null,
      linkDaFatura: fatura.linkDaFatura,
      status: fatura.status,
    };
  }

  /**
   * Abre (ou reaproveita) o boleto de uma fatura e devolve a linha
   * digitável e o PDF.
   *
   * ## Por que o boleto existe
   *
   * Nem toda família usa Pix, e o boleto é o meio que funciona sem
   * aplicativo de banco: dá para pagar na lotérica, no caixa, com
   * dinheiro. Num produto cuja família pode não ter conta em lugar
   * nenhum, esse é o caminho que não exclui ninguém.
   *
   * ## A linha digitável nem sempre vem na hora
   *
   * O Asaas registra o boleto no banco de forma assíncrona. Quando a
   * resposta da criação não traz `identificationField`, isto não inventa
   * nada: devolve o link da fatura hospedada, que funciona sempre, e a
   * linha digitável aparece na próxima abertura.
   */
  async abrirPagamentoBoleto(
    invoiceId: string,
    actor: AuthenticatedUser,
  ): Promise<PagamentoDaFaturaResponseDto> {
    const fatura = await this.faturaParaPagar(invoiceId, actor);

    const asaasPaymentId = fatura.asaasPaymentId ?? (await this.criarCobranca(fatura, "BOLETO"));

    /* A fatura em memória pode ser de antes da criação da cobrança, e a
       cobrança que já existia pode ter sido criada pela assinatura (ou
       num dia em que o registro bancário ainda não tinha saído). Em
       todos esses casos a verdade da linha digitável está no provedor. */
    const cobranca = await this.asaasClient.getPayment(asaasPaymentId);
    const linhaDigitavel = cobranca.identificationField ?? fatura.linhaDigitavel ?? null;
    const linkDaFatura = cobranca.bankSlipUrl ?? cobranca.invoiceUrl ?? fatura.linkDaFatura ?? null;

    /* Guarda o que voltou, para a próxima abertura e para a tela de
       faturas não precisarem de outra chamada ao Asaas. */
    if (linhaDigitavel && linhaDigitavel !== fatura.linhaDigitavel) {
      await this.invoiceRepository.update(fatura.id, { linhaDigitavel, linkDaFatura });
    }

    return {
      invoiceId: fatura.id,
      meioDePagamento: "BOLETO",
      valorCentavos: fatura.valorCentavos,
      valorFormatado: formatarCentavos(fatura.valorCentavos),
      pixPayload: null,
      pixQrCodeBase64: null,
      pixExpiraEm: null,
      linhaDigitavel,
      linkDaFatura,
      status: fatura.status,
    };
  }

  /**
   * As checagens que valem para qualquer meio de pagamento: a fatura
   * existe, é desta família, ainda pode ser paga, e a Asaas está
   * configurada.
   *
   * Existe separado porque errar uma delas em um dos meios e não no
   * outro é o tipo de diferença que ninguém nota até alguém pagar a
   * fatura de outra pessoa.
   */
  private async faturaParaPagar(
    invoiceId: string,
    actor: AuthenticatedUser,
  ): Promise<ContractInvoiceComContexto> {
    const fatura = await this.invoiceRepository.findByIdAcrossTenants(invoiceId);
    if (!fatura) throw new NotFoundException("Fatura não encontrada.");

    /* A posse é checada pelo ALUNO da fatura, não pelo id dela: é a
       mesma prova usada na leitura, e é o que impede um responsável de
       abrir a cobrança da fatura de outra família. */
    await this.studentsService.findByIdOrThrow(fatura.studentId, actor);

    if (fatura.status === "PAGA") {
      throw new BadRequestException("Esta fatura já está paga.");
    }
    if (fatura.status === "CANCELADA" || fatura.status === "ESTORNADA") {
      throw new BadRequestException("Esta fatura não pode mais ser paga.");
    }
    if (!this.asaasClient.isConfigured()) {
      throw new BadRequestException(
        "Pagamento pelo app ainda não disponível: combine a mensalidade direto com a transportadora.",
      );
    }

    return fatura;
  }

  /**
   * Cria a cobrança na Asaas e grava o vínculo na fatura.
   *
   * O cliente da cobrança é o RESPONSÁVEL (a família é quem paga), não
   * a transportadora — por isso o `AsaasCustomer` é buscado pelo CPF
   * dele e reaproveitado quando já existe.
   */
  private async criarCobranca(
    fatura: {
      id: string;
      companyId: string;
      responsavelId: string;
      valorCentavos: number;
      vencimento: Date;
      asaasCustomerId: string | null;
      company: { nomeFantasia: string };
    },
    meio: "PIX" | "BOLETO",
  ): Promise<string> {
    const customerId =
      fatura.asaasCustomerId ?? (await this.resolverClienteAsaas(fatura.responsavelId));

    const conta = await this.paymentAccountRepository.findByCompanyIdAcrossTenants(
      fatura.companyId,
    );

    /*
      O split e o emissor andam juntos, e a ordem importa.

      Quando a transportadora tem subconta e `emissorDaCobranca` é
      `SUBCONTA`, a cobrança é criada COM A CHAVE DELA: é o único jeito
      de a custódia valer, porque a documentação de conta escrow diz que
      só as subcontas habilitadas têm os próprios recebimentos retidos.
      Nesse caso o split manda a nossa taxa para a Rotta.

      Quando o emissor é `ROTTA` (o padrão, e o que funciona sem
      depender da liberação de white label pelo comercial do Asaas), a
      cobrança é da conta principal e o split manda para a subconta o
      que sobra depois da nossa taxa.
    */
    /* O percentual da Rotta é por MEIO de pagamento (tabela do CFO de
       18/10: Pix e boleto 1,29%), então o meio precisa chegar até aqui.
       Antes era "PIX" fixo, e um boleto sairia com a taxa do Pix. */
    const split = this.subcontas.montarSplit(conta, meio, this.config.rottaWalletId);
    const emitirPelaSubconta = conta?.emissorDaCobranca === "SUBCONTA";
    const chaveDaSubconta = emitirPelaSubconta
      ? this.subcontas.chaveDaSubconta(
          conta,
          `emitir a cobranca ${meio} da fatura ${fatura.id} em nome da subconta`,
        )
      : undefined;

    const payment = await this.asaasClient.createPayment(
      {
        customer: customerId,
        billingType: meio,
        value: fatura.valorCentavos / 100,
        dueDate: fatura.vencimento.toISOString().slice(0, 10),
        description: `Transporte escolar, ${fatura.company.nomeFantasia}`,
        /* O prefixo é o que diz ao webhook de que fluxo este pagamento é
           (ver `FAMILY_INVOICE_ID_PREFIX`). */
        externalReference: `${FAMILY_INVOICE_ID_PREFIX}${fatura.id}`,
        split,
      },
      chaveDaSubconta,
    );

    await this.invoiceRepository.update(fatura.id, {
      asaasPaymentId: payment.id,
      asaasCustomerId: customerId,
      meioDePagamento: meio,
      linkDaFatura: payment.invoiceUrl ?? null,
      /* Só o boleto tem linha digitável, e ela pode não vir na criação:
         o registro bancário é assíncrono do lado do Asaas. */
      linhaDigitavel: payment.identificationField ?? null,
      /* Registrado na criação, não na confirmação: é no momento de criar
         a cobrança que o split existe ou não existe. */
      repasseDiretoAoTransportador: Boolean(conta?.asaasWalletId),
    });

    if (!conta?.asaasWalletId) {
      this.logger.log(
        `Fatura ${fatura.id}: cobranca criada SEM split (a transportadora ${fatura.companyId} ainda nao tem subconta Asaas). O valor cai na conta da Rotta e e creditado no Rotta Pay dela.`,
      );
    }

    return payment.id;
  }

  /**
   * O `AsaasCustomer` do responsável — reaproveitado pelo CPF, nunca
   * duplicado.
   *
   * ## O CPF é o único bloqueio real da cobrança da família
   *
   * O Asaas exige `name` e `cpfCnpj` para criar um cliente
   * (`CustomerSaveRequestDTO`, conferido na referência em 21/10/2026).
   * E desde 14/09/2026, por decisão do fundador, a Rotta **não coleta
   * CPF de Responsável** no cadastro: "para os responsáveis não pegamos
   * esses dados, apenas o nome e telefone".
   *
   * Então quem chega aqui sem CPF não tem como ser cobrado por nenhum
   * caminho. `cpfInformado` é a saída: quem está criando a cobrança
   * (transportadora, que tem o contrato em mãos, ou o Admin Rotta)
   * informa o número, ele é gravado no cadastro e serve da próxima vez.
   *
   * O celular vai junto porque é por ele que o Asaas avisa a família da
   * cobrança — e uma família sem conta na Rotta depende desse aviso.
   */
  private async resolverClienteAsaas(
    responsavelId: string,
    opcoes?: { cpfInformado?: string },
  ): Promise<string> {
    let responsavel = await this.usersService.findById(responsavelId);
    if (!responsavel) {
      throw new NotFoundException("Responsável da fatura não encontrado.");
    }

    if (!responsavel.cpf && opcoes?.cpfInformado) {
      responsavel = await this.usersService.registrarCpfDoResponsavel(
        responsavelId,
        opcoes.cpfInformado,
      );
    }

    if (!responsavel.cpf) {
      throw new BadRequestException(
        `Falta o CPF de ${responsavel.nome} para a cobrança ser emitida. O provedor de pagamento exige o documento de quem paga, e a Rotta não pede CPF de responsável no cadastro.`,
      );
    }

    const existente = await this.asaasClient.findCustomerByCpfCnpj(responsavel.cpf);
    if (existente) return existente.id;

    const criado = await this.asaasClient.createCustomer({
      name: responsavel.nome,
      cpfCnpj: responsavel.cpf,
      email: responsavel.email,
      mobilePhone: responsavel.telefone,
      externalReference: responsavel.id,
    });
    return criado.id;
  }

  /**
   * O webhook da Asaas confirmou o pagamento de uma fatura da família.
   *
   * Idempotente: fatura já `PAGA` sai sem fazer nada. A Asaas reentrega
   * webhook, e creditar duas vezes a carteira de um transportador é o
   * tipo de erro que só aparece no dia do saque.
   */
  async confirmarPagamento(input: {
    asaasPaymentId: string;
    valorPagoCentavos: number;
    taxaDoProvedorCentavos: number | null;
    pagoEm: Date;
  }): Promise<void> {
    const fatura = await this.invoiceRepository.findByAsaasPaymentIdAcrossTenants(
      input.asaasPaymentId,
    );
    if (!fatura) {
      this.logger.warn(
        `Webhook Asaas de fatura da familia sem fatura correspondente (asaasPaymentId ${input.asaasPaymentId}).`,
      );
      return;
    }
    if (fatura.status === "PAGA") {
      this.logger.debug(`Fatura ${fatura.id} ja estava paga: webhook reentregue, nada a fazer.`);
      return;
    }

    const repasseCentavos = input.valorPagoCentavos - (input.taxaDoProvedorCentavos ?? 0);

    /* `updateAcrossTenants`, e nao `update`: quem chama isto e o webhook
       da Asaas, que entra por rota `@Public()` e por isso nao tem
       contexto de tenant. Com `update`, a politica de RLS de
       `contract_invoices` seria falsa para toda linha, a escrita
       levantaria erro e o webhook responderia 500 -- e quinze
       respostas nao-200 seguidas pausam a fila inteira. Ver a nota do
       metodo no repositorio. */
    await this.invoiceRepository.updateAcrossTenants(fatura.id, {
      status: "PAGA",
      pagoEm: input.pagoEm,
      valorPagoCentavos: input.valorPagoCentavos,
      taxaDoProvedorCentavos: input.taxaDoProvedorCentavos,
      repasseCentavos,
    });

    if (fatura.repasseDiretoAoTransportador) {
      /* Split ativo: o dinheiro nunca passou pela conta da Rotta, então
         não há nada a repassar. Creditar a carteira aqui mostraria à
         transportadora um saldo a sacar que ela já recebeu. */
      this.logger.log(
        `Fatura ${fatura.id} paga com split: valor foi direto para a conta Asaas da transportadora, sem credito no Rotta Pay.`,
      );
      return;
    }

    await this.walletService.creditarRecebimentoDeFatura({
      companyId: fatura.companyId,
      contractId: fatura.contractId,
      contractInvoiceId: fatura.id,
      valorCentavos: repasseCentavos,
      descricao: `Mensalidade recebida da familia (fatura ${fatura.id})`,
    });
  }

  /** Pagamento estornado pela Asaas — a fatura volta a existir como `ESTORNADA`, nunca é apagada. */
  async registrarEstorno(asaasPaymentId: string): Promise<void> {
    const fatura = await this.invoiceRepository.findByAsaasPaymentIdAcrossTenants(asaasPaymentId);
    if (!fatura) return;
    /* `updateAcrossTenants` pelo mesmo motivo de `confirmarPagamento`:
       chamado pelo webhook, que nao tem contexto de tenant. */
    await this.invoiceRepository.updateAcrossTenants(fatura.id, { status: "ESTORNADA" });
    this.logger.warn(
      `Fatura ${fatura.id} estornada na Asaas. O credito correspondente no Rotta Pay, se houver, precisa de ajuste manual (Admin Rotta) -- estorno automatico de carteira nao esta implementado.`,
    );
  }

  // ---------------------------------------------------------------------
  // Conta de recebimento do transportador
  // ---------------------------------------------------------------------

  /**
   * Passa pelo mapeador, e não devolve a linha do banco.
   *
   * Desde 20/10/2026 a tabela guarda `asaasApiKeyCifrada`, a chave de
   * API da subconta do transportador. Entregar o objeto cru punha essa
   * chave na resposta HTTP, contra o compromisso de "nunca em log nem
   * em resposta de API" assumido quando o fundador autorizou guardá-la.
   */
  async getContaDeRecebimento(
    actor: AuthenticatedUser,
  ): Promise<ContaDeRecebimentoComConviteResponse> {
    return this.contaComConvite(this.companyIdDoAtor(actor), actor);
  }

  /**
   * A conta de recebimento e, enquanto não houver subconta, o que já
   * temos para abrir uma.
   *
   * ## Por que a resposta nunca é nula
   *
   * Porque "ainda não tem conta" é o estado de quase toda
   * transportadora, e é quem mais precisa de resposta: é a pessoa que
   * tem que ver o que é a conta, o que muda, e o que falta. Devolver
   * `null` inteiro deixava a tela sem nada com que montar o convite.
   *
   * ## Por que a empresa só é lida quando faz falta
   *
   * Com a subconta criada não há o que conferir antes de enviar, e
   * carregar o cadastro a cada abertura da tela de dinheiro seria
   * consulta por nada. Hoje toda transportadora cai no caminho que lê;
   * conforme elas abrirem a conta, esse caminho se apaga sozinho.
   */
  private async contaComConvite(
    companyId: string,
    actor: AuthenticatedUser,
    empresaJaLida?: Parameters<typeof toDadosParaAbrirConta>[0],
  ): Promise<ContaDeRecebimentoComConviteResponse> {
    const linha = await this.paymentAccountRepository.findByCompanyId(companyId);
    const conta = linha ? await this.sincronizarSubconta(linha) : null;

    if (conta?.asaasAccountId) return { conta: toContaDeRecebimentoResponse(conta) };

    const empresa =
      empresaJaLida ?? (await this.companiesService.findByIdOrThrow(companyId, actor));
    return {
      conta: conta ? toContaDeRecebimentoResponse(conta) : null,
      dadosParaAbrirConta: toDadosParaAbrirConta(empresa),
    };
  }

  /**
   * A mesma conta, pelo painel do Admin Rotta.
   *
   * `findByIdOrThrow` primeiro, e não só por cortesia: é ele que diz
   * "empresa não encontrada" em vez de devolver `null` como se a
   * transportadora existisse e não tivesse conta.
   */
  async getContaDeRecebimentoDaEmpresa(
    companyId: string,
    actor: AuthenticatedUser,
  ): Promise<ContaDeRecebimentoComConviteResponse> {
    /* A empresa é lida de todo jeito, para provar o acesso. Passar
       adiante evita a segunda leitura do mesmo cadastro: o painel do
       Admin mostra exatamente o que a transportadora veria. */
    const empresa = await this.companiesService.findByIdOrThrow(companyId, actor);
    return this.contaComConvite(companyId, actor, empresa);
  }

  /**
   * Pergunta ao Asaas o que falta nesta subconta, e grava o que voltou.
   *
   * ## Por que uma leitura escreve
   *
   * Porque os dois dados que ela busca não chegam de outro jeito:
   *
   * - `onboardingUrl` **não existe** na resposta de criação da subconta.
   *   Ela vive em `GET /v3/myAccount/documents`, e sem esta chamada o
   *   botão "enviar os documentos" nunca apareceria para ninguém.
   * - a situação cadastral só muda sozinha se os eventos de conta
   *   estiverem marcados no painel do Asaas, que é tarefa de uma pessoa.
   *   Enquanto não estiverem, `GET /v3/myAccount/status` é o que tira a
   *   conta de "em análise".
   *
   * É cache, não regra de negócio: o que vem do Asaas é a verdade, e
   * isto só guarda a resposta para a próxima tela não precisar pedir de
   * novo.
   *
   * ## Por que só enquanto não está ativa
   *
   * Conta ativa com link já guardado não tem o que sincronizar, e
   * cobrar duas chamadas de rede do Asaas a cada abertura da tela de
   * dinheiro seria pagar por nada. Conta recusada também para: o
   * caminho dali é o suporte, não uma consulta.
   */
  private async sincronizarSubconta(conta: CompanyPaymentAccount): Promise<CompanyPaymentAccount> {
    const precisa = conta.asaasAccountId && conta.status === "EM_ANALISE";
    if (!precisa) return conta;

    const { onboardingUrl, situacaoGeral } = await this.subcontas.sincronizar(conta);

    const status = situacaoGeral ? SITUACAO_GERAL_DA_SUBCONTA[situacaoGeral] : undefined;
    const mudancas: UpsertCompanyPaymentAccountData = {};
    if (onboardingUrl && onboardingUrl !== conta.asaasOnboardingUrl) {
      mudancas.asaasOnboardingUrl = onboardingUrl;
    }
    if (status && status !== conta.status) mudancas.status = status;

    if (Object.keys(mudancas).length === 0) return conta;

    this.logger.log(
      `Subconta ${conta.asaasAccountId} (empresa ${conta.companyId}) sincronizada: ${Object.keys(mudancas).join(", ")}.`,
    );
    return this.paymentAccountRepository.upsert(conta.companyId, mudancas);
  }

  /**
   * O transportador informa a chave Pix de saque. `asaasWalletId` e
   * `taxaDaPlataformaBps` NÃO entram por aqui de propósito: subconta e
   * comissão são decisões da Rotta, não do cliente, e um transportador
   * que pudesse escrever o próprio `asaasWalletId` redirecionaria o
   * split de qualquer cobrança.
   */
  async salvarContaDeRecebimento(
    actor: AuthenticatedUser,
    dados: { chavePix: string },
  ): Promise<ContaDeRecebimentoResponse> {
    const companyId = this.companyIdDoAtor(actor);
    const update: UpsertCompanyPaymentAccountData = { chavePix: dados.chavePix };
    return toContaDeRecebimentoResponse(
      await this.paymentAccountRepository.upsert(companyId, update),
    );
  }

  // ---------------------------------------------------------------------
  // Subconta Asaas do transportador
  // ---------------------------------------------------------------------

  /** A transportadora cria a própria subconta, pelo painel dela. */
  async criarSubcontaDaPropriaEmpresa(
    actor: AuthenticatedUser,
    dados: DadosDaSubconta,
  ): Promise<ContaDeRecebimentoResponse> {
    return this.criarSubconta(this.companyIdDoAtor(actor), actor, dados);
  }

  /**
   * O Admin Rotta cria a subconta PELA transportadora.
   *
   * Existe porque o fundador pediu, em 20/10/2026, poder ajudar o
   * transportador na hora de montar a cobrança: "consigo fazer isso
   * dentro do painel do admin como admin master?". Quem decide se este
   * ator pode mexer nesta empresa é `CompaniesService`, como em todo
   * endpoint por empresa — este método não julga papel por conta
   * própria.
   */
  async criarSubcontaParaEmpresa(
    companyId: string,
    actor: AuthenticatedUser,
    dados: DadosDaSubconta,
  ): Promise<ContaDeRecebimentoResponse> {
    return this.criarSubconta(companyId, actor, dados);
  }

  /**
   * Cria a subconta no Asaas e grava, numa operação, tudo o que ela
   * devolveu.
   *
   * ## Por que recusa a segunda
   *
   * Porque a chave de API só aparece na resposta da criação, e não
   * existe endpoint para pedir de novo. Criar a segunda subconta de uma
   * transportadora que já tem uma deixaria a primeira órfã no Asaas,
   * possivelmente já com saldo, e não há desfazer. Então a checagem vem
   * antes da chamada, e a mensagem diz o que fazer.
   *
   * ## Por que o formulário tem um campo só
   *
   * Os outros onze já estão no cadastro da transportadora, conferidos na
   * Receita quando ela entrou. É isso que faz o transportador nunca
   * precisar abrir o Asaas: a conta dele nasce do que a Rotta já sabe.
   */
  private async criarSubconta(
    companyId: string,
    actor: AuthenticatedUser,
    dados: DadosDaSubconta,
  ): Promise<ContaDeRecebimentoResponse> {
    const existente = await this.paymentAccountRepository.findByCompanyId(companyId);
    if (existente?.asaasAccountId) {
      throw new BadRequestException(
        "Esta transportadora já tem subconta no Asaas. Não é possível criar uma segunda: a chave de acesso só aparece na criação, e a primeira ficaria inacessível.",
      );
    }

    const empresa = await this.companiesService.findByIdOrThrow(companyId, actor);

    const subconta = await this.subcontas.criarSubconta({
      /* Razão social, e não nome fantasia: para o Asaas este é o
         titular de uma conta de pagamento, e o nome tem que bater com o
         documento. */
      nome: empresa.razaoSocial,
      email: dados.email ?? empresa.email,
      /* O login fica SEMPRE com a empresa, mesmo quando ela aponta um
         e-mail de financeiro acima. Sem isto, o Asaas usaria o e-mail do
         financeiro como login e a transportadora perderia o acesso à
         própria conta de recebimento para o contador. */
      emailDeLogin: empresa.email,
      cpfCnpj: empresa.cpfCnpj,
      telefone: dados.telefone ?? empresa.telefone,
      endereco: empresa.endereco,
      numero: empresa.numero,
      complemento: empresa.complemento ?? undefined,
      bairro: empresa.bairro,
      cep: empresa.cep,
      companyType: TIPO_DE_EMPRESA_NO_ASAAS[empresa.tipo],
      faturamentoMensalCentavos: dados.faturamentoMensalCentavos,
    });

    /* `EM_ANALISE`, nunca `ATIVA`: a conta nasce aguardando a análise do
       Asaas, que leva até dois dias úteis e termina chegando pelo
       webhook de situação da conta. Dizer "ativa" aqui seria prometer
       recebimento que ainda não existe.

       `asaasOnboardingUrl` não entra aqui porque não existe na resposta
       da criação: ela é preenchida na primeira leitura da tela, por
       `sincronizarSubconta`. */
    const conta = await this.paymentAccountRepository.upsert(companyId, {
      status: "EM_ANALISE",
      asaasAccountId: subconta.asaasAccountId,
      asaasWalletId: subconta.asaasWalletId,
      asaasApiKeyCifrada: subconta.asaasApiKeyCifrada,
    });

    this.logger.log(
      /* Esta é a "linha de confirmação" que o aviso de
         `AsaasSubcontasService.criarSubconta` promete: se ela não
         aparecer, a subconta ficou órfã no provedor. */
      `Subconta Asaas ${subconta.asaasAccountId} GRAVADA para a empresa ${companyId} por ${actor.role} ${actor.sub}.`,
    );

    return toContaDeRecebimentoResponse(conta);
  }

  /**
   * O Asaas avisou que a situação de uma subconta mudou.
   *
   * Chega do webhook, sem ator e sem `companyId`: o único identificador
   * do evento é o `id` da subconta, e é por ele que a conta é
   * encontrada, fora do tenant.
   *
   * Só a aprovação geral (`accountStatus.general`) move o estado. As
   * outras três situações que o evento traz (documentação, dados
   * comerciais, conta bancária) são etapas dela, e reagir a cada uma
   * faria o estado oscilar: a conta ficaria "recusada" porque falta um
   * documento, e voltaria a "em análise" no evento seguinte.
   *
   * Evento desconhecido não mexe em nada. O Asaas acrescenta eventos sem
   * avisar, e mudar o estado de uma conta de recebimento por um nome que
   * ninguém leu é pior do que não mudar.
   */
  async aplicarSituacaoDaSubconta(dados: {
    asaasAccountId: string;
    situacaoGeral: string;
    eventoDaAsaas: string;
  }): Promise<void> {
    const conta = await this.paymentAccountRepository.findByAsaasAccountIdAcrossTenants(
      dados.asaasAccountId,
    );
    if (!conta) {
      this.logger.warn(
        `Webhook de situacao da conta para a subconta ${dados.asaasAccountId}, que nao pertence a nenhuma transportadora da Rotta (evento "${dados.eventoDaAsaas}"). Ignorado.`,
      );
      return;
    }

    const status = SITUACAO_GERAL_DA_SUBCONTA[dados.situacaoGeral];
    if (!status) {
      this.logger.warn(
        `Situacao geral desconhecida "${dados.situacaoGeral}" na subconta ${dados.asaasAccountId} (evento "${dados.eventoDaAsaas}"). Estado da conta mantido em ${conta.status}.`,
      );
      return;
    }

    if (conta.status === status) return;

    await this.paymentAccountRepository.upsertAcrossTenants(conta.companyId, { status });
    this.logger.log(
      `Conta de recebimento da empresa ${conta.companyId}: ${conta.status} -> ${status} (evento "${dados.eventoDaAsaas}").`,
    );
  }

  // ---------------------------------------------------------------------
  // Os controles do recebimento (Admin Rotta)
  // ---------------------------------------------------------------------

  /**
   * Muda a taxa por meio, o emissor da cobrança e a custódia de uma
   * transportadora.
   *
   * ## Por que as três moram no mesmo lugar
   *
   * Porque elas se condicionam. Custódia só existe com emissor
   * `SUBCONTA`, e emissor `SUBCONTA` só funciona com a chave da subconta
   * guardada. Em endpoints separados daria para ligar custódia numa
   * transportadora cuja cobrança é emitida pela Rotta, o que não retém
   * nada e passa a cobrar a tarifa recorrente por nada.
   *
   * ## A ordem: provedor primeiro, banco depois
   *
   * Ao contrário da criação de subconta, custódia é reversível. Então a
   * chamada ao Asaas vem antes da escrita: gravar "custódia ativa" e só
   * depois descobrir que o provedor recusou mostraria na tela uma
   * retenção que não existe.
   */
  async configurarRecebimentoDaEmpresa(
    companyId: string,
    actor: AuthenticatedUser,
    dados: ConfigurarRecebimentoDados,
  ): Promise<ContaDeRecebimentoResponse> {
    await this.companiesService.findByIdOrThrow(companyId, actor);

    const conta = await this.paymentAccountRepository.findByCompanyIdAcrossTenants(companyId);
    if (!conta) {
      throw new BadRequestException(
        "Esta transportadora ainda não tem conta de recebimento. Abra a conta antes de configurar taxa, emissor ou custódia.",
      );
    }

    const mudancas: UpsertCompanyPaymentAccountData = {};

    for (const campo of TAXAS_CONFIGURAVEIS) {
      const valor = dados[campo];
      if (valor === undefined || valor === conta[campo]) continue;
      mudancas[campo] = valor;
      /* A tabela aprovada em 20/10/2026 vai de 49 a 129 pontos-base.
         Acima de 10% é quase certamente centavos digitados como
         pontos-base, e quem confere o log precisa ver isso — mas a
         decisão de preço é do fundador, então avisa e obedece. */
      if (valor > 1_000) {
        this.logger.warn(
          `Taxa ${campo} da empresa ${companyId} definida em ${valor} pontos-base (${valor / 100}%), acima de 10%. A tabela aprovada vai de 49 a 129. Conferir se nao e erro de digitacao.`,
        );
      }
    }

    if (dados.emissorDaCobranca && dados.emissorDaCobranca !== conta.emissorDaCobranca) {
      if (dados.emissorDaCobranca === "SUBCONTA") {
        if (!conta.asaasApiKeyCifrada) {
          throw new BadRequestException(
            "Para a transportadora emitir a própria cobrança é preciso ter a chave da subconta guardada, e esta conta não tem. Abra a subconta pela Rotta: a chave só aparece na criação.",
          );
        }
        if (conta.status !== "ATIVA") {
          throw new BadRequestException(
            `A subconta desta transportadora está em "${conta.status}". Enquanto o Asaas não aprovar, a cobrança emitida por ela não é paga. Espere a aprovação antes de virar o emissor.`,
          );
        }
      }
      mudancas.emissorDaCobranca = dados.emissorDaCobranca;
    }

    const emissorFinal = mudancas.emissorDaCobranca ?? conta.emissorDaCobranca;

    if (dados.custodia) {
      if (dados.custodia.ativa && emissorFinal !== "SUBCONTA") {
        throw new BadRequestException(
          "A custódia só retém o que a própria subconta recebe, e com o emissor `ROTTA` a cobrança é da conta principal. Vire o emissor para `SUBCONTA` na mesma chamada, ou antes dela.",
        );
      }

      const tarifaPagaPor = dados.custodia.tarifaPagaPor ?? conta.custodiaTarifaPagaPor;

      await this.subcontas.configurarCustodia(conta, {
        ativa: dados.custodia.ativa,
        diasParaLiberar:
          dados.custodia.diasParaLiberar ?? conta.custodiaDiasParaLiberar ?? undefined,
        tarifaNaSubconta: tarifaPagaPor === "SUBCONTA",
      });

      mudancas.custodiaAtiva = dados.custodia.ativa;
      mudancas.custodiaTarifaPagaPor = tarifaPagaPor;
      if (dados.custodia.diasParaLiberar !== undefined) {
        mudancas.custodiaDiasParaLiberar = dados.custodia.diasParaLiberar;
      }
    }

    if (Object.keys(mudancas).length === 0) {
      return toContaDeRecebimentoResponse(conta);
    }

    const atualizada = await this.paymentAccountRepository.upsertAcrossTenants(companyId, mudancas);
    this.logger.log(
      `Admin ${actor.sub} mudou o recebimento da empresa ${companyId}: ${Object.keys(mudancas).join(", ")}.`,
    );
    return toContaDeRecebimentoResponse(atualizada);
  }

  // ---------------------------------------------------------------------
  // A assinatura da família: a recorrência que cobra sozinha
  // ---------------------------------------------------------------------

  /**
   * Os contratos da transportadora, com o estado da cobrança mensal de
   * cada um.
   *
   * É a tela em que ela liga a recorrência das famílias que já estão
   * cadastradas: a Rotta já sabe quem é o aluno, quem paga e quanto é,
   * então a única coisa que a tela pede, e só quando falta, é o CPF de
   * quem paga.
   *
   * O CPF nunca sai daqui como valor — só como `precisaDeCpf`. Devolver
   * documento de pessoa física numa listagem seria expor mais do que a
   * tela precisa para funcionar.
   */
  async listarContratosParaCobrar(actor: AuthenticatedUser): Promise<ContratoParaCobrarResponse[]> {
    const companyId = this.companyIdDoAtor(actor);
    const contratos = await this.invoiceRepository.listContratosParaCobrar(companyId);

    return contratos.map((contrato) => ({
      contractId: contrato.id,
      alunoNome: contrato.student.nome,
      responsavelNome: contrato.responsavel.nome,
      responsavelTelefone: contrato.responsavel.telefone,
      valorCentavos: contrato.valorMensalidadeCentavos,
      valorFormatado: formatarCentavos(contrato.valorMensalidadeCentavos),
      statusDoContrato: contrato.status,
      vigenciaFim: contrato.vigenciaFim ? contrato.vigenciaFim.toISOString().slice(0, 10) : null,
      cobrancaMensalAtiva: Boolean(contrato.asaasSubscriptionId),
      statusDaAssinatura: contrato.asaasSubscriptionStatus,
      precisaDeCpf: !contrato.responsavel.cpf,
      /* O que impede ligar agora, em uma frase, para a tela não ter que
         repetir as regras do serviço e poder divergir delas. */
      impedimento: this.impedimentoParaCobrar(contrato),
    }));
  }

  private impedimentoParaCobrar(contrato: {
    status: string;
    valorMensalidadeCentavos: number;
    asaasSubscriptionId: string | null;
  }): string | null {
    if (contrato.asaasSubscriptionId) return null;
    if (contrato.status !== "ATIVO") {
      return "O contrato precisa estar ativo.";
    }
    if (contrato.valorMensalidadeCentavos <= 0) {
      return "A mensalidade está em R$ 0,00: combine o valor com a família e registre no contrato.";
    }
    if (!this.asaasClient.isConfigured()) {
      return "A cobrança automática ainda não está disponível nesta implantação.";
    }
    return null;
  }

  /** A transportadora cria a recorrência de um contrato dela. */
  async criarAssinaturaDoProprioContrato(
    contractId: string,
    actor: AuthenticatedUser,
    dados: DadosDaAssinaturaDaFamilia,
  ): Promise<AssinaturaDaFamiliaResponse> {
    this.companyIdDoAtor(actor);
    return this.criarAssinaturaDaFamilia(contractId, actor, dados);
  }

  /**
   * O Admin Rotta cria a recorrência PELA transportadora, para quando o
   * transportador precisa de ajuda. Pedido do fundador em 21/10/2026:
   * "podemos ajudar (admins master), porém as subcontas também poderão".
   */
  async criarAssinaturaParaContrato(
    contractId: string,
    actor: AuthenticatedUser,
    dados: DadosDaAssinaturaDaFamilia,
  ): Promise<AssinaturaDaFamiliaResponse> {
    return this.criarAssinaturaDaFamilia(contractId, actor, dados);
  }

  /**
   * Cria no Asaas a recorrência que cobra a família todo mês.
   *
   * ## O que isto muda para a família
   *
   * Hoje a cobrança só existe quando o Responsável abre o app e toca em
   * "pagar": é ele que dispara a criação. Com a recorrência, o Asaas
   * gera a cobrança de cada mês sozinho, e **o Responsável não precisa
   * de conta na Rotta para nada** — ele recebe o link da cobrança
   * hospedada e paga ali, por Pix ou boleto.
   *
   * Quem precisa de conta é só o transportador, e a dele é a subconta
   * (autônomo, MEI ou sociedade).
   *
   * ## A ordem das operações não é arbitrária
   *
   * Criar assinatura no Asaas é irreversível de um jeito pior que criar
   * subconta: subconta órfã fica parada, **assinatura órfã cobra a
   * família todo mês** e ninguém na Rotta sabe que ela existe. Por isso
   * tudo que pode falhar acontece ANTES da chamada, e o `id` vai para o
   * log no instante em que a resposta chega.
   *
   * ## Por que a segunda assinatura é recusada
   *
   * Duas recorrências no mesmo contrato cobram a mesma família duas
   * vezes por mês, e o estrago aparece no extrato dela, não no nosso.
   * `Contract.asaasSubscriptionId` é `@unique` e a recusa vem antes da
   * chamada ao Asaas.
   */
  private async criarAssinaturaDaFamilia(
    contractId: string,
    actor: AuthenticatedUser,
    dados: DadosDaAssinaturaDaFamilia,
  ): Promise<AssinaturaDaFamiliaResponse> {
    const contrato = await this.invoiceRepository.findContratoParaAssinarAcrossTenants(contractId);
    if (!contrato) throw new NotFoundException("Contrato não encontrado.");

    /* Prova o acesso à transportadora do contrato. Para o Admin Rotta o
       guard já publica bypass; para a transportadora isto é o que
       impede criar recorrência no contrato de outra empresa. */
    await this.companiesService.findByIdOrThrow(contrato.companyId, actor);

    if (contrato.asaasSubscriptionId) {
      throw new BadRequestException(
        "Este contrato já tem uma cobrança mensal automática. Criar outra cobraria a família duas vezes no mesmo mês.",
      );
    }
    if (contrato.status !== "ATIVO") {
      throw new BadRequestException(
        "Só contrato ativo pode ter cobrança mensal automática. Ative o contrato antes.",
      );
    }
    if (contrato.valorMensalidadeCentavos <= 0) {
      throw new BadRequestException(
        "A mensalidade deste contrato está em R$ 0,00. Combine o valor com a família e registre no contrato antes de ligar a cobrança automática.",
      );
    }
    if (!this.asaasClient.isConfigured()) {
      throw new BadRequestException(
        "A cobrança automática ainda não está disponível nesta implantação. Nada foi criado.",
      );
    }

    const customerId = await this.resolverClienteAsaas(contrato.responsavelId, {
      cpfInformado: dados.cpfDoResponsavel,
    });

    const conta = await this.paymentAccountRepository.findByCompanyIdAcrossTenants(
      contrato.companyId,
    );

    const meio = dados.meioDePagamento ?? "PIX";
    /* `UNDEFINED` deixa o pagador escolher na página; para a conta da
       Rotta o percentual é o do Pix, que é o meio que a família usa. */
    const split = this.subcontas.montarSplit(
      conta,
      meio === "BOLETO" ? "BOLETO" : "PIX",
      this.config.rottaWalletId,
    );
    const emitirPelaSubconta = conta?.emissorDaCobranca === "SUBCONTA";
    const chaveDaSubconta = emitirPelaSubconta
      ? this.subcontas.chaveDaSubconta(
          conta,
          `emitir a assinatura do contrato ${contrato.id} em nome da subconta`,
        )
      : undefined;

    const primeiroVencimento = await this.primeiroVencimentoDaAssinatura(
      contrato.id,
      dados.diaDeVencimento ?? DIA_DE_VENCIMENTO_PADRAO,
    );

    const assinatura = await this.asaasClient.createSubscription(
      {
        customer: customerId,
        billingType: meio,
        value: contrato.valorMensalidadeCentavos / 100,
        cycle: "MONTHLY",
        nextDueDate: primeiroVencimento.toISOString().slice(0, 10),
        description: `Transporte escolar de ${contrato.student.nome}, ${contrato.company.nomeFantasia}`,
        /* O mesmo prefixo das cobranças avulsas, mas apontando para o
           CONTRATO: toda cobrança que a recorrência gerar herda este
           valor, então ele não pode identificar um mês. Quem identifica
           o mês é o vencimento da cobrança gerada. */
        externalReference: `${FAMILY_CONTRACT_ID_PREFIX}${contrato.id}`,
        split,
        /* Sem isto a recorrência continua cobrando depois de o contrato
           acabar. `vigenciaFim` é `null` em contrato sem fim combinado,
           e aí não há limite a mandar. */
        ...(contrato.vigenciaFim
          ? { endDate: contrato.vigenciaFim.toISOString().slice(0, 10) }
          : {}),
      },
      chaveDaSubconta,
    );

    /* Antes de qualquer coisa que possa falhar: uma assinatura criada
       que não foi gravada aqui é uma recorrência invisível cobrando uma
       família de verdade. Mesma lição da subconta órfã, com
       consequência pior porque esta repete todo mês. */
    this.logger.warn(
      `Assinatura ${assinatura.id} criada no Asaas para o contrato ${contrato.id} (aluno ${contrato.studentId}, responsavel ${contrato.responsavelId}). Se nao houver uma linha de confirmacao logo abaixo desta, ela ficou ORFA no provedor e seguira cobrando a familia todo mes: cancele por DELETE /v3/subscriptions/${assinatura.id}.`,
    );

    await this.invoiceRepository.atualizarAssinaturaDoContratoAcrossTenants(contrato.id, {
      asaasSubscriptionId: assinatura.id,
      asaasSubscriptionStatus: assinatura.status,
      assinaturaCriadaEm: new Date(),
    });

    this.logger.log(
      `Assinatura Asaas ${assinatura.id} GRAVADA no contrato ${contrato.id}: ${meio}, ${formatarCentavos(contrato.valorMensalidadeCentavos)}/mes, primeiro vencimento ${primeiroVencimento.toISOString().slice(0, 10)}, split ${split ? "sim" : "nao"}, emissor ${emitirPelaSubconta ? "SUBCONTA" : "ROTTA"}.`,
    );

    return {
      contractId: contrato.id,
      asaasSubscriptionId: assinatura.id,
      status: assinatura.status,
      meioDePagamento: meio,
      valorCentavos: contrato.valorMensalidadeCentavos,
      valorFormatado: formatarCentavos(contrato.valorMensalidadeCentavos),
      primeiroVencimento: primeiroVencimento.toISOString().slice(0, 10),
      ultimoVencimento: contrato.vigenciaFim
        ? contrato.vigenciaFim.toISOString().slice(0, 10)
        : null,
      repasseDiretoAoTransportador: Boolean(conta?.asaasWalletId),
    };
  }

  /**
   * Liga ao mês certo a cobrança que a recorrência gerou.
   *
   * ## Por que não dá para só gravar
   *
   * A cobrança nasce no Asaas **até 40 dias antes do vencimento**, então
   * quando ela chega a fatura daquele mês muitas vezes ainda não existe:
   * a rotina mensal da Rotta gera a fatura do mês corrente, não a de
   * dois meses à frente. Por isso aqui acha **ou cria**.
   *
   * ## A cobrança divergente não sobrescreve nada
   *
   * Se o mês já tem outra cobrança gravada, sobrescrever deixaria a
   * primeira órfã no provedor — possivelmente já paga pela família, e
   * sem fatura nenhuma apontando para ela. Nesse caso isto só avisa, com
   * os dois ids na mensagem, e não mexe.
   *
   * Idempotente: a mesma cobrança reentregue sai sem escrever.
   */
  async vincularCobrancaDaAssinatura(evento: {
    asaasEvent: string;
    asaasSubscriptionId: string;
    asaasPaymentId: string;
    contractId: string;
    vencimento: string;
    valorReais: number;
    linkDaFatura?: string | null;
    linhaDigitavel?: string | null;
    meioDePagamento?: string | null;
  }): Promise<void> {
    const contrato = await this.invoiceRepository.findContratoPorAssinaturaAcrossTenants(
      evento.asaasSubscriptionId,
    );
    if (!contrato) {
      this.logger.warn(
        `Cobranca ${evento.asaasPaymentId} gerada pela assinatura ${evento.asaasSubscriptionId}, que nao pertence a nenhum contrato da Rotta (evento "${evento.asaasEvent}"). Ignorada.`,
      );
      return;
    }

    /* A referencia vem do payload e a assinatura vem do banco: se as
       duas discordam, alguma das pontas esta apontando para o contrato
       errado, e gravar seria cobrar uma familia na fatura de outra. */
    if (contrato.id !== evento.contractId) {
      this.logger.warn(
        `Cobranca ${evento.asaasPaymentId}: a assinatura ${evento.asaasSubscriptionId} esta no contrato ${contrato.id}, mas a referencia do pagamento diz contrato ${evento.contractId}. Nada foi ligado.`,
      );
      return;
    }

    const vencimento = new Date(`${evento.vencimento}T00:00:00.000Z`);
    if (Number.isNaN(vencimento.getTime())) {
      this.logger.warn(
        `Cobranca ${evento.asaasPaymentId} com vencimento ilegivel ("${evento.vencimento}"): nao da para saber de qual mes e. Nada foi ligado.`,
      );
      return;
    }
    const competencia = competenciaDe(vencimento);

    const existente = await this.invoiceRepository.findPorContratoECompetenciaAcrossTenants(
      contrato.id,
      competencia,
    );

    if (existente?.asaasPaymentId === evento.asaasPaymentId) {
      this.logger.debug(
        `Cobranca ${evento.asaasPaymentId} ja estava ligada a fatura ${existente.id}: webhook reentregue, nada a fazer.`,
      );
      return;
    }
    if (existente?.asaasPaymentId) {
      this.logger.warn(
        `Fatura ${existente.id} (contrato ${contrato.id}, competencia ${competencia.toISOString().slice(0, 10)}) ja tem a cobranca ${existente.asaasPaymentId}, e a assinatura gerou outra (${evento.asaasPaymentId}). A familia pode ter DUAS cobrancas do mesmo mes. Nada foi sobrescrito: confira no painel do Asaas e apague a que nao for usada.`,
      );
      return;
    }

    const conta = await this.paymentAccountRepository.findByCompanyIdAcrossTenants(
      contrato.companyId,
    );

    const dados = {
      asaasPaymentId: evento.asaasPaymentId,
      linkDaFatura: evento.linkDaFatura ?? null,
      linhaDigitavel: evento.linhaDigitavel ?? null,
      meioDePagamento: this.meioDaCobranca(evento.meioDePagamento),
      repasseDiretoAoTransportador: Boolean(conta?.asaasWalletId),
    };

    if (existente) {
      await this.invoiceRepository.updateAcrossTenants(existente.id, dados);
      this.logger.log(
        `Cobranca ${evento.asaasPaymentId} da assinatura ${evento.asaasSubscriptionId} ligada a fatura ${existente.id} (competencia ${competencia.toISOString().slice(0, 10)}).`,
      );
      return;
    }

    /* O mes ainda nao tinha fatura: a recorrencia gerou a cobranca antes
       de a rotina mensal chegar nesse mes. O valor vem do CONTRATO, nao
       do payload, pelo mesmo motivo de `gerarFaturasDaCompetencia`: a
       fatura e documento financeiro nosso, e o valor dela e o combinado
       no contrato. */
    const criada = await this.invoiceRepository.createAcrossTenants({
      companyId: contrato.companyId,
      contractId: contrato.id,
      studentId: contrato.studentId,
      responsavelId: contrato.responsavelId,
      competencia,
      vencimento,
      valorCentavos: contrato.valorMensalidadeCentavos,
    });
    await this.invoiceRepository.updateAcrossTenants(criada.id, dados);

    this.logger.log(
      `Fatura ${criada.id} criada pela assinatura ${evento.asaasSubscriptionId} (contrato ${contrato.id}, competencia ${competencia.toISOString().slice(0, 10)}, vencimento ${evento.vencimento}) e ligada a cobranca ${evento.asaasPaymentId}.`,
    );
  }

  /**
   * O meio da cobrança do Asaas traduzido para o da fatura.
   *
   * `UNDEFINED` vira `null` de propósito: significa que o pagador ainda
   * não escolheu, e gravar um meio nesse caso seria afirmar na tela algo
   * que não aconteceu. O meio real chega no evento de pagamento.
   */
  private meioDaCobranca(meio: string | null | undefined): InvoicePaymentMethod | null {
    const conhecidos: Record<string, InvoicePaymentMethod> = {
      PIX: "PIX",
      BOLETO: "BOLETO",
      CREDIT_CARD: "CARTAO_CREDITO",
      DEBIT_CARD: "CARTAO_DEBITO",
    };
    return meio ? (conhecidos[meio] ?? null) : null;
  }

  /**
   * O vencimento da primeira cobrança da recorrência.
   *
   * Duas regras, e as duas existem para não cobrar a família duas vezes
   * pelo mesmo mês:
   *
   * 1. **Mês que já tem cobrança no Asaas é pulado.** Se o Responsável
   *    já abriu o Pix deste mês, existe cobrança lá; a recorrência
   *    começa no mês seguinte.
   * 2. **Vencimento no passado é pulado.** Uma recorrência que nasce
   *    vencida gera cobrança atrasada na hora, para um mês que a família
   *    talvez já tenha combinado de outro jeito.
   *
   * Procura no máximo doze meses à frente: além disso é contrato que não
   * deveria estar ligando cobrança automática hoje.
   */
  private async primeiroVencimentoDaAssinatura(
    contractId: string,
    diaDeVencimento: number,
  ): Promise<Date> {
    const hoje = new Date();
    const hojeUtc = new Date(
      Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate()),
    );

    for (let salto = 0; salto < 12; salto += 1) {
      const competencia = new Date(
        Date.UTC(hojeUtc.getUTCFullYear(), hojeUtc.getUTCMonth() + salto, 1),
      );
      const vencimento = vencimentoDe(competencia, diaDeVencimento);

      if (vencimento < hojeUtc) continue;

      const fatura = await this.invoiceRepository.findPorContratoECompetenciaAcrossTenants(
        contractId,
        competencia,
      );
      /* Fatura sem `asaasPaymentId` é só a nossa linha de razão: não
         existe cobrança no provedor, então a recorrência pode cobrir
         este mês. */
      if (fatura?.asaasPaymentId) continue;

      return vencimento;
    }

    throw new BadRequestException(
      "Não foi possível achar um mês livre para a primeira cobrança nos próximos doze meses. Confira as faturas já emitidas deste contrato.",
    );
  }

  private companyIdDoAtor(actor: AuthenticatedUser): string {
    if (actor.role !== Role.EMPRESA && actor.role !== Role.GESTOR) {
      throw new ForbiddenException("Apenas a transportadora acessa as próprias cobranças.");
    }
    if (!actor.tenantId) {
      throw new ForbiddenException("Ator sem transportadora vinculada.");
    }
    return actor.tenantId;
  }
}
