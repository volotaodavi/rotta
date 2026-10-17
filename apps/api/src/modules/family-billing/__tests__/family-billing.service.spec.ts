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
    };
    paymentAccountRepository = {
      findByCompanyId: jest.fn(),
      upsert: jest.fn(),
      findByCompanyIdAcrossTenants: jest.fn().mockResolvedValue(null),
    };
    asaasClient = {
      isConfigured: jest.fn().mockReturnValue(true),
      createPayment: jest.fn(),
      getPixQrCode: jest.fn(),
      findCustomerByCpfCnpj: jest.fn(),
      createCustomer: jest.fn(),
    } as unknown as jest.Mocked<AsaasClientService>;
    studentsService = {
      findByIdOrThrow: jest.fn().mockResolvedValue({ id: "student-1", nome: "Ana" }),
    } as unknown as jest.Mocked<StudentsService>;
    usersService = {
      findById: jest.fn(),
    } as unknown as jest.Mocked<UsersService>;
    walletService = {
      creditarRecebimentoDeFatura: jest.fn(),
    } as unknown as jest.Mocked<WalletService>;

    service = new FamilyBillingService(
      invoiceRepository,
      paymentAccountRepository,
      asaasClient,
      studentsService,
      usersService,
      walletService,
    );
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
      );
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

      expect(invoiceRepository.update).toHaveBeenCalledWith(
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

      expect(invoiceRepository.update).toHaveBeenCalled();
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

      expect(invoiceRepository.update).not.toHaveBeenCalled();
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

      expect(invoiceRepository.update).toHaveBeenCalledWith(
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
      await service.salvarContaDeRecebimento(empresaActor, { chavePix: "11999998888" });

      expect(paymentAccountRepository.upsert).toHaveBeenCalledWith("company-1", {
        chavePix: "11999998888",
      });
    });
  });
});
