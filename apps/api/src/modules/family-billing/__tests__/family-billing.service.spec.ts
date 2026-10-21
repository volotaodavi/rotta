import { BadRequestException, ForbiddenException, NotFoundException } from "@nestjs/common";

import {
  COMPANY_PAYMENT_ACCOUNT_REPOSITORY,
  CONTRACT_INVOICE_REPOSITORY,
} from "../family-billing.constants";
import { competenciaDe, FamilyBillingService, vencimentoDe } from "../family-billing.service";

import type { CompanyPaymentAccountRepository } from "../repositories/company-payment-account.repository";
import type {
  ContractInvoiceComContexto,
  ContractInvoiceRepository,
} from "../repositories/contract-invoice.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AsaasClientService } from "@/modules/billing/asaas-client.service";
import type { AsaasSubcontasService } from "@/modules/billing/asaas-subcontas.service";
import type { CompaniesService } from "@/modules/companies/companies.service";
import type { StudentsService } from "@/modules/students/students.service";
import type { UsersService } from "@/modules/users/users.service";
import type { WalletService } from "@/modules/wallet/wallet.service";

import { Role } from "@/shared/enums";

const responsavelActor: AuthenticatedUser = {
  sub: "responsavel-1",
  tenantId: null,
  role: Role.RESPONSAVEL,
  vinculoId: "vinculo-responsavel",
};

const empresaActor: AuthenticatedUser = {
  sub: "user-1",
  tenantId: "company-1",
  role: Role.EMPRESA,
  vinculoId: "vinculo-empresa",
};

function buildFatura(
  overrides: Partial<ContractInvoiceComContexto> = {},
): ContractInvoiceComContexto {
  return {
    id: "fatura-1",
    companyId: "company-1",
    contractId: "contrato-1",
    studentId: "student-1",
    responsavelId: "responsavel-1",
    competencia: new Date("2026-04-01T00:00:00.000Z"),
    vencimento: new Date("2026-04-05T00:00:00.000Z"),
    valorCentavos: 66_000,
    status: "A_VENCER",
    asaasPaymentId: null,
    asaasCustomerId: null,
    meioDePagamento: null,
    linkDaFatura: null,
    linhaDigitavel: null,
    pagoEm: null,
    valorPagoCentavos: null,
    taxaDoProvedorCentavos: null,
    repasseCentavos: null,
    repasseDiretoAoTransportador: false,
    canceladaEm: null,
    motivoCancelamento: null,
    createdAt: new Date("2026-04-01T03:00:00.000Z"),
    updatedAt: new Date("2026-04-01T03:00:00.000Z"),
    student: { id: "student-1", nome: "Ana" },
    company: { id: "company-1", nomeFantasia: "Transportes Lima" },
    ...overrides,
  };
}

