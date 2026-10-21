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
import type { ContractInvoiceRepository } from "./repositories/contract-invoice.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AsaasCompanyType } from "@/modules/billing/types/asaas.types";
import type {
  CompanyPaymentAccount,
  CompanyPaymentAccountStatus,
  CompanyType,
  ContractInvoiceStatus,
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
   * Só Pix nesta entrega. Cartão exigiria o número passando pelo nosso
   * servidor (a Asaas confirmou em 16/10/2026 que não há SDK mobile nem
   * tokenização pelo front), o que colocaria a Rotta em escopo PCI DSS
   * — uma decisão que não é técnica e não foi tomada.
   */
  async abrirPagamentoPix(
    invoiceId: string,
    actor: AuthenticatedUser,
  ): Promise<PagamentoDaFaturaResponseDto> {
    const fatura = await this.invoiceRepository.findByIdAcrossTenants(invoiceId);
    if (!fatura) throw new NotFoundException("Fatura não encontrada.");

    /* A posse é checada pelo ALUNO da fatura, não pelo id dela: é a
       mesma prova usada na leitura, e é o que impede um responsável de
       abrir o Pix da fatura de outra família. */
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

    const asaasPaymentId = fatura.asaasPaymentId ?? (await this.criarCobrancaPix(fatura));
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
   * Cria a cobrança na Asaas e grava o vínculo na fatura.
   *
   * O cliente da cobrança é o RESPONSÁVEL (a família é quem paga), não
   * a transportadora — por isso o `AsaasCustomer` é buscado pelo CPF
   * dele e reaproveitado quando já existe.
   */
  private async criarCobrancaPix(fatura: {
    id: string;
    companyId: string;
    responsavelId: string;
    valorCentavos: number;
    vencimento: Date;
    asaasCustomerId: string | null;
    company: { nomeFantasia: string };
  }): Promise<string> {
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
    const split = this.subcontas.montarSplit(conta, "PIX", this.config.rottaWalletId);
    const emitirPelaSubconta = conta?.emissorDaCobranca === "SUBCONTA";
    const chaveDaSubconta = emitirPelaSubconta
      ? this.subcontas.chaveDaSubconta(
          conta,
          `emitir a cobranca Pix da fatura ${fatura.id} em nome da subconta`,
        )
      : undefined;

    const payment = await this.asaasClient.createPayment(
      {
        customer: customerId,
        billingType: "PIX",
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
      meioDePagamento: "PIX",
      linkDaFatura: payment.invoiceUrl ?? null,
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

  /** O `AsaasCustomer` do responsável — reaproveitado pelo CPF, nunca duplicado. */
  private async resolverClienteAsaas(responsavelId: string): Promise<string> {
    const responsavel = await this.usersService.findById(responsavelId);
    if (!responsavel) {
      throw new NotFoundException("Responsável da fatura não encontrado.");
    }
    if (!responsavel.cpf) {
      throw new BadRequestException(
        "O responsável precisa ter CPF cadastrado para a cobrança ser emitida.",
      );
    }

    const existente = await this.asaasClient.findCustomerByCpfCnpj(responsavel.cpf);
    if (existente) return existente.id;

    const criado = await this.asaasClient.createCustomer({
      name: responsavel.nome,
      cpfCnpj: responsavel.cpf,
      email: responsavel.email,
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

    await this.invoiceRepository.update(fatura.id, {
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
    await this.invoiceRepository.update(fatura.id, { status: "ESTORNADA" });
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
      `Subconta Asaas ${subconta.asaasAccountId} criada para a empresa ${companyId} por ${actor.role} ${actor.sub}.`,
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
