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
import type { LytexPaymentMethodsInput } from "@/modules/lytex/types/lytex.types";
import type {
  CompanyPaymentAccount,
  ContractInvoiceStatus,
  InvoicePaymentMethod,
} from "@prisma/client";

import lytexConfig from "@/config/lytex.config";
import { CompaniesService } from "@/modules/companies/companies.service";
import { LytexClientService } from "@/modules/lytex/lytex-client.service";
import { LytexSubcontasService } from "@/modules/lytex/lytex-subcontas.service";
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
   * cadastro, e desde 14/09/2026 nenhum Responsável novo tem. A Lytex
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
  lytexSubscriptionId: string;
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
 * Quais meios a cobrança aceita, no formato que a Lytex exige.
 *
 * Os três campos são obrigatórios no esquema dela mesmo quando
 * desligados: é `enable: false` que desliga, não a ausência da chave.
 *
 * `UNDEFINED` liga Pix e boleto e deixa o pagador escolher na página da
 * cobrança. Cartão fica de fora dos três casos, e isso é decisão, não
 * esquecimento: o crédito custa 3,72% contra 0,62% do Pix na tabela da
 * Lytex de 22/10/2026, e ainda rende MENOS para a Rotta, porque a taxa
 * aprovada no crédito é menor e incide sobre um líquido já reduzido.
 * Cartão é conveniência a oferecer, nunca caminho preferencial.
 */
