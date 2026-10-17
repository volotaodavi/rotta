import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { formatarCentavos } from "@rotta/utils";

import {
  COMPANY_PAYMENT_ACCOUNT_REPOSITORY,
  CONTRACT_INVOICE_REPOSITORY,
  DIA_DE_VENCIMENTO_PADRAO,
  FAMILY_INVOICE_ID_PREFIX,
} from "./family-billing.constants";
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
import type { CompanyPaymentAccount, ContractInvoiceStatus } from "@prisma/client";

import { AsaasClientService } from "@/modules/billing/asaas-client.service";
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
    private readonly studentsService: StudentsService,
    private readonly usersService: UsersService,
    private readonly walletService: WalletService,
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

    const payment = await this.asaasClient.createPayment({
      customer: customerId,
      billingType: "PIX",
      value: fatura.valorCentavos / 100,
      dueDate: fatura.vencimento.toISOString().slice(0, 10),
      description: `Transporte escolar, ${fatura.company.nomeFantasia}`,
      /* O prefixo é o que diz ao webhook de que fluxo este pagamento é
         (ver `FAMILY_INVOICE_ID_PREFIX`). */
      externalReference: `${FAMILY_INVOICE_ID_PREFIX}${fatura.id}`,
    });

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

  async getContaDeRecebimento(actor: AuthenticatedUser): Promise<CompanyPaymentAccount | null> {
    return this.paymentAccountRepository.findByCompanyId(this.companyIdDoAtor(actor));
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
  ): Promise<CompanyPaymentAccount> {
    const companyId = this.companyIdDoAtor(actor);
    const update: UpsertCompanyPaymentAccountData = { chavePix: dados.chavePix };
    return this.paymentAccountRepository.upsert(companyId, update);
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