describe("FamilyBillingService", () => {
  let service: FamilyBillingService;
  /* Só os dois métodos que este serviço chama: o dublê não precisa
     fingir a classe inteira, e declarar menos deixa o teste dizer o que
     realmente depende. */
  let subcontas: Pick<
    AsaasSubcontasService,
    "montarSplit" | "chaveDaSubconta" | "criarSubconta" | "sincronizar"
  >;
  let companiesService: Pick<CompaniesService, "findByIdOrThrow">;
  let invoiceRepository: jest.Mocked<ContractInvoiceRepository>;
  let paymentAccountRepository: jest.Mocked<CompanyPaymentAccountRepository>;
  let asaasClient: jest.Mocked<AsaasClientService>;
  let studentsService: jest.Mocked<StudentsService>;
  let usersService: jest.Mocked<UsersService>;
  let walletService: jest.Mocked<WalletService>;

  beforeEach(() => {
    invoiceRepository = {
      create: jest.fn(),
      findById: jest.fn(),
      update: jest.fn(),
      list: jest.fn().mockResolvedValue({ items: [], total: 0 }),
      listByStudentAcrossTenants: jest.fn().mockResolvedValue([]),
      findByIdAcrossTenants: jest.fn(),
      findByAsaasPaymentIdAcrossTenants: jest.fn(),
      listContratosSemFaturaAcrossTenants: jest.fn().mockResolvedValue([]),
      marcarVencidasAcrossTenants: jest.fn().mockResolvedValue(0),
      findContratoParaAssinarAcrossTenants: jest.fn(),
      findContratoPorAssinaturaAcrossTenants: jest.fn(),
      atualizarAssinaturaDoContratoAcrossTenants: jest.fn(),
      findPorContratoECompetenciaAcrossTenants: jest.fn().mockResolvedValue(null),
      /* O webhook escreve por estes dois, e nao por `update`/`create`:
         a rota dele e `@Public()`, nao tem contexto de tenant, e a
         politica de RLS de `contract_invoices` seria falsa para toda
         linha. Ver a nota no repositorio. */
      updateAcrossTenants: jest.fn(),
      createAcrossTenants: jest.fn(),
    };
    paymentAccountRepository = {
      findByCompanyId: jest.fn(),
      upsert: jest.fn(),
      findByCompanyIdAcrossTenants: jest.fn().mockResolvedValue(null),
      findByAsaasAccountIdAcrossTenants: jest.fn().mockResolvedValue(null),
      upsertAcrossTenants: jest.fn(),
    };
    asaasClient = {
      isConfigured: jest.fn().mockReturnValue(true),
      createPayment: jest.fn(),
      createSubscription: jest.fn(),
      getPixQrCode: jest.fn(),
      findCustomerByCpfCnpj: jest.fn(),
      createCustomer: jest.fn(),
    } as unknown as jest.Mocked<AsaasClientService>;
    studentsService = {
      findByIdOrThrow: jest.fn().mockResolvedValue({ id: "student-1", nome: "Ana" }),
    } as unknown as jest.Mocked<StudentsService>;
    usersService = {
      findById: jest.fn(),
      registrarCpfDoResponsavel: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;
    walletService = {
      creditarRecebimentoDeFatura: jest.fn(),
    } as unknown as jest.Mocked<WalletService>;

    /*
      `subcontas` e `config` entraram em 20/10/2026, com o split. O
      duble devolve `undefined` em `montarSplit` para que o
      comportamento padrao do teste continue sendo "cobranca sem split",
      que e o que a transportadora sem subconta tem hoje.
    */
    subcontas = {
      montarSplit: jest.fn().mockReturnValue(undefined),
      chaveDaSubconta: jest.fn(),
      criarSubconta: jest.fn(),
      /* `sincronizar` nao faz nada por padrao: a maioria dos testes nao
         e sobre a conversa com o Asaas, e o estado gravado continua
         valendo quando ela nao traz nada. */
      sincronizar: jest.fn().mockResolvedValue({ onboardingUrl: null, situacaoGeral: null }),
    };

    /* O cadastro da transportadora é a fonte dos dados do titular da
       subconta: é por isso que o formulário pede um campo só. */
    companiesService = {
      findByIdOrThrow: jest.fn().mockResolvedValue({
        id: "company-1",
        razaoSocial: "Transportes Lima LTDA",
        nomeFantasia: "Transportes Lima",
        cpfCnpj: "12345678000190",
        email: "contato@lima.com.br",
        telefone: "21999990000",
        cep: "24900000",
        endereco: "Avenida Roberto Silveira",
        numero: "1180",
        complemento: null,
        bairro: "Centro",
      }),
    };

    service = new FamilyBillingService(
      invoiceRepository,
      paymentAccountRepository,
      asaasClient,
      subcontas as AsaasSubcontasService,
      { rottaWalletId: undefined } as never,
      studentsService,
      usersService,
      walletService,
      companiesService as CompaniesService,
    );
  });

  /*
    Este teste existe por causa de um defeito real, criado e consertado
    em 20/10/2026: a tabela ganhou `asaasApiKeyCifrada` e o endpoint
    devolvia a linha do banco inteira, pondo a chave de API da subconta
    do transportador na resposta HTTP.

    Cifrada nao e desculpa, porque a chave de cifra mora no mesmo
    servidor. O compromisso assumido quando o fundador autorizou guardar
    chave de terceiro foi "nunca em log nem em resposta de API", e e
    isso que este teste guarda.
  */
  describe("a chave da subconta nunca sai na resposta", () => {
    const contaComChave = {
      id: "conta-1",
      companyId: "empresa-1",
      status: "ATIVA",
      asaasWalletId: "wallet-1",
      asaasAccountId: "acc_1",
      asaasApiKeyCifrada: "iv:tag:SEGREDO",
      asaasOnboardingUrl: null,
      chavePix: "chave@pix",
      emissorDaCobranca: "ROTTA",
      custodiaAtiva: false,
      custodiaDiasParaLiberar: null,
      taxaDaPlataformaBps: 0,
      taxaPixBps: 129,
      taxaBoletoBps: 129,
      taxaCreditoVistaBps: 99,
      taxaCreditoParceladoBps: 49,
      observacoes: null,
    };

    const atorDaEmpresa = {
      id: "user-1",
      role: Role.EMPRESA,
      tenantId: "empresa-1",
    } as AuthenticatedUser;

    it("ao ler a conta de recebimento", async () => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue(contaComChave as never);

      const resposta = await service.getContaDeRecebimento(atorDaEmpresa);

      /* A resposta inteira, e nao so a conta: o envelope ganhou
         `dadosParaAbrirConta`, e um vazamento ali contaria igual. */
      expect(JSON.stringify(resposta)).not.toContain("SEGREDO");
      expect(resposta.conta).not.toHaveProperty("asaasApiKeyCifrada");
      /* O que a tela precisa saber e se DA para emitir pela subconta,
         e para isso nao precisa ver a chave. */
      expect(resposta.conta?.podeEmitirPelaSubconta).toBe(true);
    });

    it("ao salvar a chave Pix", async () => {
      paymentAccountRepository.upsert.mockResolvedValue(contaComChave as never);

      const resposta = await service.salvarContaDeRecebimento(atorDaEmpresa, {
        chavePix: "nova@pix",
      });

      expect(JSON.stringify(resposta)).not.toContain("SEGREDO");
      expect(resposta).not.toHaveProperty("asaasApiKeyCifrada");
    });
  });

  it("os tokens de injecao existem (o modulo nao sobe sem eles)", () => {
    expect(CONTRACT_INVOICE_REPOSITORY).toBeDefined();
    expect(COMPANY_PAYMENT_ACCOUNT_REPOSITORY).toBeDefined();
  });

  describe("competência e vencimento", () => {
    it("competência é sempre o primeiro dia do mês, em UTC", () => {
      expect(competenciaDe(new Date("2026-04-23T22:10:00.000Z")).toISOString()).toBe(
        "2026-04-01T00:00:00.000Z",
      );
    });

    /* `new Date(2026, 1, 31)` vira 3 de março em silêncio — o tipo de
       erro que coloca o vencimento da família no mês seguinte. */
    it("dia 31 em fevereiro cai no último dia do mês, nunca vaza para março", () => {
      const fevereiro = competenciaDe(new Date("2026-02-10T00:00:00.000Z"));
      expect(vencimentoDe(fevereiro, 31).toISOString()).toBe("2026-02-28T00:00:00.000Z");
    });

    it("o dia normal é respeitado", () => {
      const abril = competenciaDe(new Date("2026-04-10T00:00:00.000Z"));
      expect(vencimentoDe(abril, 5).toISOString()).toBe("2026-04-05T00:00:00.000Z");
    });
  });

  describe("gerarFaturasDaCompetencia", () => {
    it("emite uma fatura por contrato ativo, com o valor congelado do contrato", async () => {
      invoiceRepository.listContratosSemFaturaAcrossTenants.mockResolvedValue([
        {
          id: "contrato-1",
          companyId: "company-1",
          studentId: "student-1",
          responsavelId: "responsavel-1",
          valorMensalidadeCentavos: 66_000,
        },
      ]);

      const resultado = await service.gerarFaturasDaCompetencia(
        new Date("2026-04-17T12:00:00.000Z"),
      );

      expect(resultado).toMatchObject({
        competencia: "2026-04-01",
        contratosAvaliados: 1,
        faturasCriadas: 1,
        falhas: 0,
      });
      expect(invoiceRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({ valorCentavos: 66_000, contractId: "contrato-1" }),
      );
    });

    it("uma fatura que falha não impede as outras famílias", async () => {
      invoiceRepository.listContratosSemFaturaAcrossTenants.mockResolvedValue([
        {
          id: "contrato-1",
          companyId: "company-1",
          studentId: "s1",
          responsavelId: "r1",
          valorMensalidadeCentavos: 1000,
        },
        {
          id: "contrato-2",
          companyId: "company-1",
          studentId: "s2",
          responsavelId: "r2",
          valorMensalidadeCentavos: 2000,
        },
      ]);
      invoiceRepository.create
        .mockRejectedValueOnce(new Error("banco fora"))
        .mockResolvedValueOnce(buildFatura());

      const resultado = await service.gerarFaturasDaCompetencia();

      expect(resultado.faturasCriadas).toBe(1);
      expect(resultado.falhas).toBe(1);
    });
  });

  describe("getPagamentosDoAluno", () => {
    it("prova a posse do aluno antes de ler fatura nenhuma", async () => {
      studentsService.findByIdOrThrow.mockRejectedValue(new NotFoundException());

      await expect(service.getPagamentosDoAluno("student-1", responsavelActor)).rejects.toThrow(
        NotFoundException,
      );

      expect(invoiceRepository.listByStudentAcrossTenants).not.toHaveBeenCalled();
    });

    it("soma só o que está em aberto e formata o total", async () => {
      invoiceRepository.listByStudentAcrossTenants.mockResolvedValue([
        buildFatura({ id: "f1", status: "A_VENCER", valorCentavos: 66_000 }),
        buildFatura({ id: "f2", status: "VENCIDA", valorCentavos: 66_000 }),
        buildFatura({ id: "f3", status: "PAGA", valorCentavos: 66_000 }),
        buildFatura({ id: "f4", status: "CANCELADA", valorCentavos: 66_000 }),
      ]);

      const resultado = await service.getPagamentosDoAluno("student-1", responsavelActor);

      expect(resultado.totalEmAbertoCentavos).toBe(132_000);
      expect(resultado.totalEmAbertoFormatado).toContain("1.320,00");
      expect(resultado.faturas).toHaveLength(4);
      expect(resultado.resumo.map((g) => g.status).sort()).toEqual([
        "A_VENCER",
        "CANCELADA",
        "PAGA",
        "VENCIDA",
      ]);
    });

    it("sem nada em aberto, o total é nulo em vez de R$ 0,00", async () => {
      invoiceRepository.listByStudentAcrossTenants.mockResolvedValue([
        buildFatura({ status: "PAGA" }),
      ]);

      const resultado = await service.getPagamentosDoAluno("student-1", responsavelActor);

      expect(resultado.totalEmAbertoFormatado).toBeNull();
    });

    it("diz que o pagamento no app não está disponível quando a Asaas não está configurada", async () => {
      asaasClient.isConfigured.mockReturnValue(false);

      const resultado = await service.getPagamentosDoAluno("student-1", responsavelActor);

      expect(resultado.pagamentoNoAppDisponivel).toBe(false);
    });
  });

  describe("abrirPagamentoPix", () => {
    beforeEach(() => {
      invoiceRepository.findByIdAcrossTenants.mockResolvedValue(buildFatura());
      asaasClient.createPayment.mockResolvedValue({
        id: "pay_1",
        customer: "cus_1",
        status: "PENDING",
        billingType: "PIX",
        value: 660,
        invoiceUrl: "https://asaas.test/i/1",
      } as never);
      asaasClient.getPixQrCode.mockResolvedValue({
        success: true,
        encodedImage: "base64==",
        payload: "00020126...",
        expirationDate: "2026-04-05 23:59:59",
      });
      asaasClient.findCustomerByCpfCnpj.mockResolvedValue({
        id: "cus_1",
        name: "Maria",
        cpfCnpj: "12345678900",
      });
      usersService.findById.mockResolvedValue({
        id: "responsavel-1",
        nome: "Maria",
        email: "maria@teste.com.br",
        cpf: "12345678900",
      } as never);
    });

    it("prova a posse pelo ALUNO da fatura, nunca pelo id dela", async () => {
      studentsService.findByIdOrThrow.mockRejectedValue(new NotFoundException());

      await expect(service.abrirPagamentoPix("fatura-1", responsavelActor)).rejects.toThrow(
        NotFoundException,
      );

      expect(studentsService.findByIdOrThrow).toHaveBeenCalledWith("student-1", responsavelActor);
      expect(asaasClient.createPayment).not.toHaveBeenCalled();
    });

    it("cria a cobrança com o prefixo que o webhook usa para reconhecer o fluxo", async () => {
      await service.abrirPagamentoPix("fatura-1", responsavelActor);

      expect(asaasClient.createPayment).toHaveBeenCalledWith(
        expect.objectContaining({
          billingType: "PIX",
          value: 660,
          dueDate: "2026-04-05",
          externalReference: "fatura:fatura-1",
        }),
        /* Segundo argumento: a chave da subconta. `undefined` aqui é o
           caso de hoje, em que a Rotta é a emissora. */
        undefined,
      );
    });

    it("sem subconta, a cobrança sai sem split", async () => {
      await service.abrirPagamentoPix("fatura-1", responsavelActor);

      const [payload] = (asaasClient.createPayment as jest.Mock).mock.calls[0];
      expect(payload.split).toBeUndefined();
    });

    /*
      O split é o que faz o dinheiro da família chegar na transportadora
      sem passar pela mão de ninguém. Se ele for montado e não for
      enviado, o valor inteiro fica na conta da Rotta, e ninguém percebe
      até o fim do mês.
    */
    it("quando há split montado, ele vai junto na cobrança", async () => {
      (subcontas.montarSplit as jest.Mock).mockReturnValue([
        { walletId: "wallet-da-transportadora", percentualValue: 98.71 },
      ]);

      await service.abrirPagamentoPix("fatura-1", responsavelActor);

      const [payload] = (asaasClient.createPayment as jest.Mock).mock.calls[0];
      expect(payload.split).toEqual([
        { walletId: "wallet-da-transportadora", percentualValue: 98.71 },
      ]);
    });

    /* Duas tentativas de pagar a mesma fatura não podem gerar duas
       cobranças, ou a família paga duas vezes. */
    it("reaproveita a cobrança já criada para a mesma fatura", async () => {
      invoiceRepository.findByIdAcrossTenants.mockResolvedValue(
        buildFatura({ asaasPaymentId: "pay_existente" }),
      );

      const resultado = await service.abrirPagamentoPix("fatura-1", responsavelActor);

      expect(asaasClient.createPayment).not.toHaveBeenCalled();
      expect(asaasClient.getPixQrCode).toHaveBeenCalledWith("pay_existente");
      expect(resultado.pixPayload).toBe("00020126...");
    });

    it("registra na fatura se a cobrança saiu com split ou sem", async () => {
      paymentAccountRepository.findByCompanyIdAcrossTenants.mockResolvedValue({
        asaasWalletId: "wal_1",
      } as never);

      await service.abrirPagamentoPix("fatura-1", responsavelActor);

      /* `update`, e nao `updateAcrossTenants`: este caminho e HTTP, com
         ator autenticado e contexto de tenant. Bypass aqui seria
         escrever em tabela com RLS sem precisar. */
      expect(invoiceRepository.update).toHaveBeenCalledWith(
        "fatura-1",
        expect.objectContaining({ repasseDiretoAoTransportador: true }),
      );
    });

    it("recusa pagar fatura já paga", async () => {
      invoiceRepository.findByIdAcrossTenants.mockResolvedValue(buildFatura({ status: "PAGA" }));

      await expect(service.abrirPagamentoPix("fatura-1", responsavelActor)).rejects.toThrow(
        BadRequestException,
      );
    });

    it("sem Asaas configurada, explica em vez de estourar", async () => {
      asaasClient.isConfigured.mockReturnValue(false);

      await expect(service.abrirPagamentoPix("fatura-1", responsavelActor)).rejects.toThrow(
        /ainda não disponível/,
      );
    });

    it("responsável sem CPF não gera cobrança com cliente inventado", async () => {
      usersService.findById.mockResolvedValue({
        id: "responsavel-1",
        nome: "Maria",
        email: "maria@teste.com.br",
        cpf: null,
      } as never);

      await expect(service.abrirPagamentoPix("fatura-1", responsavelActor)).rejects.toThrow(
        BadRequestException,
      );
      expect(asaasClient.createCustomer).not.toHaveBeenCalled();
    });
  });

  describe("confirmarPagamento", () => {
    it("marca paga, calcula o repasse e credita o Rotta Pay do transportador", async () => {
      invoiceRepository.findByAsaasPaymentIdAcrossTenants.mockResolvedValue(buildFatura());

      await service.confirmarPagamento({
        asaasPaymentId: "pay_1",
        valorPagoCentavos: 66_000,
        taxaDoProvedorCentavos: 199,
        pagoEm: new Date("2026-04-03T12:00:00.000Z"),
      });

      expect(invoiceRepository.updateAcrossTenants).toHaveBeenCalledWith(
        "fatura-1",
        expect.objectContaining({
          status: "PAGA",
          valorPagoCentavos: 66_000,
          taxaDoProvedorCentavos: 199,
          repasseCentavos: 65_801,
        }),
      );
      expect(walletService.creditarRecebimentoDeFatura).toHaveBeenCalledWith(
        expect.objectContaining({
          companyId: "company-1",
          contractInvoiceId: "fatura-1",
          valorCentavos: 65_801,
        }),
      );
    });

    /* Com split, o dinheiro nunca passou pela conta da Rotta: creditar
       mostraria um saldo a sacar que o transportador já recebeu. */
    it("com split, não credita a carteira", async () => {
      invoiceRepository.findByAsaasPaymentIdAcrossTenants.mockResolvedValue(
        buildFatura({ repasseDiretoAoTransportador: true }),
      );

      await service.confirmarPagamento({
        asaasPaymentId: "pay_1",
        valorPagoCentavos: 66_000,
        taxaDoProvedorCentavos: 199,
        pagoEm: new Date(),
      });

      expect(invoiceRepository.updateAcrossTenants).toHaveBeenCalled();
      expect(walletService.creditarRecebimentoDeFatura).not.toHaveBeenCalled();
    });

    /* A Asaas reentrega webhook. Creditar duas vezes só apareceria no
       dia do saque. */
    it("webhook reentregue não credita duas vezes", async () => {
      invoiceRepository.findByAsaasPaymentIdAcrossTenants.mockResolvedValue(
        buildFatura({ status: "PAGA" }),
      );

      await service.confirmarPagamento({
        asaasPaymentId: "pay_1",
        valorPagoCentavos: 66_000,
        taxaDoProvedorCentavos: 199,
        pagoEm: new Date(),
      });

      expect(invoiceRepository.updateAcrossTenants).not.toHaveBeenCalled();
      expect(walletService.creditarRecebimentoDeFatura).not.toHaveBeenCalled();
    });

    it("pagamento sem fatura correspondente é logado, nunca estoura o webhook", async () => {
      invoiceRepository.findByAsaasPaymentIdAcrossTenants.mockResolvedValue(null);

      await expect(
        service.confirmarPagamento({
          asaasPaymentId: "pay_desconhecido",
          valorPagoCentavos: 1000,
          taxaDoProvedorCentavos: null,
          pagoEm: new Date(),
        }),
      ).resolves.toBeUndefined();
    });

    it("sem netValue da Asaas, o repasse é o valor cheio (taxa desconhecida, nunca estimada)", async () => {
      invoiceRepository.findByAsaasPaymentIdAcrossTenants.mockResolvedValue(buildFatura());

      await service.confirmarPagamento({
        asaasPaymentId: "pay_1",
        valorPagoCentavos: 66_000,
        taxaDoProvedorCentavos: null,
        pagoEm: new Date(),
      });

      expect(invoiceRepository.updateAcrossTenants).toHaveBeenCalledWith(
        "fatura-1",
        expect.objectContaining({ repasseCentavos: 66_000, taxaDoProvedorCentavos: null }),
      );
    });
  });

  describe("escopo da transportadora", () => {
    it("responsável não lista as contas a receber de uma transportadora", async () => {
      await expect(service.listarFaturasDaEmpresa(responsavelActor, {}, 1, 20)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it("a empresa lista as próprias, pelo tenant do token", async () => {
      await service.listarFaturasDaEmpresa(empresaActor, { status: "VENCIDA" }, 1, 20);

      expect(invoiceRepository.list).toHaveBeenCalledWith(
        expect.objectContaining({ companyId: "company-1", status: "VENCIDA" }),
      );
    });

    it("competência do filtro é normalizada para o primeiro dia do mês", async () => {
      await service.listarFaturasDaEmpresa(empresaActor, { competencia: "2026-04-23" }, 1, 20);

      const chamada = invoiceRepository.list.mock.calls[0]![0];
      expect(chamada.competencia?.toISOString()).toBe("2026-04-01T00:00:00.000Z");
    });

    it("a chave Pix é o único dado que o transportador escreve na conta de recebimento", async () => {
      /* O `upsert` passou a ter o retorno mapeado, então o dublê precisa
         devolver uma conta de verdade em vez de `undefined`. */
      paymentAccountRepository.upsert.mockResolvedValue({
        id: "conta-1",
        companyId: "company-1",
        status: "ATIVA",
      } as never);

      await service.salvarContaDeRecebimento(empresaActor, { chavePix: "11999998888" });

      expect(paymentAccountRepository.upsert).toHaveBeenCalledWith("company-1", {
        chavePix: "11999998888",
      });
    });
  });

  /*
    O que estes testes guardam e a conta de recebimento do
    transportador: criar a segunda subconta perde a primeira para
    sempre, e gravar menos do que o Asaas devolveu perde a chave, que
    tambem nao tem segunda chance.
  */
  describe("criarSubcontaDaPropriaEmpresa", () => {
    const subcontaCriada = {
      asaasAccountId: "acc_novo",
      asaasWalletId: "wallet_novo",
      asaasApiKeyCifrada: "iv:tag:cifra",
    };

    beforeEach(() => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue(null);
      (subcontas.criarSubconta as jest.Mock).mockResolvedValue(subcontaCriada);
      paymentAccountRepository.upsert.mockResolvedValue({
        id: "conta-1",
        companyId: "company-1",
        status: "EM_ANALISE",
        ...subcontaCriada,
      } as never);
    });

    it("grava numa operacao tudo o que o Asaas devolveu, e nasce EM_ANALISE", async () => {
      await service.criarSubcontaDaPropriaEmpresa(empresaActor, {
        faturamentoMensalCentavos: 450_000,
      });

      expect(paymentAccountRepository.upsert).toHaveBeenCalledWith("company-1", {
        status: "EM_ANALISE",
        ...subcontaCriada,
      });
    });

    it("o formulario pede um campo, o resto vem do cadastro da transportadora", async () => {
      await service.criarSubcontaDaPropriaEmpresa(empresaActor, {
        faturamentoMensalCentavos: 450_000,
      });

      expect(subcontas.criarSubconta).toHaveBeenCalledWith({
        nome: "Transportes Lima LTDA",
        email: "contato@lima.com.br",
        emailDeLogin: "contato@lima.com.br",
        cpfCnpj: "12345678000190",
        telefone: "21999990000",
        endereco: "Avenida Roberto Silveira",
        numero: "1180",
        complemento: undefined,
        bairro: "Centro",
        cep: "24900000",
        faturamentoMensalCentavos: 450_000,
      });
    });

    it("razao social, e nao nome fantasia: para o Asaas o nome tem que bater com o documento", async () => {
      await service.criarSubcontaDaPropriaEmpresa(empresaActor, {
        faturamentoMensalCentavos: 450_000,
      });

      expect(subcontas.criarSubconta).toHaveBeenCalledWith(
        expect.objectContaining({ nome: "Transportes Lima LTDA" }),
      );
    });

    it("o e-mail do financeiro, quando informado, vence o da transportadora", async () => {
      await service.criarSubcontaDaPropriaEmpresa(empresaActor, {
        faturamentoMensalCentavos: 450_000,
        email: "financeiro@lima.com.br",
        telefone: "21988887777",
      });

      expect(subcontas.criarSubconta).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "financeiro@lima.com.br",
          telefone: "21988887777",
        }),
      );
    });

    /*
      O schema de `POST /v3/accounts` diz que `loginEmail`, "caso nao
      informado", usa o `email` da subconta. Ou seja: apontar um e-mail
      de financeiro faria o CONTADOR virar o login da conta de
      recebimento, e o dono perderia o acesso a propria conta. O login
      fica com a empresa, sempre.
    */
    it("o login da conta fica com a empresa, nunca com o financeiro", async () => {
      await service.criarSubcontaDaPropriaEmpresa(empresaActor, {
        faturamentoMensalCentavos: 450_000,
        email: "financeiro@lima.com.br",
      });

      expect(subcontas.criarSubconta).toHaveBeenCalledWith(
        expect.objectContaining({
          email: "financeiro@lima.com.br",
          emailDeLogin: "contato@lima.com.br",
        }),
      );
    });

    /*
      A chave de API da subconta so aparece na resposta da criacao, e
      nao ha endpoint para pedir de novo. Criar a segunda deixaria a
      primeira orfa no Asaas, possivelmente com saldo, sem desfazer.
    */
    it("recusa a segunda subconta, antes de chamar o Asaas", async () => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue({
        id: "conta-1",
        companyId: "company-1",
        asaasAccountId: "acc_ja_existe",
      } as never);

      await expect(
        service.criarSubcontaDaPropriaEmpresa(empresaActor, { faturamentoMensalCentavos: 450_000 }),
      ).rejects.toThrow(BadRequestException);
      expect(subcontas.criarSubconta).not.toHaveBeenCalled();
    });

    it("conta de recebimento sem subconta nao conta como subconta existente", async () => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue({
        id: "conta-1",
        companyId: "company-1",
        asaasAccountId: null,
        chavePix: "11999998888",
      } as never);

      await service.criarSubcontaDaPropriaEmpresa(empresaActor, {
        faturamentoMensalCentavos: 450_000,
      });

      expect(subcontas.criarSubconta).toHaveBeenCalled();
    });

    it("a resposta passa pelo mapeador: nunca a chave", async () => {
      const resposta = await service.criarSubcontaDaPropriaEmpresa(empresaActor, {
        faturamentoMensalCentavos: 450_000,
      });

      expect(JSON.stringify(resposta)).not.toContain("iv:tag:cifra");
      expect(resposta.podeEmitirPelaSubconta).toBe(true);
    });

    it("só a transportadora cria a própria: outro papel é recusado antes de tudo", async () => {
      await expect(
        service.criarSubcontaDaPropriaEmpresa(responsavelActor, {
          faturamentoMensalCentavos: 450_000,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(subcontas.criarSubconta).not.toHaveBeenCalled();
    });
  });

  /*
    "Ainda nao tem conta de recebimento" e o estado de quase toda
    transportadora, e e justamente quem mais precisa de resposta: e a
    pessoa que tem que ver o que e a conta, o que muda com ela e o que
    falta para abrir. Antes este endpoint devolvia `null` inteiro nesse
    caso, e a tela ficava sem nada com que montar o convite.

    O formulario pede UM campo porque os outros oito obrigatorios saem
    do cadastro. Da tela, isso parece um formulario incompleto: e por
    isso que os dados vao escritos, para a pessoa conferir em vez de
    confiar.
  */
  describe("convite para abrir a conta de recebimento", () => {
    it("sem linha no banco, ainda assim diz o que temos para abrir", async () => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue(null);

      const resposta = await service.getContaDeRecebimento(empresaActor);

      expect(resposta.conta).toBeNull();
      expect(resposta.dadosParaAbrirConta).toEqual({
        razaoSocial: "Transportes Lima LTDA",
        cpfCnpj: "12345678000190",
        email: "contato@lima.com.br",
        telefone: "21999990000",
        endereco: "Avenida Roberto Silveira, 1180, Centro",
        cep: "24900000",
        tipoDePessoa: "JURIDICA",
        faltando: ["Faturamento mensal"],
      });
    });

    it("transportador autonomo e pessoa fisica, e a tela precisa saber", async () => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue(null);
      (companiesService.findByIdOrThrow as jest.Mock).mockResolvedValue({
        razaoSocial: "Carlos Silva",
        cpfCnpj: "12345678901",
        email: "carlos@exemplo.com.br",
        telefone: "21999990000",
        endereco: "Rua A",
        numero: "10",
        complemento: null,
        bairro: "Centro",
        cep: "24900000",
        tipo: "AUTONOMO",
      });

      const resposta = await service.getContaDeRecebimento(empresaActor);

      expect(resposta.dadosParaAbrirConta?.tipoDePessoa).toBe("FISICA");
    });

    it("com conta de recebimento mas sem subconta, o convite continua", async () => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue({
        id: "conta-1",
        companyId: "company-1",
        status: "PENDENTE",
        asaasAccountId: null,
        chavePix: "11999998888",
      } as never);

      const resposta = await service.getContaDeRecebimento(empresaActor);

      expect(resposta.conta?.chavePix).toBe("11999998888");
      expect(resposta.dadosParaAbrirConta).toBeDefined();
    });

    /* Com a subconta criada nao ha o que conferir antes de enviar, e
       mandar o cadastro de novo seria dado pessoal numa resposta que
       ninguem vai ler. */
    it("com subconta criada, o convite desaparece e a empresa nem e lida", async () => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue({
        id: "conta-1",
        companyId: "company-1",
        status: "ATIVA",
        asaasAccountId: "acc_1",
      } as never);

      const resposta = await service.getContaDeRecebimento(empresaActor);

      expect(resposta.dadosParaAbrirConta).toBeUndefined();
      expect(companiesService.findByIdOrThrow).not.toHaveBeenCalled();
    });

    it("o complemento entra no endereco quando existe, e nao deixa virgula solta quando nao", async () => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue(null);
      (companiesService.findByIdOrThrow as jest.Mock).mockResolvedValue({
        razaoSocial: "Transportes Lima LTDA",
        cpfCnpj: "12345678000190",
        email: "contato@lima.com.br",
        telefone: "21999990000",
        endereco: "Avenida Roberto Silveira",
        numero: "1180",
        complemento: "Sala 2",
        bairro: "Centro",
        cep: "24900000",
        tipo: "LTDA",
      });

      const resposta = await service.getContaDeRecebimento(empresaActor);

      expect(resposta.dadosParaAbrirConta?.endereco).toBe(
        "Avenida Roberto Silveira, 1180, Sala 2, Centro",
      );
    });
  });

  /*
    Dois defeitos reais, encontrados em 20/10/2026 ao conferir o schema
    da referencia do Asaas contra o que o codigo lia:

    1. `onboardingUrl` NAO vem na resposta de criacao da subconta. O
       codigo gravava um campo que nunca chegava, e o botao "enviar os
       documentos" nunca aparecia para ninguem.
    2. A situacao da conta so mudava sozinha pelo webhook, e os eventos
       de conta precisam ser marcados a mao no painel do Asaas. Enquanto
       nao estiverem, a conta ficava presa em "em analise" para sempre.

    `GET /v3/myAccount/documents` e `GET /v3/myAccount/status` resolvem
    os dois, e e a leitura da tela que os dispara.
  */
  describe("sincronizacao da subconta na leitura da tela", () => {
    const emAnalise = {
      id: "conta-1",
      companyId: "company-1",
      status: "EM_ANALISE",
      asaasAccountId: "acc_1",
      asaasApiKeyCifrada: "iv:tag:cifra",
      asaasOnboardingUrl: null,
    };

    it("grava o link de documentos que a criacao nunca devolveu", async () => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue(emAnalise as never);
      (subcontas.sincronizar as jest.Mock).mockResolvedValue({
        onboardingUrl: "https://asaas.com/onboarding/abc",
        situacaoGeral: null,
      });
      paymentAccountRepository.upsert.mockResolvedValue({
        ...emAnalise,
        asaasOnboardingUrl: "https://asaas.com/onboarding/abc",
      } as never);

      const { conta } = await service.getContaDeRecebimento(empresaActor);

      expect(paymentAccountRepository.upsert).toHaveBeenCalledWith("company-1", {
        asaasOnboardingUrl: "https://asaas.com/onboarding/abc",
      });
      expect(conta?.asaasOnboardingUrl).toBe("https://asaas.com/onboarding/abc");
    });

    it("aprovada no Asaas, ativa aqui, mesmo sem o webhook configurado", async () => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue(emAnalise as never);
      (subcontas.sincronizar as jest.Mock).mockResolvedValue({
        onboardingUrl: null,
        situacaoGeral: "APPROVED",
      });
      paymentAccountRepository.upsert.mockResolvedValue({
        ...emAnalise,
        status: "ATIVA",
      } as never);

      const { conta } = await service.getContaDeRecebimento(empresaActor);

      expect(paymentAccountRepository.upsert).toHaveBeenCalledWith("company-1", {
        status: "ATIVA",
      });
      expect(conta?.status).toBe("ATIVA");
    });

    it("sem novidade, nao grava nada: a tela de dinheiro abre muito", async () => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue(emAnalise as never);

      await service.getContaDeRecebimento(empresaActor);

      expect(paymentAccountRepository.upsert).not.toHaveBeenCalled();
    });

    /* Conta ativa com link guardado nao tem o que sincronizar, e duas
       chamadas ao Asaas por abertura de tela seriam pagas por nada. */
    it("conta ativa nao consulta o Asaas de novo", async () => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue({
        ...emAnalise,
        status: "ATIVA",
      } as never);

      await service.getContaDeRecebimento(empresaActor);

      expect(subcontas.sincronizar).not.toHaveBeenCalled();
    });

    it("conta sem subconta nenhuma nao consulta o Asaas", async () => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue({
        ...emAnalise,
        asaasAccountId: null,
        status: "PENDENTE",
      } as never);

      await service.getContaDeRecebimento(empresaActor);

      expect(subcontas.sincronizar).not.toHaveBeenCalled();
    });

    it("vale igual pelo painel do Admin", async () => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue(emAnalise as never);
      (subcontas.sincronizar as jest.Mock).mockResolvedValue({
        onboardingUrl: null,
        situacaoGeral: "REJECTED",
      });
      paymentAccountRepository.upsert.mockResolvedValue({
        ...emAnalise,
        status: "RECUSADA",
      } as never);

      const { conta } = await service.getContaDeRecebimentoDaEmpresa("company-1", empresaActor);

      expect(conta?.status).toBe("RECUSADA");
    });
  });

  describe("criarSubcontaParaEmpresa (Admin Rotta)", () => {
    it("quem decide se o ator pode mexer nesta empresa e o CompaniesService", async () => {
      const naoAutorizado = new ForbiddenException("Sem acesso a esta empresa.");
      (companiesService.findByIdOrThrow as jest.Mock).mockRejectedValue(naoAutorizado);
      paymentAccountRepository.findByCompanyId.mockResolvedValue(null);

      await expect(
        service.criarSubcontaParaEmpresa("company-9", empresaActor, {
          faturamentoMensalCentavos: 450_000,
        }),
      ).rejects.toThrow(ForbiddenException);
      expect(subcontas.criarSubconta).not.toHaveBeenCalled();
    });
  });

  /*
    Sem isto, uma subconta aprovada continuaria aparecendo como "em
    analise" ate alguem abrir o painel do Asaas para conferir.
  */
  describe("aplicarSituacaoDaSubconta", () => {
    const contaEmAnalise = {
      id: "conta-1",
      companyId: "company-1",
      status: "EM_ANALISE",
      asaasAccountId: "acc_1",
    };

    it("aprovacao geral aprovada ativa a conta", async () => {
      paymentAccountRepository.findByAsaasAccountIdAcrossTenants.mockResolvedValue(
        contaEmAnalise as never,
      );

      await service.aplicarSituacaoDaSubconta({
        asaasAccountId: "acc_1",
        situacaoGeral: "APPROVED",
        eventoDaAsaas: "ACCOUNT_STATUS_GENERAL_APPROVAL_APPROVED",
      });

      expect(paymentAccountRepository.upsertAcrossTenants).toHaveBeenCalledWith("company-1", {
        status: "ATIVA",
      });
    });

    it("recusada vira RECUSADA", async () => {
      paymentAccountRepository.findByAsaasAccountIdAcrossTenants.mockResolvedValue(
        contaEmAnalise as never,
      );

      await service.aplicarSituacaoDaSubconta({
        asaasAccountId: "acc_1",
        situacaoGeral: "REJECTED",
        eventoDaAsaas: "ACCOUNT_STATUS_GENERAL_APPROVAL_REJECTED",
      });

      expect(paymentAccountRepository.upsertAcrossTenants).toHaveBeenCalledWith("company-1", {
        status: "RECUSADA",
      });
    });

    it("PENDING e AWAITING_APPROVAL caem no mesmo EM_ANALISE", async () => {
      paymentAccountRepository.findByAsaasAccountIdAcrossTenants.mockResolvedValue({
        ...contaEmAnalise,
        status: "ATIVA",
      } as never);

      await service.aplicarSituacaoDaSubconta({
        asaasAccountId: "acc_1",
        situacaoGeral: "PENDING",
        eventoDaAsaas: "ACCOUNT_STATUS_DOCUMENT_PENDING",
      });

      expect(paymentAccountRepository.upsertAcrossTenants).toHaveBeenCalledWith("company-1", {
        status: "EM_ANALISE",
      });
    });

    it("mesmo estado nao grava nada: o Asaas reentrega o mesmo evento", async () => {
      paymentAccountRepository.findByAsaasAccountIdAcrossTenants.mockResolvedValue(
        contaEmAnalise as never,
      );

      await service.aplicarSituacaoDaSubconta({
        asaasAccountId: "acc_1",
        situacaoGeral: "PENDING",
        eventoDaAsaas: "ACCOUNT_STATUS_DOCUMENT_PENDING",
      });

      expect(paymentAccountRepository.upsertAcrossTenants).not.toHaveBeenCalled();
    });

    /*
      O Asaas acrescenta valores sem avisar, e mudar o estado de uma
      conta de recebimento por um nome que ninguem leu e pior do que
      nao mudar.
    */
    it("situacao desconhecida nao mexe em nada", async () => {
      paymentAccountRepository.findByAsaasAccountIdAcrossTenants.mockResolvedValue(
        contaEmAnalise as never,
      );

      await service.aplicarSituacaoDaSubconta({
        asaasAccountId: "acc_1",
        situacaoGeral: "SOMETHING_NEW",
        eventoDaAsaas: "ACCOUNT_STATUS_GENERAL_APPROVAL_SOMETHING",
      });

      expect(paymentAccountRepository.upsertAcrossTenants).not.toHaveBeenCalled();
    });

    it("subconta que nao e de nenhuma transportadora nossa e ignorada", async () => {
      paymentAccountRepository.findByAsaasAccountIdAcrossTenants.mockResolvedValue(null);

      await service.aplicarSituacaoDaSubconta({
        asaasAccountId: "acc_de_outro",
        situacaoGeral: "APPROVED",
        eventoDaAsaas: "ACCOUNT_STATUS_GENERAL_APPROVAL_APPROVED",
      });

      expect(paymentAccountRepository.upsertAcrossTenants).not.toHaveBeenCalled();
    });
  });

  /*
    A cobrança mensal automática (pedido do fundador em 21/10/2026): o
    transportador, ou o Admin ajudando, liga a recorrência de um contrato
    e a partir dali o Asaas cobra a família todo mês. O responsável nunca
    precisa de conta: ele paga pelo link.

    Os testes abaixo cobrem os casos em que errar custa dinheiro de uma
    família de verdade — cobrança dobrada, cobrança depois do fim do
    contrato, e recorrência órfã no provedor.
  */
  describe("criarAssinaturaDoProprioContrato", () => {
    function buildContrato(overrides: Record<string, unknown> = {}) {
      return {
        id: "contrato-1",
        companyId: "company-1",
        studentId: "student-1",
        responsavelId: "responsavel-1",
        valorMensalidadeCentavos: 66_000,
        planoDescricao: "Ida e volta",
        status: "ATIVO",
        vigenciaInicio: new Date("2026-02-01T00:00:00.000Z"),
        vigenciaFim: null,
        asaasSubscriptionId: null,
        asaasSubscriptionStatus: null,
        student: { id: "student-1", nome: "Ana" },
        company: { id: "company-1", nomeFantasia: "Transportes Lima" },
        ...overrides,
      };
    }

    beforeEach(() => {
      jest.useFakeTimers().setSystemTime(new Date("2026-04-01T09:00:00.000Z"));
      invoiceRepository.findContratoParaAssinarAcrossTenants.mockResolvedValue(
        buildContrato() as never,
      );
      usersService.findById.mockResolvedValue({
        id: "responsavel-1",
        nome: "Marina Alves",
        email: "marina@email.com",
        telefone: "21999887766",
        cpf: "12345678909",
      } as never);
      asaasClient.findCustomerByCpfCnpj.mockResolvedValue({ id: "cus_1" } as never);
      asaasClient.createSubscription.mockResolvedValue({
        id: "sub_1",
        customer: "cus_1",
        status: "ACTIVE",
        billingType: "PIX",
        value: 660,
        nextDueDate: "2026-04-05",
      } as never);
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    it("cria a recorrencia e grava o id no contrato", async () => {
      const resultado = await service.criarAssinaturaDoProprioContrato(
        "contrato-1",
        empresaActor,
        {},
      );

      expect(asaasClient.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          customer: "cus_1",
          billingType: "PIX",
          value: 660,
          cycle: "MONTHLY",
          nextDueDate: "2026-04-05",
          externalReference: "contrato:contrato-1",
        }),
        undefined,
      );
      expect(invoiceRepository.atualizarAssinaturaDoContratoAcrossTenants).toHaveBeenCalledWith(
        "contrato-1",
        expect.objectContaining({
          asaasSubscriptionId: "sub_1",
          asaasSubscriptionStatus: "ACTIVE",
        }),
      );
      expect(resultado.asaasSubscriptionId).toBe("sub_1");
      /* `formatarCentavos` usa espaco nao separavel (U+00A0) entre o
         "R$" e o numero: comparar com um espaco comum falha com as duas
         strings parecendo iguais na saida do teste. */
      expect(resultado.valorFormatado).toMatch(/^R\$\s660,00$/);
    });

    /*
      Duas recorrências no mesmo contrato cobram a mesma família duas
      vezes por mês, e o estrago aparece no extrato dela. A recusa vem
      ANTES da chamada ao Asaas, porque depois não há como desfazer.
    */
    it("recusa a segunda assinatura, sem chamar o Asaas", async () => {
      invoiceRepository.findContratoParaAssinarAcrossTenants.mockResolvedValue(
        buildContrato({ asaasSubscriptionId: "sub_ja_existe" }) as never,
      );

      await expect(
        service.criarAssinaturaDoProprioContrato("contrato-1", empresaActor, {}),
      ).rejects.toThrow(BadRequestException);
      expect(asaasClient.createSubscription).not.toHaveBeenCalled();
    });

    it("recusa contrato que nao esta ativo", async () => {
      invoiceRepository.findContratoParaAssinarAcrossTenants.mockResolvedValue(
        buildContrato({ status: "ENCERRADO" }) as never,
      );

      await expect(
        service.criarAssinaturaDoProprioContrato("contrato-1", empresaActor, {}),
      ).rejects.toThrow(BadRequestException);
      expect(asaasClient.createSubscription).not.toHaveBeenCalled();
    });

    /*
      Os contratos de hoje estão todos em R$ 0,00 (o valor nunca foi
      negociado de verdade no produto). Ligar recorrência de zero real
      mandaria a família pagar nada, todo mês.
    */
    it("recusa mensalidade em zero", async () => {
      invoiceRepository.findContratoParaAssinarAcrossTenants.mockResolvedValue(
        buildContrato({ valorMensalidadeCentavos: 0 }) as never,
      );

      await expect(
        service.criarAssinaturaDoProprioContrato("contrato-1", empresaActor, {}),
      ).rejects.toThrow(BadRequestException);
      expect(asaasClient.createSubscription).not.toHaveBeenCalled();
    });

    /*
      Sem `endDate`, a recorrência continua cobrando a família depois de
      o contrato acabar. É o campo que liga `Contract.vigenciaFim` ao
      Asaas.
    */
    it("manda endDate quando o contrato tem fim de vigencia", async () => {
      invoiceRepository.findContratoParaAssinarAcrossTenants.mockResolvedValue(
        buildContrato({ vigenciaFim: new Date("2026-12-20T00:00:00.000Z") }) as never,
      );

      const resultado = await service.criarAssinaturaDoProprioContrato(
        "contrato-1",
        empresaActor,
        {},
      );

      expect(asaasClient.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ endDate: "2026-12-20" }),
        undefined,
      );
      expect(resultado.ultimoVencimento).toBe("2026-12-20");
    });

    it("nao manda endDate quando o contrato nao tem fim combinado", async () => {
      await service.criarAssinaturaDoProprioContrato("contrato-1", empresaActor, {});

      const [corpo] = asaasClient.createSubscription.mock.calls[0] as [Record<string, unknown>];
      expect(corpo).not.toHaveProperty("endDate");
    });

    /*
      Se o Responsável já abriu o Pix deste mês, existe cobrança no
      Asaas. Começar a recorrência no mesmo mês cobraria a família duas
      vezes pela mesma competência.
    */
    it("pula o mes que ja tem cobranca emitida", async () => {
      invoiceRepository.findPorContratoECompetenciaAcrossTenants.mockImplementation(
        (_contrato, competencia) =>
          Promise.resolve(
            competencia.getUTCMonth() === 3 ? ({ asaasPaymentId: "pay_de_abril" } as never) : null,
          ),
      );

      await service.criarAssinaturaDoProprioContrato("contrato-1", empresaActor, {});

      expect(asaasClient.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ nextDueDate: "2026-05-05" }),
        undefined,
      );
    });

    /*
      Fatura sem `asaasPaymentId` é só a nossa linha de razão: não existe
      cobrança no provedor, então a recorrência pode cobrir o mês.
    */
    it("nao pula o mes quando a fatura existe mas nunca virou cobranca", async () => {
      invoiceRepository.findPorContratoECompetenciaAcrossTenants.mockResolvedValue({
        asaasPaymentId: null,
      } as never);

      await service.criarAssinaturaDoProprioContrato("contrato-1", empresaActor, {});

      expect(asaasClient.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ nextDueDate: "2026-04-05" }),
        undefined,
      );
    });

    /*
      Vencimento no passado faria a recorrência nascer vencida, gerando
      cobrança atrasada para um mês que a família talvez já tenha
      combinado de outro jeito.
    */
    it("nao usa vencimento que ja passou", async () => {
      jest.setSystemTime(new Date("2026-04-20T09:00:00.000Z"));

      await service.criarAssinaturaDoProprioContrato("contrato-1", empresaActor, {});

      expect(asaasClient.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ nextDueDate: "2026-05-05" }),
        undefined,
      );
    });

    /*
      O Asaas exige `cpfCnpj` para criar o cliente da cobrança
      (`CustomerSaveRequestDTO`), e desde 14/09/2026 a Rotta não coleta
      CPF de Responsável. Sem o documento não existe cobrança para essa
      família por nenhum caminho.
    */
    it("recusa com mensagem nomeando quem esta sem CPF", async () => {
      usersService.findById.mockResolvedValue({
        id: "responsavel-1",
        nome: "Marina Alves",
        email: "marina@email.com",
        telefone: "21999887766",
        cpf: null,
      } as never);

      await expect(
        service.criarAssinaturaDoProprioContrato("contrato-1", empresaActor, {}),
      ).rejects.toThrow(/Marina Alves/);
      expect(asaasClient.createSubscription).not.toHaveBeenCalled();
    });

    it("grava o CPF informado no formulario e segue", async () => {
      usersService.findById.mockResolvedValue({
        id: "responsavel-1",
        nome: "Marina Alves",
        email: "marina@email.com",
        telefone: "21999887766",
        cpf: null,
      } as never);
      usersService.registrarCpfDoResponsavel.mockResolvedValue({
        id: "responsavel-1",
        nome: "Marina Alves",
        email: "marina@email.com",
        telefone: "21999887766",
        cpf: "12345678909",
      } as never);

      await service.criarAssinaturaDoProprioContrato("contrato-1", empresaActor, {
        cpfDoResponsavel: "123.456.789-09",
      });

      expect(usersService.registrarCpfDoResponsavel).toHaveBeenCalledWith(
        "responsavel-1",
        "123.456.789-09",
      );
      expect(asaasClient.createSubscription).toHaveBeenCalled();
    });

    /*
      O celular vai no cliente do Asaas porque é por ele que o provedor
      avisa a família da cobrança — e a família sem conta na Rotta
      depende desse aviso para receber o link.
    */
    it("manda o celular do responsavel ao criar o cliente", async () => {
      asaasClient.findCustomerByCpfCnpj.mockResolvedValue(null);
      asaasClient.createCustomer.mockResolvedValue({ id: "cus_novo" } as never);

      await service.criarAssinaturaDoProprioContrato("contrato-1", empresaActor, {});

      expect(asaasClient.createCustomer).toHaveBeenCalledWith(
        expect.objectContaining({ cpfCnpj: "12345678909", mobilePhone: "21999887766" }),
      );
    });

    /*
      Com `emissorDaCobranca = SUBCONTA` a recorrência tem que ser criada
      COM A CHAVE DELA: é o único jeito de a custódia valer, porque a
      retenção segue a conta que recebe.
    */
    it("emite pela subconta quando o emissor dela e SUBCONTA", async () => {
      paymentAccountRepository.findByCompanyIdAcrossTenants.mockResolvedValue({
        companyId: "company-1",
        asaasWalletId: "wallet-da-transportadora",
        emissorDaCobranca: "SUBCONTA",
      } as never);
      (subcontas.chaveDaSubconta as jest.Mock).mockReturnValue("chave-da-subconta");
      (subcontas.montarSplit as jest.Mock).mockReturnValue([
        { walletId: "wallet-da-rotta", percentualValue: 1.29 },
      ]);

      const resultado = await service.criarAssinaturaDoProprioContrato(
        "contrato-1",
        empresaActor,
        {},
      );

      expect(asaasClient.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          split: [{ walletId: "wallet-da-rotta", percentualValue: 1.29 }],
        }),
        "chave-da-subconta",
      );
      expect(resultado.repasseDiretoAoTransportador).toBe(true);
    });

    it("contrato inexistente da 404", async () => {
      invoiceRepository.findContratoParaAssinarAcrossTenants.mockResolvedValue(null);

      await expect(
        service.criarAssinaturaDoProprioContrato("contrato-9", empresaActor, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it("sem a Asaas configurada, nada e criado", async () => {
      asaasClient.isConfigured.mockReturnValue(false);

      await expect(
        service.criarAssinaturaDoProprioContrato("contrato-1", empresaActor, {}),
      ).rejects.toThrow(BadRequestException);
      expect(asaasClient.createSubscription).not.toHaveBeenCalled();
    });

    it("responsavel nao pode ligar cobranca de contrato nenhum", async () => {
      await expect(
        service.criarAssinaturaDoProprioContrato("contrato-1", responsavelActor, {}),
      ).rejects.toThrow(ForbiddenException);
      expect(asaasClient.createSubscription).not.toHaveBeenCalled();
    });
  });

  /*
    A cobrança que a recorrência gera chega por webhook, por padrão 40
    dias antes do vencimento. Sem ligá-la à fatura do mês, ela existe no
    Asaas e não aparece em lugar nenhum da Rotta: a família não tem link
    para pagar e a transportadora não vê a cobrança.
  */
  describe("vincularCobrancaDaAssinatura", () => {
    const evento = {
      asaasEvent: "PAYMENT_CREATED",
      asaasSubscriptionId: "sub_1",
      asaasPaymentId: "pay_maio",
      contractId: "contrato-1",
      vencimento: "2026-05-05",
      valorReais: 660,
      linkDaFatura: "https://asaas.com/i/abc",
      linhaDigitavel: null,
      meioDePagamento: "PIX",
    };

    beforeEach(() => {
      invoiceRepository.findContratoPorAssinaturaAcrossTenants.mockResolvedValue({
        id: "contrato-1",
        companyId: "company-1",
        studentId: "student-1",
        responsavelId: "responsavel-1",
        valorMensalidadeCentavos: 66_000,
        planoDescricao: "Ida e volta",
        status: "ATIVO",
        vigenciaInicio: new Date("2026-02-01T00:00:00.000Z"),
        vigenciaFim: null,
        asaasSubscriptionId: "sub_1",
        asaasSubscriptionStatus: "ACTIVE",
        student: { id: "student-1", nome: "Ana" },
        company: { id: "company-1", nomeFantasia: "Transportes Lima" },
      } as never);
    });

    it("liga a cobranca a fatura que ja existe no mes", async () => {
      invoiceRepository.findPorContratoECompetenciaAcrossTenants.mockResolvedValue({
        id: "fatura-maio",
        asaasPaymentId: null,
      } as never);

      await service.vincularCobrancaDaAssinatura(evento);

      expect(invoiceRepository.updateAcrossTenants).toHaveBeenCalledWith(
        "fatura-maio",
        expect.objectContaining({
          asaasPaymentId: "pay_maio",
          linkDaFatura: "https://asaas.com/i/abc",
          meioDePagamento: "PIX",
        }),
      );
      expect(invoiceRepository.createAcrossTenants).not.toHaveBeenCalled();
    });

    /*
      A recorrência gera a cobrança até 40 dias antes do vencimento,
      então o mês dela muitas vezes ainda não tem fatura: a rotina mensal
      gera a do mês corrente, não a de dois meses à frente.
    */
    it("cria a fatura do mes quando ela ainda nao existe", async () => {
      invoiceRepository.findPorContratoECompetenciaAcrossTenants.mockResolvedValue(null);
      invoiceRepository.createAcrossTenants.mockResolvedValue({ id: "fatura-nova" } as never);

      await service.vincularCobrancaDaAssinatura(evento);

      expect(invoiceRepository.createAcrossTenants).toHaveBeenCalledWith(
        expect.objectContaining({
          contractId: "contrato-1",
          companyId: "company-1",
          competencia: new Date("2026-05-01T00:00:00.000Z"),
          vencimento: new Date("2026-05-05T00:00:00.000Z"),
          /* O valor vem do CONTRATO, nunca do payload: a fatura e
             documento financeiro nosso. */
          valorCentavos: 66_000,
        }),
      );
      expect(invoiceRepository.updateAcrossTenants).toHaveBeenCalledWith(
        "fatura-nova",
        expect.objectContaining({ asaasPaymentId: "pay_maio" }),
      );
    });

    it("webhook reentregue nao escreve de novo", async () => {
      invoiceRepository.findPorContratoECompetenciaAcrossTenants.mockResolvedValue({
        id: "fatura-maio",
        asaasPaymentId: "pay_maio",
      } as never);

      await service.vincularCobrancaDaAssinatura(evento);

      expect(invoiceRepository.updateAcrossTenants).not.toHaveBeenCalled();
      expect(invoiceRepository.createAcrossTenants).not.toHaveBeenCalled();
    });

    /*
      Sobrescrever deixaria a primeira cobrança órfã no provedor,
      possivelmente já paga pela família e sem fatura nenhuma apontando
      para ela.
    */
    it("nao sobrescreve cobranca diferente ja gravada no mes", async () => {
      invoiceRepository.findPorContratoECompetenciaAcrossTenants.mockResolvedValue({
        id: "fatura-maio",
        asaasPaymentId: "pay_que_ja_estava",
      } as never);

      await service.vincularCobrancaDaAssinatura(evento);

      expect(invoiceRepository.updateAcrossTenants).not.toHaveBeenCalled();
      expect(invoiceRepository.createAcrossTenants).not.toHaveBeenCalled();
    });

    it("assinatura que nao e de nenhum contrato nosso e ignorada", async () => {
      invoiceRepository.findContratoPorAssinaturaAcrossTenants.mockResolvedValue(null);

      await service.vincularCobrancaDaAssinatura(evento);

      expect(invoiceRepository.updateAcrossTenants).not.toHaveBeenCalled();
      expect(invoiceRepository.createAcrossTenants).not.toHaveBeenCalled();
    });

    /*
      Se a referência do pagamento e a assinatura gravada discordam,
      alguma das pontas aponta para o contrato errado — e gravar seria
      lançar a cobrança de uma família na fatura de outra.
    */
    it("recusa quando a referencia aponta outro contrato", async () => {
      await service.vincularCobrancaDaAssinatura({ ...evento, contractId: "contrato-de-outro" });

      expect(invoiceRepository.updateAcrossTenants).not.toHaveBeenCalled();
      expect(invoiceRepository.createAcrossTenants).not.toHaveBeenCalled();
    });

    it("vencimento ilegivel nao liga nada", async () => {
      await service.vincularCobrancaDaAssinatura({ ...evento, vencimento: "nao-e-data" });

      expect(invoiceRepository.updateAcrossTenants).not.toHaveBeenCalled();
      expect(invoiceRepository.createAcrossTenants).not.toHaveBeenCalled();
    });

    /*
      `UNDEFINED` significa que o pagador ainda não escolheu. Gravar um
      meio aí seria afirmar na tela da família algo que não aconteceu.
    */
    it("meio UNDEFINED fica nulo na fatura", async () => {
      invoiceRepository.findPorContratoECompetenciaAcrossTenants.mockResolvedValue({
        id: "fatura-maio",
        asaasPaymentId: null,
      } as never);

      await service.vincularCobrancaDaAssinatura({ ...evento, meioDePagamento: "UNDEFINED" });

      expect(invoiceRepository.updateAcrossTenants).toHaveBeenCalledWith(
        "fatura-maio",
        expect.objectContaining({ meioDePagamento: null }),
      );
    });

    it("registra se a cobranca gerada vai direto para a subconta", async () => {
      invoiceRepository.findPorContratoECompetenciaAcrossTenants.mockResolvedValue({
        id: "fatura-maio",
        asaasPaymentId: null,
      } as never);
      paymentAccountRepository.findByCompanyIdAcrossTenants.mockResolvedValue({
        asaasWalletId: "wal_1",
      } as never);

      await service.vincularCobrancaDaAssinatura(evento);

      expect(invoiceRepository.updateAcrossTenants).toHaveBeenCalledWith(
        "fatura-maio",
        expect.objectContaining({ repasseDiretoAoTransportador: true }),
      );
    });
  });
});
