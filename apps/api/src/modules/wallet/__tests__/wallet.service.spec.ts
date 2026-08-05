import { BadRequestException, ConflictException, ForbiddenException } from "@nestjs/common";


import { WalletService } from "../wallet.service";

import type { WalletRepository } from "../repositories/wallet.repository";
import type { RottaPayProviderService } from "../rotta-pay-provider.service";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { AuditLogService } from "@/modules/audit/audit-log.service";
import type { Contract, Wallet, WalletTransaction, WithdrawalRequest } from "@prisma/client";

import { Role } from "@/shared/enums";

const empresaActor: AuthenticatedUser = {
  sub: "user-empresa",
  tenantId: "company-1",
  role: Role.EMPRESA,
  vinculoId: "vinculo-1",
};

const motoristaActor: AuthenticatedUser = {
  sub: "user-motorista",
  tenantId: "company-1",
  role: Role.MOTORISTA,
  vinculoId: "vinculo-2",
};

const responsavelActor: AuthenticatedUser = {
  sub: "user-responsavel",
  tenantId: null,
  role: Role.RESPONSAVEL,
  vinculoId: "vinculo-3",
};

function buildWallet(overrides: Partial<Wallet> = {}): Wallet {
  return {
    id: "wallet-1",
    ownerType: "EMPRESA",
    companyId: "company-1",
    motoristaId: null,
    saldoDisponivelCentavos: 10000,
    saldoPendenteCentavos: 0,
    moeda: "BRL",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildTransaction(overrides: Partial<WalletTransaction> = {}): WalletTransaction {
  return {
    id: "transaction-1",
    walletId: "wallet-1",
    tipo: "CREDITO_MENSALIDADE",
    status: "PENDENTE",
    valorCentavos: 35000,
    saldoDisponivelAposCentavos: 10000,
    descricao: "Mensalidade",
    contractId: "contract-1",
    withdrawalRequestId: null,
    criadaPorUserId: null,
    createdAt: new Date(),
    ...overrides,
  };
}

function buildWithdrawal(overrides: Partial<WithdrawalRequest> = {}): WithdrawalRequest {
  return {
    id: "withdrawal-1",
    walletId: "wallet-1",
    valorCentavos: 5000,
    chavePix: "11999998888",
    status: "SOLICITADO",
    solicitadoPorUserId: "user-empresa",
    providerReferencia: null,
    motivoRejeicao: null,
    processadoEm: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

function buildContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: "contract-1",
    transportRequestId: "request-1",
    studentId: "student-1",
    responsavelId: "responsavel-1",
    companyId: "company-1",
    schoolId: "school-1",
    vehicleId: null,
    motoristaId: null,
    monitorId: null,
    valorMensalidadeCentavos: 35000,
    planoDescricao: "Mensal",
    regras: "Sem regras especiais.",
    vigenciaInicio: new Date("2026-02-01"),
    vigenciaFim: null,
    status: "ATIVO",
    authentiqueDocumentId: null,
    assinadoResponsavelEm: new Date(),
    assinadoEmpresaEm: new Date(),
    ativadoEm: new Date(),
    encerradoEm: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("WalletService", () => {
  let service: WalletService;
  let repository: jest.Mocked<WalletRepository>;
  let provider: jest.Mocked<Pick<RottaPayProviderService, "iniciarTransferenciaPix">>;
  let auditLogService: jest.Mocked<AuditLogService>;

  beforeEach(() => {
    repository = {
      findById: jest.fn(),
      findByCompanyId: jest.fn(),
      findByMotoristaId: jest.fn(),
      getOrCreate: jest.fn(),
      applyTransaction: jest.fn(),
      listTransactions: jest.fn(),
      findTransactionById: jest.fn(),
      findTransactionByWithdrawalRequestId: jest.fn(),
      transitionTransactionStatus: jest.fn(),
      createWithdrawalRequest: jest.fn(),
      findWithdrawalRequestById: jest.fn(),
      updateWithdrawalRequest: jest.fn(),
      listWithdrawalRequests: jest.fn(),
    };
    provider = {
      iniciarTransferenciaPix: jest.fn().mockResolvedValue({ sucesso: false, motivo: "stub" }),
    };
    auditLogService = {
      record: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<AuditLogService>;

    service = new WalletService(
      repository,
      provider as unknown as RottaPayProviderService,
      auditLogService,
    );
  });

  describe("ownerRefForActor (via getWalletForActor)", () => {
    it("resolve a carteira da empresa pelo tenantId do ator", async () => {
      repository.getOrCreate.mockResolvedValue(buildWallet());

      await service.getWalletForActor(empresaActor);

      expect(repository.getOrCreate).toHaveBeenCalledWith({
        ownerType: "EMPRESA",
        companyId: "company-1",
      });
    });

    it("resolve a carteira do motorista pelo próprio sub", async () => {
      repository.getOrCreate.mockResolvedValue(
        buildWallet({ ownerType: "MOTORISTA", companyId: null, motoristaId: "user-motorista" }),
      );

      await service.getWalletForActor(motoristaActor);

      expect(repository.getOrCreate).toHaveBeenCalledWith({
        ownerType: "MOTORISTA",
        motoristaId: "user-motorista",
      });
    });

    it("rejeita papéis sem carteira própria (ex. Responsável)", async () => {
      await expect(service.getWalletForActor(responsavelActor)).rejects.toThrow(ForbiddenException);
    });
  });

  describe("solicitarSaque", () => {
    it("rejeita quando o valor excede o saldo disponível", async () => {
      repository.getOrCreate.mockResolvedValue(buildWallet({ saldoDisponivelCentavos: 1000 }));

      await expect(
        service.solicitarSaque(empresaActor, { valorCentavos: 5000, chavePix: "abc" }),
      ).rejects.toThrow(ConflictException);

      expect(repository.createWithdrawalRequest).not.toHaveBeenCalled();
    });

    it("cria o saque e debita o saldo imediatamente via transação PENDENTE", async () => {
      const wallet = buildWallet({ saldoDisponivelCentavos: 10000 });
      repository.getOrCreate.mockResolvedValue(wallet);
      repository.createWithdrawalRequest.mockResolvedValue(buildWithdrawal());
      repository.applyTransaction.mockResolvedValue({
        wallet: { ...wallet, saldoDisponivelCentavos: 5000 },
        transaction: buildTransaction({ tipo: "DEBITO_SAQUE", status: "PENDENTE" }),
      });

      const result = await service.solicitarSaque(empresaActor, {
        valorCentavos: 5000,
        chavePix: "11999998888",
      });

      expect(repository.applyTransaction).toHaveBeenCalledWith(
        wallet.id,
        expect.objectContaining({
          tipo: "DEBITO_SAQUE",
          status: "PENDENTE",
          deltaSaldoDisponivelCentavos: -5000,
          deltaSaldoPendenteCentavos: 0,
        }),
      );
      expect(provider.iniciarTransferenciaPix).toHaveBeenCalledWith(5000, "11999998888");
      expect(result.id).toBe("withdrawal-1");
    });
  });

  describe("confirmarCredito", () => {
    it("rejeita confirmar uma transação que não está pendente", async () => {
      repository.findTransactionById.mockResolvedValue(buildTransaction({ status: "CONCLUIDA" }));

      await expect(
        service.confirmarCredito("transaction-1", { ...empresaActor, role: Role.ADMIN_ROTTA }),
      ).rejects.toThrow(BadRequestException);
    });

    it("move o valor de pendente para disponível ao confirmar", async () => {
      repository.findTransactionById.mockResolvedValue(
        buildTransaction({ status: "PENDENTE", valorCentavos: 35000 }),
      );
      repository.transitionTransactionStatus.mockResolvedValue({
        wallet: buildWallet({ saldoDisponivelCentavos: 35000, saldoPendenteCentavos: 0 }),
        transaction: buildTransaction({ status: "CONCLUIDA" }),
      });

      await service.confirmarCredito("transaction-1", {
        ...empresaActor,
        role: Role.ADMIN_ROTTA,
      });

      expect(repository.transitionTransactionStatus).toHaveBeenCalledWith(
        "transaction-1",
        "CONCLUIDA",
        { deltaSaldoDisponivelCentavos: 35000, deltaSaldoPendenteCentavos: -35000 },
      );
    });
  });

  describe("rejeitarSaque", () => {
    it("estorna o valor ao saldo disponível com uma nova transação (nunca edita a original)", async () => {
      repository.findWithdrawalRequestById.mockResolvedValue(buildWithdrawal());
      repository.updateWithdrawalRequest.mockResolvedValue(
        buildWithdrawal({ status: "REJEITADO" }),
      );
      repository.findTransactionByWithdrawalRequestId.mockResolvedValue(
        buildTransaction({ tipo: "DEBITO_SAQUE", status: "PENDENTE", valorCentavos: 5000 }),
      );

      await service.rejeitarSaque("withdrawal-1", "Chave inválida", {
        ...empresaActor,
        role: Role.ADMIN_ROTTA,
      });

      expect(repository.transitionTransactionStatus).toHaveBeenCalledWith(
        "transaction-1",
        "FALHOU",
        { deltaSaldoDisponivelCentavos: 0, deltaSaldoPendenteCentavos: 0 },
      );
      expect(repository.applyTransaction).toHaveBeenCalledWith(
        "wallet-1",
        expect.objectContaining({
          tipo: "CREDITO_ESTORNO",
          deltaSaldoDisponivelCentavos: 5000,
        }),
      );
    });

    it("rejeita reprocessar um saque já concluído", async () => {
      repository.findWithdrawalRequestById.mockResolvedValue(
        buildWithdrawal({ status: "CONCLUIDO" }),
      );

      await expect(
        service.rejeitarSaque("withdrawal-1", "motivo", {
          ...empresaActor,
          role: Role.ADMIN_ROTTA,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe("registrarMensalidadePendente", () => {
    it("credita o saldo pendente da carteira da empresa, best-effort", async () => {
      const wallet = buildWallet();
      repository.getOrCreate.mockResolvedValue(wallet);
      repository.applyTransaction.mockResolvedValue({
        wallet,
        transaction: buildTransaction(),
      });

      await service.registrarMensalidadePendente(buildContract());

      expect(repository.getOrCreate).toHaveBeenCalledWith({
        ownerType: "EMPRESA",
        companyId: "company-1",
      });
      expect(repository.applyTransaction).toHaveBeenCalledWith(
        wallet.id,
        expect.objectContaining({
          tipo: "CREDITO_MENSALIDADE",
          status: "PENDENTE",
          valorCentavos: 35000,
          deltaSaldoDisponivelCentavos: 0,
          deltaSaldoPendenteCentavos: 35000,
        }),
      );
    });

    it("nunca lança — falha vira apenas um log de aviso", async () => {
      repository.getOrCreate.mockRejectedValue(new Error("db indisponível"));

      await expect(service.registrarMensalidadePendente(buildContract())).resolves.toBeUndefined();
    });
  });
});
