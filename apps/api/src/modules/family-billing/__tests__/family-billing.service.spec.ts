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
import type { CompaniesService } from "@/modules/companies/companies.service";
import type { LytexClientService } from "@/modules/lytex/lytex-client.service";
import type { LytexSubcontasService } from "@/modules/lytex/lytex-subcontas.service";
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
    lytexInvoiceId: null,
    lytexClientId: null,
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
  let subcontas: Pick<LytexSubcontasService, "montarSplit" | "criarSubconta" | "sincronizar">;
  let companiesService: Pick<CompaniesService, "findByIdOrThrow">;
  let invoiceRepository: jest.Mocked<ContractInvoiceRepository>;
  let paymentAccountRepository: jest.Mocked<CompanyPaymentAccountRepository>;
  let lytexClient: jest.Mocked<LytexClientService>;
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
      findByLytexInvoiceIdAcrossTenants: jest.fn(),
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
      upsertAcrossTenants: jest.fn(),
    };
    lytexClient = {
      isConfigured: jest.fn().mockReturnValue(true),
      createInvoice: jest.fn(),
      getInvoice: jest.fn().mockResolvedValue({ _id: "inv_1", totalValue: 66_000, dueDate: "" }),
      createSubscription: jest.fn(),
      findClientByReferenceId: jest.fn(),
      createClient: jest.fn(),
    } as unknown as jest.Mocked<LytexClientService>;
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
      criarSubconta: jest.fn(),
      /* `sincronizar` devolve o estado que ja esta gravado: a maioria
         dos testes nao e sobre a conversa com a Lytex, e assim ela nao
         muda nada sem que o teste peca. */
      sincronizar: jest
        .fn()
        .mockResolvedValue({ status: "EM_ANALISE", recipientId: null, splitLiberado: false }),
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
        cidade: "Niteroi",
        estado: "RJ",
        tipo: "LTDA",
      }),
    };

    service = new FamilyBillingService(
      invoiceRepository,
      paymentAccountRepository,
      lytexClient,
      subcontas as LytexSubcontasService,
      { rottaRecipientId: undefined } as never,
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
      lytexSubAccountId: "sub_1",
      lytexRecipientId: "rec_1",
      lytexSplitLiberado: true,
      /* Resto do desenho anterior, quando a custodia exigia a chave de
         API da subconta. A coluna segue no banco como historico, e o
         teste guarda que ela nunca sai na resposta. */
      asaasApiKeyCifrada: "iv:tag:SEGREDO",
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
      lytexClient.isConfigured.mockReturnValue(false);

      const resultado = await service.getPagamentosDoAluno("student-1", responsavelActor);

      expect(resultado.pagamentoNoAppDisponivel).toBe(false);
    });
  });

  describe("abrirPagamentoPix", () => {
    beforeEach(() => {
      invoiceRepository.findByIdAcrossTenants.mockResolvedValue(buildFatura());
      lytexClient.createInvoice.mockResolvedValue({
        _id: "inv_1",
        totalValue: 66_000,
        dueDate: "2026-04-05T00:00:00.000Z",
        status: "waitingPayment",
        linkCheckout: "https://pay.lytex.test/i/1",
      } as never);
      lytexClient.getInvoice.mockResolvedValue({
        _id: "inv_1",
        totalValue: 66_000,
        dueDate: "2026-04-05T00:00:00.000Z",
        linkCheckout: "https://pay.lytex.test/i/1",
        paymentMethods: {
          pix: { enable: true, qrcode: "00020126...", validUntil: "2026-04-05T23:59:59.000Z" },
        },
      });
      lytexClient.findClientByReferenceId.mockResolvedValue({
        _id: "cli_1",
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
      expect(lytexClient.createInvoice).not.toHaveBeenCalled();
    });

    it("cria a cobrança com o prefixo que o webhook usa para reconhecer o fluxo", async () => {
      await service.abrirPagamentoPix("fatura-1", responsavelActor);

      expect(lytexClient.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          _clientId: "cli_1",
          /* Centavos, inteiro: é assim que a Lytex trabalha e é assim
             que a fatura já guarda. Nenhuma divisão por 100. */
          items: [expect.objectContaining({ quantity: 1, value: 66_000 })],
          referenceId: "fatura:fatura-1",
          paymentMethods: expect.objectContaining({
            pix: { enable: true },
            boleto: { enable: false },
          }),
        }),
        /* Segundo argumento: o `subRecipientId`. `undefined` aqui é o
           caso de hoje, em que a Rotta é a emissora. */
        undefined,
      );
    });

    it("sem subconta, a cobrança sai sem split", async () => {
      await service.abrirPagamentoPix("fatura-1", responsavelActor);

      const [payload] = (lytexClient.createInvoice as jest.Mock).mock.calls[0];
      expect(payload.split).toBeUndefined();
    });

    /*
      O split é o que faz o dinheiro da família chegar na transportadora
      sem passar pela mão de ninguém. Se ele for montado e não for
      enviado, o valor inteiro fica na conta da Rotta, e ninguém percebe
      até o fim do mês.
    */
    it("quando há split montado, ele vai junto na cobrança", async () => {
      const split = {
        type: "percentage",
        recipients: [{ _recipientId: "rec_1", value: 98.71 }],
      };
      (subcontas.montarSplit as jest.Mock).mockReturnValue(split);

      await service.abrirPagamentoPix("fatura-1", responsavelActor);

      const [payload] = (lytexClient.createInvoice as jest.Mock).mock.calls[0];
      expect(payload.split).toEqual(split);
    });

    /* Duas tentativas de pagar a mesma fatura não podem gerar duas
       cobranças, ou a família paga duas vezes. */
    it("reaproveita a cobrança já criada para a mesma fatura", async () => {
      invoiceRepository.findByIdAcrossTenants.mockResolvedValue(
        buildFatura({ lytexInvoiceId: "inv_existente" }),
      );

      const resultado = await service.abrirPagamentoPix("fatura-1", responsavelActor);

      expect(lytexClient.createInvoice).not.toHaveBeenCalled();
      expect(lytexClient.getInvoice).toHaveBeenCalledWith("inv_existente", undefined);
      expect(resultado.pixPayload).toBe("00020126...");
    });

    it("registra na fatura se a cobrança saiu com split ou sem", async () => {
      /* Emitir em nome da subconta exige as tres coisas: ela existe, o
         split ja foi liberado pelo KYC, e o emissor configurado e
         `SUBCONTA`. Faltando qualquer uma, a cobranca e da Rotta. */
      paymentAccountRepository.findByCompanyIdAcrossTenants.mockResolvedValue({
        lytexSubAccountId: "sub_1",
        lytexRecipientId: "rec_1",
        lytexSplitLiberado: true,
        emissorDaCobranca: "SUBCONTA",
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

    it("sem a Lytex configurada, explica em vez de estourar", async () => {
      lytexClient.isConfigured.mockReturnValue(false);

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
      expect(lytexClient.createClient).not.toHaveBeenCalled();
    });
  });

  describe("confirmarPagamento", () => {
    it("marca paga, calcula o repasse e credita o Rotta Pay do transportador", async () => {
      invoiceRepository.findByLytexInvoiceIdAcrossTenants.mockResolvedValue(buildFatura());

      await service.confirmarPagamento({
        lytexInvoiceId: "inv_1",
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
      invoiceRepository.findByLytexInvoiceIdAcrossTenants.mockResolvedValue(
        buildFatura({ repasseDiretoAoTransportador: true }),
      );

      await service.confirmarPagamento({
        lytexInvoiceId: "inv_1",
        valorPagoCentavos: 66_000,
        taxaDoProvedorCentavos: 199,
        pagoEm: new Date(),
      });

      expect(invoiceRepository.updateAcrossTenants).toHaveBeenCalled();
      expect(walletService.creditarRecebimentoDeFatura).not.toHaveBeenCalled();
    });

    /* A provedora reentrega webhook. Creditar duas vezes só apareceria no
       dia do saque. */
    it("webhook reentregue não credita duas vezes", async () => {
      invoiceRepository.findByLytexInvoiceIdAcrossTenants.mockResolvedValue(
        buildFatura({ status: "PAGA" }),
      );

      await service.confirmarPagamento({
        lytexInvoiceId: "inv_1",
        valorPagoCentavos: 66_000,
        taxaDoProvedorCentavos: 199,
        pagoEm: new Date(),
      });

      expect(invoiceRepository.updateAcrossTenants).not.toHaveBeenCalled();
      expect(walletService.creditarRecebimentoDeFatura).not.toHaveBeenCalled();
    });

    it("pagamento sem fatura correspondente é logado, nunca estoura o webhook", async () => {
      invoiceRepository.findByLytexInvoiceIdAcrossTenants.mockResolvedValue(null);

      await expect(
        service.confirmarPagamento({
          lytexInvoiceId: "inv_desconhecida",
          valorPagoCentavos: 1000,
          taxaDoProvedorCentavos: null,
          pagoEm: new Date(),
        }),
      ).resolves.toBeUndefined();
    });

    it("sem o liquido da Lytex, o repasse e o valor cheio (taxa desconhecida, nunca estimada)", async () => {
      invoiceRepository.findByLytexInvoiceIdAcrossTenants.mockResolvedValue(buildFatura());

      await service.confirmarPagamento({
        lytexInvoiceId: "inv_1",
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
      _id: "sub_novo",
      _recipientId: "rec_novo",
      status: "active",
      /* Criada e ainda sem split liberado: e o estado real de uma
         subconta nova, com o KYC correndo por fora. */
      splitAutorization: false,
    };

    beforeEach(() => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue(null);
      (subcontas.criarSubconta as jest.Mock).mockResolvedValue(subcontaCriada);
      paymentAccountRepository.upsert.mockResolvedValue({
        id: "conta-1",
        companyId: "company-1",
        status: "EM_ANALISE",
        lytexSubAccountId: "sub_novo",
        lytexRecipientId: "rec_novo",
        lytexSplitLiberado: true,
      } as never);
    });

    /* `EM_ANALISE`, nunca `ATIVA`: a conta nasce antes de o KYC
       terminar e antes de o split ser liberado. Dizer "ativa" aqui
       prometeria recebimento que ainda nao existe. */
    it("grava numa operacao o que a Lytex devolveu, e nasce EM_ANALISE", async () => {
      await service.criarSubcontaDaPropriaEmpresa(empresaActor, {
        faturamentoMensalCentavos: 450_000,
      });

      expect(paymentAccountRepository.upsert).toHaveBeenCalledWith("company-1", {
        status: "EM_ANALISE",
        lytexSubAccountId: "sub_novo",
        lytexRecipientId: "rec_novo",
        lytexSplitLiberado: false,
      });
    });

    it("o formulario pede um campo, o resto vem do cadastro da transportadora", async () => {
      await service.criarSubcontaDaPropriaEmpresa(empresaActor, {
        faturamentoMensalCentavos: 450_000,
      });

      expect(subcontas.criarSubconta).toHaveBeenCalledWith({
        razaoSocial: "Transportes Lima LTDA",
        nomeFantasia: "Transportes Lima",
        email: "contato@lima.com.br",
        cpfCnpj: "12345678000190",
        tipo: "LTDA",
        telefone: "21999990000",
        endereco: "Avenida Roberto Silveira",
        numero: "1180",
        complemento: undefined,
        bairro: "Centro",
        cidade: "Niteroi",
        uf: "RJ",
        cep: "24900000",
        faturamentoMensalCentavos: 450_000,
      });
    });

    it("razao social no titular: para a Lytex o nome tem que bater com o documento", async () => {
      await service.criarSubcontaDaPropriaEmpresa(empresaActor, {
        faturamentoMensalCentavos: 450_000,
      });

      expect(subcontas.criarSubconta).toHaveBeenCalledWith(
        expect.objectContaining({
          razaoSocial: "Transportes Lima LTDA",
          nomeFantasia: "Transportes Lima",
        }),
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
      Duas subcontas para o mesmo CNPJ deixariam a primeira sem ninguem
      olhando, possivelmente com saldo do transportador dentro, e nao ha
      desfazer. A razao mudou com a troca de provedora (no Asaas era a
      chave de API que so aparecia uma vez); a recusa continua valendo
      pelo que sempre importou.
    */
    it("recusa a segunda subconta, antes de chamar a Lytex", async () => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue({
        id: "conta-1",
        companyId: "company-1",
        lytexSubAccountId: "sub_ja_existe",
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
        lytexSubAccountId: null,
        chavePix: "11999998888",
      } as never);

      await service.criarSubcontaDaPropriaEmpresa(empresaActor, {
        faturamentoMensalCentavos: 450_000,
      });

      expect(subcontas.criarSubconta).toHaveBeenCalled();
    });

    /* O mapeador continua sendo o caminho unico de saida mesmo sem
       chave de terceiro na arquitetura: a coluna cifrada segue no banco
       como historico, e a proxima coluna sensivel vai nascer igual. */
    it("a resposta passa pelo mapeador, campo a campo", async () => {
      paymentAccountRepository.upsert.mockResolvedValue({
        id: "conta-1",
        companyId: "company-1",
        status: "EM_ANALISE",
        lytexSubAccountId: "sub_novo",
        lytexRecipientId: "rec_novo",
        lytexSplitLiberado: true,
        asaasApiKeyCifrada: "iv:tag:cifra",
      } as never);

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
        lytexSubAccountId: "sub_1",
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
    A Lytex nao documenta webhook de situacao de subconta. Sem esta
    consulta na leitura da tela, uma conta aprovada pelo KYC ficaria em
    "em analise" para sempre, e o transportador nao teria como saber que
    ja pode receber.

    `ATIVA` exige as DUAS coisas: `status: "active"` diz que a conta
    existe e nao esta bloqueada, `splitAutorization` diz que ela pode
    dividir. Ativa sem split recebe cobranca e nao repassa a taxa da
    Rotta, e marca-la como ativa mostraria na tela um recebimento que
    funciona pela metade.
  */
  describe("sincronizacao da subconta na leitura da tela", () => {
    const emAnalise = {
      id: "conta-1",
      companyId: "company-1",
      status: "EM_ANALISE",
      lytexSubAccountId: "sub_1",
      lytexRecipientId: null,
      lytexSplitLiberado: false,
    };

    it("aprovada na Lytex com split liberado, fica ATIVA aqui", async () => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue(emAnalise as never);
      (subcontas.sincronizar as jest.Mock).mockResolvedValue({
        status: "ATIVA",
        recipientId: "rec_1",
        splitLiberado: true,
      });
      paymentAccountRepository.upsert.mockResolvedValue({
        ...emAnalise,
        status: "ATIVA",
        lytexRecipientId: "rec_1",
        lytexSplitLiberado: true,
      } as never);

      const { conta } = await service.getContaDeRecebimento(empresaActor);

      expect(paymentAccountRepository.upsert).toHaveBeenCalledWith("company-1", {
        status: "ATIVA",
        lytexRecipientId: "rec_1",
        lytexSplitLiberado: true,
      });
      expect(conta?.status).toBe("ATIVA");
      expect(conta?.podeEmitirPelaSubconta).toBe(true);
    });

    it("sem novidade, nao grava nada: a tela de dinheiro abre muito", async () => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue(emAnalise as never);

      await service.getContaDeRecebimento(empresaActor);

      expect(paymentAccountRepository.upsert).not.toHaveBeenCalled();
    });

    /* A tela de dinheiro mostra saldo, faturas e vencimentos, que sao
       dados nossos. A Lytex fora do ar nao pode esconder nada disso. */
    it("falha na consulta nao derruba a tela: devolve o estado guardado", async () => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue(emAnalise as never);
      (subcontas.sincronizar as jest.Mock).mockRejectedValue(new Error("Lytex fora"));

      const { conta } = await service.getContaDeRecebimento(empresaActor);

      expect(conta?.status).toBe("EM_ANALISE");
      expect(paymentAccountRepository.upsert).not.toHaveBeenCalled();
    });

    /* Conta ativa nao tem o que sincronizar, e uma chamada de rede por
       abertura de tela seria paga por nada. */
    it("conta ativa nao consulta a Lytex de novo", async () => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue({
        ...emAnalise,
        status: "ATIVA",
      } as never);

      await service.getContaDeRecebimento(empresaActor);

      expect(subcontas.sincronizar).not.toHaveBeenCalled();
    });

    it("conta sem subconta nenhuma nao consulta a Lytex", async () => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue({
        ...emAnalise,
        lytexSubAccountId: null,
        status: "PENDENTE",
      } as never);

      await service.getContaDeRecebimento(empresaActor);

      expect(subcontas.sincronizar).not.toHaveBeenCalled();
    });

    it("vale igual pelo painel do Admin", async () => {
      paymentAccountRepository.findByCompanyId.mockResolvedValue(emAnalise as never);
      (subcontas.sincronizar as jest.Mock).mockResolvedValue({
        status: "RECUSADA",
        recipientId: null,
        splitLiberado: false,
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
        lytexSubscriptionId: null,
        lytexSubscriptionStatus: null,
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
      lytexClient.findClientByReferenceId.mockResolvedValue({ _id: "cli_1" } as never);
      lytexClient.createSubscription.mockResolvedValue({
        _id: "sub_1",
        _clientId: "cli_1",
        status: "active",
        nextDueDate: "2026-04-05T00:00:00.000Z",
      });
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

      expect(lytexClient.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({
          _clientId: "cli_1",
          type: "monthly",
          items: [expect.objectContaining({ quantity: 1, value: 66_000 })],
          nextDueDate: "2026-04-05T00:00:00.000Z",
          referenceId: "contrato:contrato-1",
        }),
      );
      expect(invoiceRepository.atualizarAssinaturaDoContratoAcrossTenants).toHaveBeenCalledWith(
        "contrato-1",
        expect.objectContaining({
          lytexSubscriptionId: "sub_1",
          lytexSubscriptionStatus: "active",
        }),
      );
      expect(resultado.lytexSubscriptionId).toBe("sub_1");
      /* `formatarCentavos` usa espaco nao separavel (U+00A0) entre o
         "R$" e o numero: comparar com um espaco comum falha com as duas
         strings parecendo iguais na saida do teste. */
      expect(resultado.valorFormatado).toMatch(/^R\$\s660,00$/);
    });

    /*
      Duas recorrências no mesmo contrato cobram a mesma família duas
      vezes por mês, e o estrago aparece no extrato dela. A recusa vem
      ANTES da chamada à Lytex, porque depois não há como desfazer.
    */
    it("recusa a segunda assinatura, sem chamar a Lytex", async () => {
      invoiceRepository.findContratoParaAssinarAcrossTenants.mockResolvedValue(
        buildContrato({ lytexSubscriptionId: "sub_ja_existe" }) as never,
      );

      await expect(
        service.criarAssinaturaDoProprioContrato("contrato-1", empresaActor, {}),
      ).rejects.toThrow(BadRequestException);
      expect(lytexClient.createSubscription).not.toHaveBeenCalled();
    });

    it("recusa contrato que nao esta ativo", async () => {
      invoiceRepository.findContratoParaAssinarAcrossTenants.mockResolvedValue(
        buildContrato({ status: "ENCERRADO" }) as never,
      );

      await expect(
        service.criarAssinaturaDoProprioContrato("contrato-1", empresaActor, {}),
      ).rejects.toThrow(BadRequestException);
      expect(lytexClient.createSubscription).not.toHaveBeenCalled();
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
      expect(lytexClient.createSubscription).not.toHaveBeenCalled();
    });

    /*
      Sem limite de duração, a recorrência continua cobrando a família
      depois de o contrato acabar. `duration` é o campo que liga
      `Contract.vigenciaFim` à Lytex: de abril a dezembro são nove
      meses, contando os dois extremos.
    */
    it("a duracao vem do fim de vigencia do contrato", async () => {
      invoiceRepository.findContratoParaAssinarAcrossTenants.mockResolvedValue(
        buildContrato({ vigenciaFim: new Date("2026-12-20T00:00:00.000Z") }) as never,
      );

      const resultado = await service.criarAssinaturaDoProprioContrato(
        "contrato-1",
        empresaActor,
        {},
      );

      expect(lytexClient.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ duration: { unit: "months", value: 9 } }),
      );
      expect(resultado.ultimoVencimento).toBe("2026-12-20");
    });

    /* Sem fim combinado, `infinity` é a verdade: a cobrança para quando
       alguém cancelar, e não numa data inventada por nós. */
    it("sem fim combinado, a duracao e infinita", async () => {
      await service.criarAssinaturaDoProprioContrato("contrato-1", empresaActor, {});

      expect(lytexClient.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ duration: { unit: "infinity" } }),
      );
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
            competencia.getUTCMonth() === 3 ? ({ lytexInvoiceId: "inv_de_abril" } as never) : null,
          ),
      );

      await service.criarAssinaturaDoProprioContrato("contrato-1", empresaActor, {});

      expect(lytexClient.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ nextDueDate: "2026-05-05T00:00:00.000Z" }),
      );
    });

    /*
      Fatura sem `lytexInvoiceId` é só a nossa linha de razão: não existe
      cobrança no provedor, então a recorrência pode cobrir o mês.
    */
    it("nao pula o mes quando a fatura existe mas nunca virou cobranca", async () => {
      invoiceRepository.findPorContratoECompetenciaAcrossTenants.mockResolvedValue({
        lytexInvoiceId: null,
      } as never);

      await service.criarAssinaturaDoProprioContrato("contrato-1", empresaActor, {});

      expect(lytexClient.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ nextDueDate: "2026-04-05T00:00:00.000Z" }),
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

      expect(lytexClient.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ nextDueDate: "2026-05-05T00:00:00.000Z" }),
      );
    });

    /*
      A Lytex exige `cpfCnpj` para criar o cliente da cobrança
      (`POST /v2/clients`), e desde 14/09/2026 a Rotta não coleta
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
      expect(lytexClient.createSubscription).not.toHaveBeenCalled();
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
      expect(lytexClient.createSubscription).toHaveBeenCalled();
    });

    /*
      O celular vai no cliente da Lytex porque é por ele que o provedor
      avisa a família da cobrança, e a família sem conta na Rotta
      depende desse aviso para receber o link.

      O `referenceId` é o id do Responsável aqui dentro: é por ele que o
      cliente é reencontrado, e não pelo CPF. Procurar por documento
      acharia duas pessoas para o mesmo número digitado com e sem
      pontuação, e a família receberia duas cobranças.
    */
    it("cria o cliente com documento, celular e a nossa referencia", async () => {
      lytexClient.findClientByReferenceId.mockResolvedValue(null);
      lytexClient.createClient.mockResolvedValue({ _id: "cli_novo" } as never);

      await service.criarAssinaturaDoProprioContrato("contrato-1", empresaActor, {});

      expect(lytexClient.createClient).toHaveBeenCalledWith(
        expect.objectContaining({
          type: "pf",
          cpfCnpj: "12345678909",
          cellphone: "21999887766",
          referenceId: "responsavel-1",
        }),
      );
    });

    /*
      A Lytex nao aceita `subRecipientId` em `/v2/subscriptions`: a rota
      so existe sob `/v2/sub-accounts` para faturas, saques e consultas.
      Entao a recorrencia e SEMPRE emitida pela conta da Rotta, e o
      split e que manda a parte do transportador para a subconta dele.

      O teste guarda os dois lados disso: o split vai no corpo, e
      `montarSplit` recebe o sentido certo. Mandar `"SUBCONTA"` aqui
      inverteria a divisao e deixaria 98,71% na conta da Rotta.
    */
    it("a assinatura sai pela conta da Rotta, com split para a subconta", async () => {
      paymentAccountRepository.findByCompanyIdAcrossTenants.mockResolvedValue({
        companyId: "company-1",
        lytexSubAccountId: "sub_1",
        lytexRecipientId: "rec_1",
        lytexSplitLiberado: true,
        emissorDaCobranca: "SUBCONTA",
      } as never);
      const split = {
        type: "percentage",
        recipients: [{ _recipientId: "rec_1", value: 98.71 }],
      };
      (subcontas.montarSplit as jest.Mock).mockReturnValue(split);

      const resultado = await service.criarAssinaturaDoProprioContrato(
        "contrato-1",
        empresaActor,
        {},
      );

      expect(lytexClient.createSubscription).toHaveBeenCalledWith(
        expect.objectContaining({ split }),
      );
      expect(subcontas.montarSplit).toHaveBeenCalledWith(
        expect.anything(),
        "PIX",
        "SUBCONTA",
        undefined,
      );
      expect(resultado.repasseDiretoAoTransportador).toBe(true);
    });

    it("contrato inexistente da 404", async () => {
      invoiceRepository.findContratoParaAssinarAcrossTenants.mockResolvedValue(null);

      await expect(
        service.criarAssinaturaDoProprioContrato("contrato-9", empresaActor, {}),
      ).rejects.toThrow(NotFoundException);
    });

    it("sem a Lytex configurada, nada e criado", async () => {
      lytexClient.isConfigured.mockReturnValue(false);

      await expect(
        service.criarAssinaturaDoProprioContrato("contrato-1", empresaActor, {}),
      ).rejects.toThrow(BadRequestException);
      expect(lytexClient.createSubscription).not.toHaveBeenCalled();
    });

    it("responsavel nao pode ligar cobranca de contrato nenhum", async () => {
      await expect(
        service.criarAssinaturaDoProprioContrato("contrato-1", responsavelActor, {}),
      ).rejects.toThrow(ForbiddenException);
      expect(lytexClient.createSubscription).not.toHaveBeenCalled();
    });
  });

  /*
    Até 21/10/2026 taxa por meio, emissor e custódia eram campos
    somente lidos: nasciam no padrão da migration e nenhum endpoint os
    escrevia, então o passo a passo de ligar uma transportadora por vez
    só dava com SQL direto no banco.

    As travas abaixo são o que impede ligar custódia em quem não retém
    nada (e passar a pagar a tarifa recorrente por nada) e virar o
    emissor para uma subconta que o Asaas ainda não aprovou.
  */
  describe("configurarRecebimentoDaEmpresa", () => {
    const adminActor: AuthenticatedUser = {
      sub: "admin-1",
      tenantId: null,
      role: Role.ADMIN_ROTTA,
      vinculoId: "vinculo-admin",
    };

    function buildConta(overrides: Record<string, unknown> = {}) {
      return {
        companyId: "company-1",
        status: "ATIVA",
        lytexSubAccountId: "sub_1",
        lytexRecipientId: "rec_1",
        lytexSplitLiberado: true,
        emissorDaCobranca: "ROTTA",
        custodiaAtiva: false,
        custodiaDiasParaLiberar: null,
        custodiaTarifaPagaPor: "CONTA_PRINCIPAL",
        taxaPixBps: 0,
        taxaBoletoBps: 0,
        taxaCreditoVistaBps: 0,
        taxaCreditoParceladoBps: 0,
        taxaDaPlataformaBps: 0,
        ...overrides,
      };
    }

    beforeEach(() => {
      paymentAccountRepository.findByCompanyIdAcrossTenants.mockResolvedValue(
        buildConta() as never,
      );
      paymentAccountRepository.upsertAcrossTenants.mockImplementation((_companyId, dados) =>
        Promise.resolve({ ...buildConta(), ...dados } as never),
      );
    });

    it("grava as taxas por meio", async () => {
      await service.configurarRecebimentoDaEmpresa("company-1", adminActor, {
        taxaPixBps: 129,
        taxaBoletoBps: 129,
        taxaCreditoVistaBps: 99,
        taxaCreditoParceladoBps: 49,
      });

      expect(paymentAccountRepository.upsertAcrossTenants).toHaveBeenCalledWith("company-1", {
        taxaPixBps: 129,
        taxaBoletoBps: 129,
        taxaCreditoVistaBps: 99,
        taxaCreditoParceladoBps: 49,
      });
    });

    it("taxa igual a que ja esta nao e regravada", async () => {
      await service.configurarRecebimentoDaEmpresa("company-1", adminActor, { taxaPixBps: 0 });

      expect(paymentAccountRepository.upsertAcrossTenants).not.toHaveBeenCalled();
    });

    /*
      A tabela aprovada vai de 49 a 129 pontos-base. Acima de 10% é quase
      certamente centavos digitados como pontos-base — mas preço é
      decisão do fundador, então avisa e obedece.
    */
    it("taxa acima de 10% passa, com aviso no log", async () => {
      const aviso = jest.spyOn(service["logger"], "warn").mockImplementation(() => undefined);

      await service.configurarRecebimentoDaEmpresa("company-1", adminActor, {
        taxaPixBps: 12_900,
      });

      expect(aviso).toHaveBeenCalledWith(expect.stringContaining("erro de digitacao"));
      expect(paymentAccountRepository.upsertAcrossTenants).toHaveBeenCalledWith("company-1", {
        taxaPixBps: 12_900,
      });
    });

    /*
      Sem a chave da subconta guardada, a cobrança não pode ser emitida
      em nome dela — e a chave só aparece na criação da subconta.
    */
    it("recusa virar o emissor sem subconta na Lytex", async () => {
      paymentAccountRepository.findByCompanyIdAcrossTenants.mockResolvedValue(
        buildConta({ lytexSubAccountId: null }) as never,
      );

      await expect(
        service.configurarRecebimentoDaEmpresa("company-1", adminActor, {
          emissorDaCobranca: "SUBCONTA",
        }),
      ).rejects.toThrow(BadRequestException);
      expect(paymentAccountRepository.upsertAcrossTenants).not.toHaveBeenCalled();
    });

    it("recusa virar o emissor com a subconta ainda em analise", async () => {
      paymentAccountRepository.findByCompanyIdAcrossTenants.mockResolvedValue(
        buildConta({ status: "EM_ANALISE" }) as never,
      );

      await expect(
        service.configurarRecebimentoDaEmpresa("company-1", adminActor, {
          emissorDaCobranca: "SUBCONTA",
        }),
      ).rejects.toThrow(/EM_ANALISE/);
    });

    /*
      A custódia só retém o que a própria subconta recebe. Ligada com
      emissor `ROTTA`, não reteria nada e passaria a cobrar a tarifa
      recorrente por nada.
    */
    /* Com o split ainda bloqueado pelo KYC, a cobranca sairia em nome
       da subconta e a taxa da Rotta NAO seria repassada. */
    it("recusa virar o emissor com o split ainda bloqueado", async () => {
      paymentAccountRepository.findByCompanyIdAcrossTenants.mockResolvedValue(
        buildConta({ lytexSplitLiberado: false }) as never,
      );

      await expect(
        service.configurarRecebimentoDaEmpresa("company-1", adminActor, {
          emissorDaCobranca: "SUBCONTA",
        }),
      ).rejects.toThrow(/split/);
    });

    /*
      A custódia só retém o que a própria subconta recebe. Ligada com
      emissor `ROTTA`, não reteria nada dela.
    */
    it("recusa ligar custodia com o emissor na Rotta", async () => {
      await expect(
        service.configurarRecebimentoDaEmpresa("company-1", adminActor, {
          custodia: { ativa: true },
        }),
      ).rejects.toThrow(BadRequestException);
      expect(paymentAccountRepository.upsertAcrossTenants).not.toHaveBeenCalled();
    });

    /*
      Nenhuma chamada à Lytex aqui, e isso é a honestidade do método e
      não um atalho: a retenção dela é o `floatConfig` da subconta, que
      NÃO tem rota de escrita na API publicada. O registro vale para a
      tela e para a conciliação; a retenção em si é combinada com o
      comercial, e o método avisa isso no log.
    */
    it("registra a custodia no banco, sem fingir uma chamada que nao existe", async () => {
      await service.configurarRecebimentoDaEmpresa("company-1", adminActor, {
        emissorDaCobranca: "SUBCONTA",
        custodia: { ativa: true, diasParaLiberar: 30, tarifaPagaPor: "SUBCONTA" },
      });

      expect(paymentAccountRepository.upsertAcrossTenants).toHaveBeenCalledWith(
        "company-1",
        expect.objectContaining({
          emissorDaCobranca: "SUBCONTA",
          custodiaAtiva: true,
          custodiaDiasParaLiberar: 30,
          custodiaTarifaPagaPor: "SUBCONTA",
        }),
      );
    });

    it("desligar custodia nao exige emissor SUBCONTA", async () => {
      paymentAccountRepository.findByCompanyIdAcrossTenants.mockResolvedValue(
        buildConta({ custodiaAtiva: true }) as never,
      );

      await service.configurarRecebimentoDaEmpresa("company-1", adminActor, {
        custodia: { ativa: false },
      });

      expect(paymentAccountRepository.upsertAcrossTenants).toHaveBeenCalledWith(
        "company-1",
        expect.objectContaining({ custodiaAtiva: false }),
      );
    });

    it("transportadora sem conta de recebimento e recusada", async () => {
      paymentAccountRepository.findByCompanyIdAcrossTenants.mockResolvedValue(null);

      await expect(
        service.configurarRecebimentoDaEmpresa("company-1", adminActor, { taxaPixBps: 129 }),
      ).rejects.toThrow(BadRequestException);
    });

    it("corpo vazio nao muda nada e nao e erro", async () => {
      const resultado = await service.configurarRecebimentoDaEmpresa("company-1", adminActor, {});

      expect(paymentAccountRepository.upsertAcrossTenants).not.toHaveBeenCalled();
      expect(resultado.emissorDaCobranca).toBe("ROTTA");
    });
  });

  /*
    O boleto é o meio que funciona sem aplicativo de banco: dá para pagar
    na lotérica, no caixa, com dinheiro. Num produto cuja família pode
    não ter conta em lugar nenhum, é o caminho que não exclui ninguém.
    Até 21/10/2026 só existia Pix, e o DTO já prometia `BOLETO` com
    `linhaDigitavel` fixo em `null`.
  */
  describe("abrirPagamentoBoleto", () => {
    const boleto = {
      _id: "inv_boleto",
      totalValue: 66_000,
      dueDate: "2026-04-05T00:00:00.000Z",
      linkCheckout: "https://pay.lytex.test/i/abc",
      linkBoleto: "https://pay.lytex.test/b/abc",
      paymentMethods: {
        boleto: {
          enable: true,
          digitableLine: "34191790010104351004791020150008291070026000",
        },
      },
    };

    beforeEach(() => {
      invoiceRepository.findByIdAcrossTenants.mockResolvedValue(buildFatura());
      usersService.findById.mockResolvedValue({
        id: "responsavel-1",
        nome: "Marina Alves",
        email: "marina@email.com",
        telefone: "21999887766",
        cpf: "12345678909",
      } as never);
      lytexClient.findClientByReferenceId.mockResolvedValue({ _id: "cli_1" } as never);
      lytexClient.createInvoice.mockResolvedValue(boleto);
      lytexClient.getInvoice.mockResolvedValue(boleto);
    });

    it("cria o boleto e devolve a linha digitavel", async () => {
      const resultado = await service.abrirPagamentoBoleto("fatura-1", responsavelActor);

      expect(lytexClient.createInvoice).toHaveBeenCalledWith(
        expect.objectContaining({
          paymentMethods: expect.objectContaining({
            boleto: { enable: true },
            pix: { enable: false },
          }),
        }),
        undefined,
      );
      expect(resultado.meioDePagamento).toBe("BOLETO");
      expect(resultado.linhaDigitavel).toBe("34191790010104351004791020150008291070026000");
      expect(resultado.pixPayload).toBeNull();
    });

    /*
      A taxa da Rotta é por MEIO (tabela do CFO de 18/10). Antes de
      21/10/2026 `montarSplit` era chamado com "PIX" fixo, e um boleto
      sairia com o percentual do Pix.

      O terceiro argumento é o SENTIDO do split: com a cobrança emitida
      pela conta da Rotta, o split manda para a subconta o que sobra
      depois da nossa taxa. Invertê-lo deixaria 98,71% com quem já tem o
      dinheiro.
    */
    it("monta o split com o meio do boleto, e no sentido de quem emitiu", async () => {
      await service.abrirPagamentoBoleto("fatura-1", responsavelActor);

      expect(subcontas.montarSplit).toHaveBeenCalledWith(null, "BOLETO", "ROTTA", undefined);
    });

    /*
      O registro bancário é assíncrono do lado da Lytex: quando a linha
      digitável não vem, inventar uma seria pior que não ter. O link da
      fatura hospedada funciona sempre.
    */
    it("sem linha digitavel, devolve o link e nao grava nada", async () => {
      const semLinha = { ...boleto, paymentMethods: { boleto: { enable: true } } };
      lytexClient.createInvoice.mockResolvedValue(semLinha);
      lytexClient.getInvoice.mockResolvedValue(semLinha);

      const resultado = await service.abrirPagamentoBoleto("fatura-1", responsavelActor);

      expect(resultado.linhaDigitavel).toBeNull();
      expect(resultado.linkDaFatura).toBe("https://pay.lytex.test/b/abc");
    });

    /*
      Reaproveita a cobrança que já existir, inclusive a que a assinatura
      gerou: duas cobranças da mesma fatura fariam a família pagar duas
      vezes.
    */
    it("reaproveita a cobranca que a assinatura ja criou", async () => {
      invoiceRepository.findByIdAcrossTenants.mockResolvedValue(
        buildFatura({ lytexInvoiceId: "inv_da_assinatura" }),
      );

      await service.abrirPagamentoBoleto("fatura-1", responsavelActor);

      expect(lytexClient.createInvoice).not.toHaveBeenCalled();
      expect(lytexClient.getInvoice).toHaveBeenCalledWith("inv_da_assinatura", undefined);
    });

    it("fatura paga nao abre boleto", async () => {
      invoiceRepository.findByIdAcrossTenants.mockResolvedValue(buildFatura({ status: "PAGA" }));

      await expect(service.abrirPagamentoBoleto("fatura-1", responsavelActor)).rejects.toThrow(
        BadRequestException,
      );
      expect(lytexClient.createInvoice).not.toHaveBeenCalled();
    });
  });

  /*
    A cobrança que a recorrência gera chega por webhook, antes do
    vencimento. Sem ligá-la à fatura do mês, ela existe na Lytex e não
    aparece em lugar nenhum da Rotta: a família não tem link para pagar
    e a transportadora não vê a cobrança.
  */
  describe("vincularCobrancaDaAssinatura", () => {
    const evento = {
      evento: "invoiceCreate",
      lytexSubscriptionId: "sub_1",
      lytexInvoiceId: "inv_maio",
      contractId: "contrato-1",
      vencimento: "2026-05-05",
      valorCentavos: 66_000,
      linkDaFatura: "https://pay.lytex.test/i/abc",
      linhaDigitavel: null,
      meioDePagamento: "pix",
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
        lytexSubscriptionId: "sub_1",
        lytexSubscriptionStatus: "active",
        student: { id: "student-1", nome: "Ana" },
        company: { id: "company-1", nomeFantasia: "Transportes Lima" },
      } as never);
    });

    it("liga a cobranca a fatura que ja existe no mes", async () => {
      invoiceRepository.findPorContratoECompetenciaAcrossTenants.mockResolvedValue({
        id: "fatura-maio",
        lytexInvoiceId: null,
      } as never);

      await service.vincularCobrancaDaAssinatura(evento);

      expect(invoiceRepository.updateAcrossTenants).toHaveBeenCalledWith(
        "fatura-maio",
        expect.objectContaining({
          lytexInvoiceId: "inv_maio",
          linkDaFatura: "https://pay.lytex.test/i/abc",
          meioDePagamento: "PIX",
        }),
      );
      expect(invoiceRepository.createAcrossTenants).not.toHaveBeenCalled();
    });

    /*
      A recorrência gera a cobrança do ciclo antes do vencimento, então
      o mês dela muitas vezes ainda não tem fatura: a rotina mensal gera
      a do mês corrente, não a dos meses à frente.
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
        expect.objectContaining({ lytexInvoiceId: "inv_maio" }),
      );
    });

    it("webhook reentregue nao escreve de novo", async () => {
      invoiceRepository.findPorContratoECompetenciaAcrossTenants.mockResolvedValue({
        id: "fatura-maio",
        lytexInvoiceId: "inv_maio",
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
        lytexInvoiceId: "inv_que_ja_estava",
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
      Meio desconhecido significa que o pagador ainda não escolheu, numa
      cobrança com Pix e boleto ligados. Gravar um meio aí seria afirmar
      na tela da família algo que não aconteceu.
    */
    it("meio desconhecido fica nulo na fatura", async () => {
      invoiceRepository.findPorContratoECompetenciaAcrossTenants.mockResolvedValue({
        id: "fatura-maio",
        lytexInvoiceId: null,
      } as never);

      await service.vincularCobrancaDaAssinatura({ ...evento, meioDePagamento: null });

      expect(invoiceRepository.updateAcrossTenants).toHaveBeenCalledWith(
        "fatura-maio",
        expect.objectContaining({ meioDePagamento: null }),
      );
    });

    it("registra se a cobranca gerada vai direto para a subconta", async () => {
      invoiceRepository.findPorContratoECompetenciaAcrossTenants.mockResolvedValue({
        id: "fatura-maio",
        lytexInvoiceId: null,
      } as never);
      paymentAccountRepository.findByCompanyIdAcrossTenants.mockResolvedValue({
        lytexSubAccountId: "sub_1",
        lytexRecipientId: "rec_1",
        lytexSplitLiberado: true,
        emissorDaCobranca: "SUBCONTA",
      } as never);

      await service.vincularCobrancaDaAssinatura(evento);

      expect(invoiceRepository.updateAcrossTenants).toHaveBeenCalledWith(
        "fatura-maio",
        expect.objectContaining({ repasseDiretoAoTransportador: true }),
      );
    });
  });
});