function meiosDaCobranca(meio: "PIX" | "BOLETO" | "UNDEFINED"): LytexPaymentMethodsInput {
  return {
    pix: { enable: meio === "PIX" || meio === "UNDEFINED" },
    boleto: { enable: meio === "BOLETO" || meio === "UNDEFINED" },
    creditCard: { enable: false },
  };
}

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
 * plataforma, e isso continua no **Asaas**. Aqui a transportadora cobra
 * a família pelo transporte, e isso passou para a **Lytex** em
 * 23/10/2026. Pagador, recebedor, ciclo e provedora são diferentes, e
 * desde a troca os dois fluxos não compartilham mais nada.
 *
 * ## Por que a família saiu do Asaas
 *
 * Decisão do fundador, depois da comparação de cinco provedoras
 * registrada em `empresa/financeiro/`. O que pesou, em ordem:
 *
 * 1. **Nenhuma chave de terceiro guardada.** No Asaas, a custódia só
 *    existia se a cobrança fosse criada com a chave de API da subconta,
 *    porque só a conta que recebe tem retenção. Isso obrigava a Rotta a
 *    guardar a chave do transportador, cifrada e auditada. Na Lytex a
 *    cobrança nasce em nome da subconta pelo header `subRecipientId`,
 *    com a credencial da própria plataforma.
 * 2. **Split liberado sem teto regulatório** por subconta.
 * 3. **Retenção real**, `floatConfig`, confirmada pelo suporte em
 *    22/10/2026: boleto D+2, Pix D+0.
 *
 * As colunas `asaas*` destas tabelas continuam no banco como histórico:
 * nenhuma subconta, cobrança de família ou assinatura de família chegou
 * a existir no Asaas em produção. Nada aqui as escreve mais.
 *
 * O Rotta Pay (`WalletService`) é do TRANSPORTADOR — autônomo, MEI ou
 * empresa. É onde ele vê o que entrou e pede saque. O Responsável nunca
 * tem carteira: ele vê quanto deve, quando vence e como pagar.
 *
 * ## O que já funciona e o que espera a Lytex
 *
 * Funciona hoje, sem depender de nada externo: a fatura mensal (geração
 * idempotente por competência), o estado dela (a vencer, vencida, paga),
 * a tela do Responsável, as contas a receber da transportadora, e o
 * crédito no Rotta Pay quando um pagamento é confirmado.
 *
 * Espera a Lytex em dois pontos, os dois explícitos no código em vez de
 * fingidos:
 *
 * 1. `abrirPagamento` precisa de `LYTEX_CLIENT_ID`/`LYTEX_CLIENT_SECRET`.
 *    Sem elas, a API diz que o pagamento pelo app ainda não está
 *    disponível, e a tela continua mostrando valor e vencimento, porque
 *    esse dado é nosso e não depende de provedor nenhum.
 * 2. O split depende de `CompanyPaymentAccount.lytexSubAccountId`, a
 *    subconta do transportador. Com ela preenchida, a cobrança sai em
 *    nome dele e o dinheiro cai direto na conta dele, com a taxa da
 *    Rotta indo por split. Sem ela, a cobrança é da conta da Rotta e o
 *    valor vira crédito no Rotta Pay. Cada fatura registra qual dos dois
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
    private readonly lytexClient: LytexClientService,
    private readonly subcontas: LytexSubcontasService,
    @Inject(lytexConfig.KEY)
    private readonly config: ConfigType<typeof lytexConfig>,
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
      pagamentoNoAppDisponivel: this.lytexClient.isConfigured(),
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
   * não podem gerar duas cobranças na Lytex, ou a família paga duas
   * vezes. `lytexInvoiceId` guardado na fatura é a trava.
   *
   * ## O QR Code vem como texto, não como imagem
   *
   * A Lytex devolve `paymentMethods.pix.qrcode`, que é o Pix copia e
   * cola, e não uma imagem pronta em base64 como o Asaas devolvia. Por
   * isso `pixQrCodeBase64` sai `null`: desenhar o QR a partir do payload
   * é trabalho de quem mostra a tela, e inventar uma imagem aqui seria
   * gerar um código que ninguém conferiu. O payload é o dado que
   * importa, e é ele que o banco da família lê.
   *
   * Cartão continua de fora, agora por economia e não só por PCI DSS: na
   * tabela da Lytex de 22/10/2026 o crédito custa 3,72% contra 0,62% do
   * Pix, e ainda rende menos para a Rotta.
   */
  async abrirPagamentoPix(
    invoiceId: string,
    actor: AuthenticatedUser,
  ): Promise<PagamentoDaFaturaResponseDto> {
    const fatura = await this.faturaParaPagar(invoiceId, actor);

    const lytexInvoiceId = fatura.lytexInvoiceId ?? (await this.criarCobranca(fatura, "PIX"));

    /* A fatura em memória pode ser de antes da criação, e o Pix copia e
       cola pode não ter vindo na resposta da criação. A verdade dele
       está no provedor, nunca no que gravamos. */
    const cobranca = await this.lytexClient.getInvoice(
      lytexInvoiceId,
      await this.subRecipientDaFatura(fatura.companyId),
    );
    const pix = cobranca.paymentMethods?.pix;

    return {
      invoiceId: fatura.id,
      meioDePagamento: "PIX",
      valorCentavos: fatura.valorCentavos,
      valorFormatado: formatarCentavos(fatura.valorCentavos),
      pixPayload: pix?.qrcode ?? null,
      pixQrCodeBase64: null,
      pixExpiraEm: pix?.validUntil ?? pix?.dueDate ?? null,
      linhaDigitavel: null,
      linkDaFatura: cobranca.linkCheckout ?? fatura.linkDaFatura,
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
   * O registro do boleto no banco é assíncrono do lado da Lytex. Quando
   * a resposta da criação não traz `digitableLine`, isto não inventa
   * nada: devolve o link da fatura hospedada, que funciona sempre, e a
   * linha digitável aparece na próxima abertura.
   */
  async abrirPagamentoBoleto(
    invoiceId: string,
    actor: AuthenticatedUser,
  ): Promise<PagamentoDaFaturaResponseDto> {
    const fatura = await this.faturaParaPagar(invoiceId, actor);

    const lytexInvoiceId = fatura.lytexInvoiceId ?? (await this.criarCobranca(fatura, "BOLETO"));

    /* A fatura em memória pode ser de antes da criação da cobrança, e a
       cobrança que já existia pode ter sido criada pela assinatura (ou
       num dia em que o registro bancário ainda não tinha saído). Em
       todos esses casos a verdade da linha digitável está no provedor. */
    const cobranca = await this.lytexClient.getInvoice(
      lytexInvoiceId,
      await this.subRecipientDaFatura(fatura.companyId),
    );
    const linhaDigitavel =
      cobranca.paymentMethods?.boleto?.digitableLine ?? fatura.linhaDigitavel ?? null;
    const linkDaFatura =
      cobranca.linkBoleto ?? cobranca.linkCheckout ?? fatura.linkDaFatura ?? null;

    /* Guarda o que voltou, para a próxima abertura e para a tela de
       faturas não precisarem de outra chamada à Lytex. */
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
   * O `subRecipientId` da transportadora, quando a cobrança dela é
   * emitida em nome da subconta.
   *
   * Precisa existir em toda LEITURA de cobrança também, e não só na
   * criação: uma fatura que nasceu na subconta vive sob
   * `/v2/sub-accounts/invoices/{id}`, e pedi-la na rota da conta
   * principal devolve "não encontrada". Errar isso quebraria a abertura
   * do Pix de quem já está recebendo direto.
   */
  private async subRecipientDaFatura(companyId: string): Promise<string | undefined> {
    const conta = await this.paymentAccountRepository.findByCompanyIdAcrossTenants(companyId);
    return this.emissorEhSubconta(conta) ? subRecipientDe(conta) : undefined;
  }

  /**
   * `true` quando a cobrança desta transportadora nasce em nome dela.
   *
   * Exige as três coisas ao mesmo tempo, e cada uma por um motivo: a
   * subconta existe, o split já foi liberado pela Lytex (sem isso a
   * nossa taxa não é repassada), e o emissor configurado é `SUBCONTA`.
   */
  private emissorEhSubconta(conta: CompanyPaymentAccount | null): boolean {
    return Boolean(
      conta?.lytexSubAccountId &&
      conta.lytexSplitLiberado &&
      conta.emissorDaCobranca === "SUBCONTA",
    );
  }

  /**
   * As checagens que valem para qualquer meio de pagamento: a fatura
   * existe, é desta família, ainda pode ser paga, e a Lytex está
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
    if (!this.lytexClient.isConfigured()) {
      throw new BadRequestException(
        "Pagamento pelo app ainda não disponível: combine a mensalidade direto com a transportadora.",
      );
    }

    return fatura;
  }

  /**
   * Cria a cobrança na Lytex e grava o vínculo na fatura.
   *
   * O cliente da cobrança é o RESPONSÁVEL (a família é quem paga), não
   * a transportadora: por isso o cliente da Lytex é buscado pelo id dele
   * na Rotta e reaproveitado quando já existe.
   *
   * ## Os dois caminhos, e o que muda entre eles
   *
   * **Emissor `SUBCONTA`**: a cobrança nasce em nome da transportadora,
   * pelo header `subRecipientId`. O dinheiro cai na conta dela, com a
   * retenção dela, e o split manda a NOSSA taxa para o `_recipientId` da
   * Rotta. Não há chave de terceiro envolvida: é a credencial da
   * plataforma que assina a chamada.
   *
   * **Emissor `ROTTA`**: a cobrança é da nossa conta e o split manda
   * para a subconta o que sobra depois da nossa taxa. É o caminho de
   * quem ainda não teve o split liberado pelo KYC, e também o da
   * transportadora sem subconta nenhuma, que nesse caso sai sem split
   * mesmo e vira crédito no Rotta Pay.
   */
  private async criarCobranca(
    fatura: {
      id: string;
      companyId: string;
      responsavelId: string;
      valorCentavos: number;
      vencimento: Date;
      lytexClientId: string | null;
      company: { nomeFantasia: string };
    },
    meio: "PIX" | "BOLETO",
  ): Promise<string> {
    const clientId =
      fatura.lytexClientId ?? (await this.resolverClienteLytex(fatura.responsavelId));

    const conta = await this.paymentAccountRepository.findByCompanyIdAcrossTenants(
      fatura.companyId,
    );

    const emitirPelaSubconta = this.emissorEhSubconta(conta);
    /* O percentual da Rotta é por MEIO de pagamento (tabela do CFO de
       18/10: Pix e boleto 1,29%), então o meio precisa chegar até aqui.
       Um boleto emitido com a taxa do Pix seria um erro invisível. */
    const split = this.subcontas.montarSplit(
      conta,
      meio,
      emitirPelaSubconta ? "SUBCONTA" : "ROTTA",
      this.config.rottaRecipientId,
    );

    const cobranca = await this.lytexClient.createInvoice(
      {
        _clientId: clientId,
        items: [
          {
            name: `Transporte escolar, ${fatura.company.nomeFantasia}`,
            quantity: 1,
            /* Centavos, inteiro: é assim que a Lytex trabalha, e é
               assim que a fatura já guarda. Nenhuma divisão por 100, e
               nenhum arredondamento no meio do caminho. */
            value: fatura.valorCentavos,
          },
        ],
        dueDate: fatura.vencimento.toISOString(),
        paymentMethods: meiosDaCobranca(meio),
        description: `Transporte escolar, ${fatura.company.nomeFantasia}`,
        /* O prefixo é o que diz ao webhook de que fluxo esta cobrança é
           (ver `FAMILY_INVOICE_ID_PREFIX`). */
        referenceId: `${FAMILY_INVOICE_ID_PREFIX}${fatura.id}`,
        split,
      },
      emitirPelaSubconta ? subRecipientDe(conta) : undefined,
    );

    await this.invoiceRepository.update(fatura.id, {
      lytexInvoiceId: cobranca._id,
      lytexClientId: clientId,
      meioDePagamento: meio,
      linkDaFatura: cobranca.linkCheckout ?? null,
      /* Só o boleto tem linha digitável, e ela pode não vir na criação:
         o registro bancário é assíncrono do lado da Lytex. */
      linhaDigitavel: cobranca.paymentMethods?.boleto?.digitableLine ?? null,
      /* Registrado na criação, não na confirmação: é no momento de criar
         a cobrança que o destino do dinheiro é decidido. */
      repasseDiretoAoTransportador: emitirPelaSubconta,
    });

    if (!emitirPelaSubconta) {
      this.logger.log(
        `Fatura ${fatura.id}: cobranca emitida pela conta da Rotta (transportadora ${fatura.companyId} ${conta?.lytexSubAccountId ? "tem subconta, mas o emissor nao e SUBCONTA ou o split ainda nao foi liberado" : "ainda nao tem subconta Lytex"}). ${split ? "O split repassa a parte dela." : "Sem split: o valor cai na conta da Rotta e e creditado no Rotta Pay."}`,
      );
    }

    return cobranca._id;
  }

  /**
   * O cliente do responsável na Lytex, reaproveitado, nunca duplicado.
   *
   * ## O CPF é o único bloqueio real da cobrança da família
   *
   * A Lytex exige `type`, `name` e `cpfCnpj` para criar um cliente
   * (`POST /v2/clients`, esquema conferido em 23/10/2026). E desde
   * 14/09/2026, por decisão do fundador, a Rotta **não coleta CPF de
   * Responsável** no cadastro: "para os responsáveis não pegamos esses
   * dados, apenas o nome e telefone".
   *
   * Então quem chega aqui sem CPF não tem como ser cobrado por nenhum
   * caminho. `cpfInformado` é a saída: quem está criando a cobrança
   * (transportadora, que tem o contrato em mãos, ou o Admin Rotta)
   * informa o número, ele é gravado no cadastro e serve da próxima vez.
   * A troca de provedora não mexeu nisso: o documento de quem paga é
   * exigência das duas.
   *
   * ## A busca é pelo nosso id, não pelo CPF
   *
   * `referenceId` guarda o id do Responsável na Rotta. É a nossa chave,
   * ela não muda, e não depende de a Lytex normalizar documento do mesmo
   * jeito que nós. Procurar por CPF acharia duas pessoas diferentes para
   * o mesmo número digitado com e sem pontuação, e a família receberia
   * duas cobranças.
   *
   * O celular vai junto porque é por ele que a provedora avisa a família
   * da cobrança, e uma família sem conta na Rotta depende desse aviso.
   */
  private async resolverClienteLytex(
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

    const existente = await this.lytexClient.findClientByReferenceId(responsavel.id);
    if (existente) return existente._id;

    const criado = await this.lytexClient.createClient({
      /* Responsável é sempre pessoa física: quem contrata transporte
         escolar para um filho é uma pessoa, não uma empresa. */
      type: "pf",
      name: responsavel.nome,
      cpfCnpj: responsavel.cpf.replace(/\D/g, ""),
      email: responsavel.email,
      cellphone: responsavel.telefone.replace(/\D/g, ""),
      /* Neutro: a Rotta não pergunta pronome de tratamento a ninguém, e
         escolher um por conta própria erraria com metade das famílias. */
      treatmentPronoun: "you",
      referenceId: responsavel.id,
    });
    return criado._id;
  }

  /**
   * O webhook da Lytex confirmou o pagamento de uma fatura da família.
   *
   * Idempotente: fatura já `PAGA` sai sem fazer nada. Webhook é
   * reentregue, e creditar duas vezes a carteira de um transportador é o
   * tipo de erro que só aparece no dia do saque.
   */
  async confirmarPagamento(input: {
    lytexInvoiceId: string;
    valorPagoCentavos: number;
    taxaDoProvedorCentavos: number | null;
    pagoEm: Date;
  }): Promise<void> {
    const fatura = await this.invoiceRepository.findByLytexInvoiceIdAcrossTenants(
      input.lytexInvoiceId,
    );
    if (!fatura) {
      this.logger.warn(
        `Webhook Lytex de fatura da familia sem fatura correspondente (lytexInvoiceId ${input.lytexInvoiceId}).`,
      );
      return;
    }
    if (fatura.status === "PAGA") {
      this.logger.debug(`Fatura ${fatura.id} ja estava paga: webhook reentregue, nada a fazer.`);
      return;
    }

    const repasseCentavos = input.valorPagoCentavos - (input.taxaDoProvedorCentavos ?? 0);

    /* `updateAcrossTenants`, e nao `update`: quem chama isto e o webhook
       da Lytex, que entra por rota `@Public()` e por isso nao tem
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
        `Fatura ${fatura.id} paga em nome da subconta: o valor foi direto para a conta Lytex da transportadora, sem credito no Rotta Pay.`,
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

  /** Pagamento estornado na Lytex: a fatura volta a existir como `ESTORNADA`, nunca é apagada. */
  async registrarEstorno(lytexInvoiceId: string): Promise<void> {
    const fatura = await this.invoiceRepository.findByLytexInvoiceIdAcrossTenants(lytexInvoiceId);
    if (!fatura) return;
    /* `updateAcrossTenants` pelo mesmo motivo de `confirmarPagamento`:
       chamado pelo webhook, que nao tem contexto de tenant. */
    await this.invoiceRepository.updateAcrossTenants(fatura.id, { status: "ESTORNADA" });
    this.logger.warn(
      `Fatura ${fatura.id} estornada na Lytex. O credito correspondente no Rotta Pay, se houver, precisa de ajuste manual (Admin Rotta) -- estorno automatico de carteira nao esta implementado.`,
    );
  }

  // ---------------------------------------------------------------------
  // Conta de recebimento do transportador
  // ---------------------------------------------------------------------

  /**
   * Passa pelo mapeador, e não devolve a linha do banco.
   *
   * A tabela guarda `asaasApiKeyCifrada`, resto do desenho anterior, em
   * que a custódia exigia a chave de API da subconta. Entregar o objeto
   * cru punha essa chave na resposta HTTP. Na Lytex nenhuma chave de
   * terceiro é guardada, mas o mapeador continua sendo o caminho único
   * de saída: o dia em que outra coluna sensível aparecer, ela já nasce
   * fora da resposta.
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

    if (conta?.lytexSubAccountId) return { conta: toContaDeRecebimentoResponse(conta) };

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
   * Pergunta à Lytex o que mudou nesta subconta, e grava o que voltou.
   *
   * ## Por que uma leitura escreve
   *
   * Porque a Lytex não documenta webhook de situação de subconta. Sem
   * esta consulta, uma conta aprovada pelo KYC ficaria em "em análise"
   * na tela para sempre, e o transportador não teria como saber que já
   * pode receber.
   *
   * É cache, não regra de negócio: o que vem da Lytex é a verdade, e
   * isto só guarda a resposta para a próxima tela não precisar pedir de
   * novo.
   *
   * ## Por que só enquanto não está ativa
   *
   * Conta ativa não tem o que sincronizar, e cobrar uma chamada de rede
   * a cada abertura da tela de dinheiro seria pagar por nada. Conta
   * recusada também para: o caminho dali é o suporte, não uma consulta.
   *
   * ## Falha de rede não derruba a tela
   *
   * A tela de dinheiro mostra saldo, faturas e vencimentos, que são
   * dados nossos. A Lytex fora do ar não pode esconder nada disso: a
   * sincronização vira aviso no log e a conta é devolvida como está.
   */
  private async sincronizarSubconta(conta: CompanyPaymentAccount): Promise<CompanyPaymentAccount> {
    const precisa = conta.lytexSubAccountId && conta.status === "EM_ANALISE";
    if (!precisa) return conta;

    let resultado: Awaited<ReturnType<LytexSubcontasService["sincronizar"]>>;
    try {
      resultado = await this.subcontas.sincronizar(conta.lytexSubAccountId!);
    } catch (erro) {
      this.logger.warn(
        `Nao foi possivel sincronizar a subconta ${conta.lytexSubAccountId} (empresa ${conta.companyId}): ${erro instanceof Error ? erro.message : String(erro)}. A tela segue com o estado guardado.`,
      );
      return conta;
    }

    const mudancas: UpsertCompanyPaymentAccountData = {};
    if (resultado.status !== conta.status) mudancas.status = resultado.status;
    if (resultado.recipientId && resultado.recipientId !== conta.lytexRecipientId) {
      mudancas.lytexRecipientId = resultado.recipientId;
    }
    if (resultado.splitLiberado !== conta.lytexSplitLiberado) {
      mudancas.lytexSplitLiberado = resultado.splitLiberado;
    }

    if (Object.keys(mudancas).length === 0) return conta;

    this.logger.log(
      `Subconta Lytex ${conta.lytexSubAccountId} (empresa ${conta.companyId}) sincronizada: ${Object.keys(mudancas).join(", ")}.`,
    );
    return this.paymentAccountRepository.upsert(conta.companyId, mudancas);
  }

  /**
   * O transportador informa a chave Pix de saque. `lytexRecipientId` e
   * `taxaDaPlataformaBps` NÃO entram por aqui de propósito: subconta e
   * comissão são decisões da Rotta, não do cliente, e um transportador
   * que pudesse escrever o próprio `lytexRecipientId` redirecionaria o
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
  // Subconta Lytex do transportador
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
   * Cria a subconta na Lytex e grava, numa operação, tudo o que ela
   * devolveu.
   *
   * ## Por que recusa a segunda
   *
   * Porque duas subcontas para o mesmo CNPJ deixariam a primeira órfã na
   * Lytex, possivelmente já com saldo, e não há desfazer. A razão mudou
   * com a troca de provedora (no Asaas era a chave de API que só
   * aparecia uma vez), mas a recusa continua valendo pelo que sempre
   * importou: saldo de transportador não pode ficar numa conta que
   * ninguém mais consulta.
   *
   * ## Por que o formulário tem um campo só
   *
   * Os outros já estão no cadastro da transportadora, conferidos na
   * Receita quando ela entrou. É isso que faz o transportador nunca
   * precisar abrir a Lytex: a conta dele nasce do que a Rotta já sabe.
   */
  private async criarSubconta(
    companyId: string,
    actor: AuthenticatedUser,
    dados: DadosDaSubconta,
  ): Promise<ContaDeRecebimentoResponse> {
    const existente = await this.paymentAccountRepository.findByCompanyId(companyId);
    if (existente?.lytexSubAccountId) {
      throw new BadRequestException(
        "Esta transportadora já tem subconta na Lytex. Criar uma segunda deixaria a primeira sem ninguém olhando, possivelmente com saldo dela dentro.",
      );
    }

    const empresa = await this.companiesService.findByIdOrThrow(companyId, actor);

    const subconta = await this.subcontas.criarSubconta({
      /* Razão social, e não nome fantasia: para a Lytex este é o titular
         de uma conta de pagamento, e o nome tem que bater com o
         documento. O fantasia vai no campo próprio. */
      razaoSocial: empresa.razaoSocial,
      nomeFantasia: empresa.nomeFantasia,
      cpfCnpj: empresa.cpfCnpj,
      tipo: empresa.tipo,
      /* O e-mail da empresa, e não o do financeiro que o formulário
         pode informar: é o endereço do titular da conta. Um e-mail de
         contador no lugar faria a transportadora perder o acesso à
         própria conta de recebimento. */
      email: dados.email ?? empresa.email,
      telefone: dados.telefone ?? empresa.telefone,
      endereco: empresa.endereco,
      numero: empresa.numero,
      complemento: empresa.complemento ?? undefined,
      bairro: empresa.bairro,
      cidade: empresa.cidade,
      uf: empresa.estado,
      cep: empresa.cep,
      faturamentoMensalCentavos: dados.faturamentoMensalCentavos,
    });

    /* `EM_ANALISE`, nunca `ATIVA`: a conta nasce antes de o KYC terminar
       e antes de o split ser liberado. Dizer "ativa" aqui seria prometer
       recebimento que ainda não existe. Quem tira dali é
       `sincronizarSubconta`, e só com `splitAutorization`. */
    const conta = await this.paymentAccountRepository.upsert(companyId, {
      status: "EM_ANALISE",
      lytexSubAccountId: subconta._id,
      lytexRecipientId: subconta._recipientId ?? subconta._id,
      lytexSplitLiberado: Boolean(subconta.splitAutorization),
    });

    this.logger.log(
      /* Esta é a "linha de confirmação" que o aviso de
         `LytexSubcontasService.criarSubconta` promete: se ela não
         aparecer, a subconta ficou órfã no provedor. */
      `Subconta Lytex ${subconta._id} GRAVADA para a empresa ${companyId} por ${actor.role} ${actor.sub}.`,
    );

    return toContaDeRecebimentoResponse(conta);
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
   * Porque elas se condicionam. A retenção segue a conta que recebe, e
   * quem recebe só é a transportadora quando o emissor é `SUBCONTA`. Em
   * endpoints separados daria para ligar custódia numa transportadora
   * cuja cobrança é emitida pela Rotta, o que não retém nada dela.
   *
   * ## A custódia na Lytex não é um botão nosso
   *
   * No Asaas havia um endpoint para ligar e desligar escrow por
   * subconta. Na Lytex a retenção é o `floatConfig` da subconta, que o
   * suporte confirmou em 22/10/2026 existir com boleto em D+2 e Pix em
   * D+0, e que **não é configurável pela API publicada**: não há rota
   * para escrevê-lo. Então o que este método faz com `custodia` é
   * registrar a intenção no nosso banco, para a tela dizer a verdade, e
   * avisar no log que a mudança efetiva é com o comercial da Lytex.
   * Fingir que a chamada existe seria pior do que não ter o botão.
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
        if (!conta.lytexSubAccountId) {
          throw new BadRequestException(
            "Para a transportadora emitir a própria cobrança é preciso ter subconta na Lytex, e esta conta não tem. Abra a subconta pela Rotta antes de virar o emissor.",
          );
        }
        if (!conta.lytexSplitLiberado) {
          throw new BadRequestException(
            "A Lytex ainda não liberou o split desta subconta. Com o emissor em `SUBCONTA` e o split bloqueado, a cobrança sairia em nome dela e a taxa da Rotta não seria repassada. Espere a liberação do KYC.",
          );
        }
        if (conta.status !== "ATIVA") {
          throw new BadRequestException(
            `A subconta desta transportadora está em "${conta.status}". Enquanto a Lytex não aprovar, a cobrança emitida por ela não é paga. Espere a aprovação antes de virar o emissor.`,
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

      /* Nenhuma chamada à Lytex aqui, e isto é a honestidade do método,
         não um atalho: `floatConfig` não tem rota de escrita na API
         publicada. O registro vale para a tela e para a conciliação; a
         retenção em si é combinada com o comercial. */
      this.logger.warn(
        `Custodia da empresa ${companyId} marcada como ${dados.custodia.ativa ? "ATIVA" : "INATIVA"} no banco da Rotta. A retencao efetiva e o floatConfig da subconta ${conta.lytexSubAccountId ?? "(sem subconta)"} na Lytex, que NAO tem endpoint de escrita: ajuste com o comercial deles.`,
      );

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
      cobrancaMensalAtiva: Boolean(contrato.lytexSubscriptionId),
      statusDaAssinatura: contrato.lytexSubscriptionStatus,
      precisaDeCpf: !contrato.responsavel.cpf,
      /* O que impede ligar agora, em uma frase, para a tela não ter que
         repetir as regras do serviço e poder divergir delas. */
      impedimento: this.impedimentoParaCobrar(contrato),
    }));
  }

  private impedimentoParaCobrar(contrato: {
    status: string;
    valorMensalidadeCentavos: number;
    lytexSubscriptionId: string | null;
  }): string | null {
    if (contrato.lytexSubscriptionId) return null;
    if (contrato.status !== "ATIVO") {
      return "O contrato precisa estar ativo.";
    }
    if (contrato.valorMensalidadeCentavos <= 0) {
      return "A mensalidade está em R$ 0,00: combine o valor com a família e registre no contrato.";
    }
    if (!this.lytexClient.isConfigured()) {
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
   * Cria na Lytex a recorrência que cobra a família todo mês.
   *
   * ## O que isto muda para a família
   *
   * Sem ela, a cobrança só existe quando o Responsável abre o app e toca
   * em "pagar": é ele que dispara a criação. Com a recorrência, a Lytex
   * gera a cobrança de cada mês sozinha, e **o Responsável não precisa
   * de conta na Rotta para nada**: ele recebe o link da cobrança
   * hospedada e paga ali, por Pix ou boleto.
   *
   * Quem precisa de conta é só o transportador, e a dele é a subconta
   * (autônomo, MEI ou sociedade).
   *
   * ## A assinatura é emitida pela conta da Rotta, e isso não é escolha
   *
   * A Lytex publica `subRecipientId` para faturas, saques e consultas de
   * subconta, **não para `/v2/subscriptions`**. Então a recorrência nasce
   * na nossa conta, e o split manda para a subconta o que sobra depois
   * da nossa taxa: o inverso da fatura avulsa, que nasce na conta dela.
   *
   * A consequência prática, para não ser descoberta num fechamento: a
   * retenção que vale para a assinatura é a da conta da Rotta, não a da
   * subconta. Quando a Lytex liberar assinatura por subconta, muda uma
   * linha aqui e `montarSplit` já sabe tratar os dois sentidos.
   *
   * ## A ordem das operações não é arbitrária
   *
   * Criar assinatura é irreversível de um jeito pior que criar subconta:
   * subconta órfã fica parada, **assinatura órfã cobra a família todo
   * mês** e ninguém na Rotta sabe que ela existe. Por isso tudo que pode
   * falhar acontece ANTES da chamada, e o `id` vai para o log no
   * instante em que a resposta chega.
   *
   * ## Por que a segunda assinatura é recusada
   *
   * Duas recorrências no mesmo contrato cobram a mesma família duas
   * vezes por mês, e o estrago aparece no extrato dela, não no nosso.
   * `Contract.lytexSubscriptionId` é `@unique` e a recusa vem antes da
   * chamada à Lytex.
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

    if (contrato.lytexSubscriptionId) {
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
    if (!this.lytexClient.isConfigured()) {
      throw new BadRequestException(
        "A cobrança automática ainda não está disponível nesta implantação. Nada foi criado.",
      );
    }

    const clientId = await this.resolverClienteLytex(contrato.responsavelId, {
      cpfInformado: dados.cpfDoResponsavel,
    });

    const conta = await this.paymentAccountRepository.findByCompanyIdAcrossTenants(
      contrato.companyId,
    );

    const meio = dados.meioDePagamento ?? "PIX";
    const emitirPelaSubconta = this.emissorEhSubconta(conta);
    /* `UNDEFINED` deixa o pagador escolher na página da cobrança; para
       efeito de taxa vale o percentual do Pix, que é o meio que a
       família de fato usa. */
    const split = this.subcontas.montarSplit(
      conta,
      meio === "BOLETO" ? "BOLETO" : "PIX",
      emitirPelaSubconta ? "SUBCONTA" : "ROTTA",
      this.config.rottaRecipientId,
    );

    const primeiroVencimento = await this.primeiroVencimentoDaAssinatura(
      contrato.id,
      dados.diaDeVencimento ?? DIA_DE_VENCIMENTO_PADRAO,
    );

    const assinatura = await this.lytexClient.createSubscription({
      _clientId: clientId,
      items: [
        {
          name: `Transporte escolar de ${contrato.student.nome}`,
          quantity: 1,
          value: contrato.valorMensalidadeCentavos,
        },
      ],
      type: "monthly",
      nextDueDate: primeiroVencimento.toISOString(),
      /* Sem limite, a recorrência continua cobrando depois de o contrato
         acabar. `vigenciaFim` é `null` em contrato sem fim combinado, e
         aí `infinity` é a verdade: a cobrança para quando alguém
         cancelar. */
      duration: duracaoDaAssinatura(primeiroVencimento, contrato.vigenciaFim),
      paymentMethods: meiosDaCobranca(meio),
      description: `Transporte escolar de ${contrato.student.nome}, ${contrato.company.nomeFantasia}`,
      /* O mesmo prefixo das cobranças avulsas, mas apontando para o
         CONTRATO: toda cobrança que a recorrência gerar herda este
         valor, então ele não pode identificar um mês. Quem identifica o
         mês é o vencimento da cobrança gerada. */
      referenceId: `${FAMILY_CONTRACT_ID_PREFIX}${contrato.id}`,
      split,
    });

    /* Antes de qualquer coisa que possa falhar: uma assinatura criada
       que não foi gravada aqui é uma recorrência invisível cobrando uma
       família de verdade. Mesma lição da subconta órfã, com
       consequência pior porque esta repete todo mês. */
    this.logger.warn(
      `Assinatura ${assinatura._id} criada na Lytex para o contrato ${contrato.id} (aluno ${contrato.studentId}, responsavel ${contrato.responsavelId}). Se nao houver uma linha de confirmacao logo abaixo desta, ela ficou ORFA no provedor e seguira cobrando a familia todo mes: cancele por PUT /v2/subscriptions/cancel/${assinatura._id}.`,
    );

    await this.invoiceRepository.atualizarAssinaturaDoContratoAcrossTenants(contrato.id, {
      lytexSubscriptionId: assinatura._id,
      lytexSubscriptionStatus: assinatura.status ?? null,
      assinaturaCriadaEm: new Date(),
    });

    this.logger.log(
      `Assinatura Lytex ${assinatura._id} GRAVADA no contrato ${contrato.id}: ${meio}, ${formatarCentavos(contrato.valorMensalidadeCentavos)}/mes, primeiro vencimento ${primeiroVencimento.toISOString().slice(0, 10)}, split ${split ? "sim" : "nao"}, emissor ${emitirPelaSubconta ? "SUBCONTA" : "ROTTA"}.`,
    );

    return {
      contractId: contrato.id,
      lytexSubscriptionId: assinatura._id,
      status: assinatura.status ?? "desconhecido",
      meioDePagamento: meio,
      valorCentavos: contrato.valorMensalidadeCentavos,
      valorFormatado: formatarCentavos(contrato.valorMensalidadeCentavos),
      primeiroVencimento: primeiroVencimento.toISOString().slice(0, 10),
      ultimoVencimento: contrato.vigenciaFim
        ? contrato.vigenciaFim.toISOString().slice(0, 10)
        : null,
      repasseDiretoAoTransportador: emitirPelaSubconta,
    };
  }

  /**
   * Liga ao mês certo a cobrança que a recorrência gerou.
   *
   * ## Por que não dá para só gravar
   *
   * A Lytex gera a cobrança do ciclo antes do vencimento, então
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
    evento: string;
    lytexSubscriptionId: string;
    lytexInvoiceId: string;
    contractId: string;
    vencimento: string;
    /**
     * O valor que o provedor diz, em centavos.
     *
     * Chega e não é usado para gravar, de propósito: o valor da fatura
     * vem do CONTRATO, pelo mesmo motivo de `gerarFaturasDaCompetencia`.
     * A fatura é documento financeiro nosso, e o valor dela é o
     * combinado com a família, não o que voltou de um webhook.
     */
    valorCentavos: number;
    linkDaFatura?: string | null;
    linhaDigitavel?: string | null;
    meioDePagamento?: string | null;
  }): Promise<void> {
    const contrato = await this.invoiceRepository.findContratoPorAssinaturaAcrossTenants(
      evento.lytexSubscriptionId,
    );
    if (!contrato) {
      this.logger.warn(
        `Cobranca ${evento.lytexInvoiceId} gerada pela assinatura ${evento.lytexSubscriptionId}, que nao pertence a nenhum contrato da Rotta (evento "${evento.evento}"). Ignorada.`,
      );
      return;
    }

    /* A referencia vem do payload e a assinatura vem do banco: se as
       duas discordam, alguma das pontas esta apontando para o contrato
       errado, e gravar seria cobrar uma familia na fatura de outra. */
    if (contrato.id !== evento.contractId) {
      this.logger.warn(
        `Cobranca ${evento.lytexInvoiceId}: a assinatura ${evento.lytexSubscriptionId} esta no contrato ${contrato.id}, mas a referencia da cobranca diz contrato ${evento.contractId}. Nada foi ligado.`,
      );
      return;
    }

    const vencimento = new Date(`${evento.vencimento}T00:00:00.000Z`);
    if (Number.isNaN(vencimento.getTime())) {
      this.logger.warn(
        `Cobranca ${evento.lytexInvoiceId} com vencimento ilegivel ("${evento.vencimento}"): nao da para saber de qual mes e. Nada foi ligado.`,
      );
      return;
    }
    const competencia = competenciaDe(vencimento);

    const existente = await this.invoiceRepository.findPorContratoECompetenciaAcrossTenants(
      contrato.id,
      competencia,
    );

    if (existente?.lytexInvoiceId === evento.lytexInvoiceId) {
      this.logger.debug(
        `Cobranca ${evento.lytexInvoiceId} ja estava ligada a fatura ${existente.id}: webhook reentregue, nada a fazer.`,
      );
      return;
    }
    if (existente?.lytexInvoiceId) {
      this.logger.warn(
        `Fatura ${existente.id} (contrato ${contrato.id}, competencia ${competencia.toISOString().slice(0, 10)}) ja tem a cobranca ${existente.lytexInvoiceId}, e a assinatura gerou outra (${evento.lytexInvoiceId}). A familia pode ter DUAS cobrancas do mesmo mes. Nada foi sobrescrito: confira no painel da Lytex e cancele a que nao for usada.`,
      );
      return;
    }

    const conta = await this.paymentAccountRepository.findByCompanyIdAcrossTenants(
      contrato.companyId,
    );

    const dados = {
      lytexInvoiceId: evento.lytexInvoiceId,
      linkDaFatura: evento.linkDaFatura ?? null,
      linhaDigitavel: evento.linhaDigitavel ?? null,
      meioDePagamento: this.meioDaCobranca(evento.meioDePagamento),
      repasseDiretoAoTransportador: this.emissorEhSubconta(conta),
    };

    if (existente) {
      await this.invoiceRepository.updateAcrossTenants(existente.id, dados);
      this.logger.log(
        `Cobranca ${evento.lytexInvoiceId} da assinatura ${evento.lytexSubscriptionId} ligada a fatura ${existente.id} (competencia ${competencia.toISOString().slice(0, 10)}).`,
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
      `Fatura ${criada.id} criada pela assinatura ${evento.lytexSubscriptionId} (contrato ${contrato.id}, competencia ${competencia.toISOString().slice(0, 10)}, vencimento ${evento.vencimento}) e ligada a cobranca ${evento.lytexInvoiceId}.`,
    );
  }

  /**
   * O meio da cobrança da Lytex traduzido para o da fatura.
   *
   * Meio desconhecido ou ausente vira `null` de propósito: numa
   * cobrança com Pix e boleto ligados, o pagador ainda não escolheu, e
   * gravar um meio nesse caso seria afirmar na tela algo que não
   * aconteceu. O meio real chega no evento de pagamento.
   *
   * Os nomes são os da Lytex, em minúsculas, mas a comparação é
   * insensível a caixa porque o corpo do webhook dela não é
   * documentado, e a diferença entre `pix` e `PIX` não pode decidir se
   * a tela mostra o meio ou não.
   */
  private meioDaCobranca(meio: string | null | undefined): InvoicePaymentMethod | null {
    const conhecidos: Record<string, InvoicePaymentMethod> = {
      pix: "PIX",
      boleto: "BOLETO",
      creditcard: "CARTAO_CREDITO",
      credit_card: "CARTAO_CREDITO",
      debitcard: "CARTAO_DEBITO",
      debit_card: "CARTAO_DEBITO",
    };
    return meio ? (conhecidos[meio.toLowerCase()] ?? null) : null;
  }

  /**
   * O vencimento da primeira cobrança da recorrência.
   *
   * Duas regras, e as duas existem para não cobrar a família duas vezes
   * pelo mesmo mês:
   *
   * 1. **Mês que já tem cobrança na Lytex é pulado.** Se o Responsável
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
      /* Fatura sem `lytexInvoiceId` é só a nossa linha de razão: não
         existe cobrança no provedor, então a recorrência pode cobrir
         este mês. */
      if (fatura?.lytexInvoiceId) continue;

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

/**
 * O `subRecipientId` de uma conta de recebimento.
 *
 * A Lytex devolve `_id` e `_recipientId` na criação da subconta, e nem
 * sempre são iguais. O header quer o id da SUBCONTA; o split quer o id
 * do ESTABELECIMENTO. Esta função existe para o primeiro, e a ordem do
 * `??` é o que impede um ser usado no lugar do outro por descuido.
 */
function subRecipientDe(conta: CompanyPaymentAccount | null): string | undefined {
  return conta?.lytexSubAccountId ?? undefined;
}

/**
 * Por quantos meses a recorrência cobra.
 *
 * Contrato sem fim combinado vira `infinity`, que é a verdade: a
 * cobrança para quando alguém cancelar. Com fim combinado, conta os
 * meses entre o primeiro vencimento e o fim da vigência, inclusive, e
 * nunca menos de um: uma assinatura de zero mês não cobraria nada, e um
 * contrato que termina no mesmo mês da primeira cobrança ainda tem essa
 * cobrança para fazer.
 */
function duracaoDaAssinatura(
  primeiroVencimento: Date,
  vigenciaFim: Date | null,
): { unit: "months" | "years" | "infinity"; value?: number } {
  if (!vigenciaFim) return { unit: "infinity" };

  const meses =
    (vigenciaFim.getUTCFullYear() - primeiroVencimento.getUTCFullYear()) * 12 +
    (vigenciaFim.getUTCMonth() - primeiroVencimento.getUTCMonth()) +
    1;

  return { unit: "months", value: Math.max(1, meses) };
}
