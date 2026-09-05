import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";

import {
  toWalletResponseDto,
  toWalletTransactionResponseDto,
  toWithdrawalRequestResponseDto,
} from "./mappers/wallet.mapper";
import { WALLET_REPOSITORY } from "./wallet.constants";

import type { RequestWithdrawalDto } from "./dto/request-withdrawal.dto";
import type {
  ListWalletTransactionsResponseDto,
  WalletResponseDto,
  WalletTransactionResponseDto,
  WithdrawalRequestResponseDto,
} from "./dto/wallet-response.dto";
import type { WalletOwnerRef, WalletRepository } from "./repositories/wallet.repository";
import type { AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import type { Contract, Wallet } from "@prisma/client";

import { AuditLogService } from "@/modules/audit/audit-log.service";
import { RottaPayProviderService } from "@/modules/wallet/rotta-pay-provider.service";
import { Role } from "@/shared/enums";

export interface RequestMeta {
  ip?: string;
  userAgent?: string;
}

const ENTIDADE_TIPO_WALLET = "Wallet";
const ENTIDADE_TIPO_WITHDRAWAL = "WithdrawalRequest";

/**
 * Serviço do módulo Rotta Pay (Dossiê 26) — carteira, ledger e saques de
 * Empresas e Motoristas. A atomicidade saldo+ledger em si vive no
 * repository (`applyTransaction`/`transitionTransactionStatus`); este
 * service cuida de RBAC, validação de regra de negócio (saldo
 * suficiente, quem pode confirmar/rejeitar) e auditoria.
 */
@Injectable()
export class WalletService {
  private readonly logger = new Logger(WalletService.name);

  constructor(
    @Inject(WALLET_REPOSITORY) private readonly walletRepository: WalletRepository,
    private readonly rottaPayProviderService: RottaPayProviderService,
    private readonly auditLogService: AuditLogService,
  ) {}

  private async recordAudit(input: {
    entidadeTipo: string;
    entidadeId: string;
    acao: string;
    atorUserId: string;
    dadosAntes?: Record<string, unknown>;
    dadosDepois?: Record<string, unknown>;
    ip?: string;
    userAgent?: string;
  }): Promise<void> {
    try {
      await this.auditLogService.record(input);
    } catch (error) {
      this.logger.warn(`Falha ao registrar auditoria (${input.entidadeTipo} ${input.entidadeId})`);
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }

  /** Resolve a QUAL carteira o ator autenticado tem direito — nunca aceita um id vindo do cliente. */
  private ownerRefForActor(actor: AuthenticatedUser): WalletOwnerRef {
    if ((actor.role === Role.EMPRESA || actor.role === Role.GESTOR) && actor.tenantId) {
      return { ownerType: "EMPRESA", companyId: actor.tenantId };
    }
    if (actor.role === Role.MOTORISTA) {
      return { ownerType: "MOTORISTA", motoristaId: actor.sub };
    }
    throw new ForbiddenException("Este papel não tem carteira Rotta Pay própria.");
  }

  async getWalletForActor(actor: AuthenticatedUser): Promise<WalletResponseDto> {
    const owner = this.ownerRefForActor(actor);
    const wallet = await this.walletRepository.getOrCreate(owner);
    return toWalletResponseDto(wallet);
  }

  /** Exclusivo de Admin Rotta — qualquer carteira, por id. */
  async getWalletByIdForAdmin(walletId: string): Promise<WalletResponseDto> {
    const wallet = await this.walletRepository.findById(walletId);
    if (!wallet) throw new NotFoundException("Carteira não encontrada.");
    return toWalletResponseDto(wallet);
  }

  private async walletOrThrow(walletId: string): Promise<Wallet> {
    const wallet = await this.walletRepository.findById(walletId);
    if (!wallet) throw new NotFoundException("Carteira não encontrada.");
    return wallet;
  }

  async listTransactionsForActor(
    actor: AuthenticatedUser,
    page: number,
    pageSize: number,
  ): Promise<ListWalletTransactionsResponseDto> {
    const owner = this.ownerRefForActor(actor);
    const wallet = await this.walletRepository.getOrCreate(owner);
    const { items, total } = await this.walletRepository.listTransactions(
      wallet.id,
      page,
      pageSize,
    );
    return {
      items: items.map(toWalletTransactionResponseDto),
      total,
      page,
      pageSize,
    };
  }

  async listTransactionsByWalletIdForAdmin(
    walletId: string,
    page: number,
    pageSize: number,
  ): Promise<ListWalletTransactionsResponseDto> {
    await this.walletOrThrow(walletId);
    const { items, total } = await this.walletRepository.listTransactions(walletId, page, pageSize);
    return { items: items.map(toWalletTransactionResponseDto), total, page, pageSize };
  }

  async listWithdrawalRequestsForActor(
    actor: AuthenticatedUser,
  ): Promise<WithdrawalRequestResponseDto[]> {
    const owner = this.ownerRefForActor(actor);
    const wallet = await this.walletRepository.getOrCreate(owner);
    const items = await this.walletRepository.listWithdrawalRequests(wallet.id);
    return items.map(toWithdrawalRequestResponseDto);
  }

  /**
   * Solicita um saque — debita `saldoDisponivelCentavos` IMEDIATAMENTE
   * (via a `WalletTransaction` `DEBITO_SAQUE` status `PENDENTE`), para
   * nunca permitir saque em dobro enquanto aguarda processamento
   * (Dossiê 26, Seção 3). Chama o provedor parceiro best-effort — hoje
   * sempre indisponível (stub honesto); o saque fica `SOLICITADO`
   * aguardando processamento manual do Admin Rotta.
   */
  async solicitarSaque(
    actor: AuthenticatedUser,
    dto: RequestWithdrawalDto,
    meta: RequestMeta = {},
  ): Promise<WithdrawalRequestResponseDto> {
    const owner = this.ownerRefForActor(actor);
    const wallet = await this.walletRepository.getOrCreate(owner);

    if (dto.valorCentavos > wallet.saldoDisponivelCentavos) {
      throw new ConflictException("Saldo disponível insuficiente para este saque.");
    }

    const withdrawal = await this.walletRepository.createWithdrawalRequest({
      walletId: wallet.id,
      valorCentavos: dto.valorCentavos,
      chavePix: dto.chavePix,
      solicitadoPorUserId: actor.sub,
    });

    await this.walletRepository.applyTransaction(wallet.id, {
      tipo: "DEBITO_SAQUE",
      status: "PENDENTE",
      valorCentavos: dto.valorCentavos,
      descricao: `Saque solicitado — chave PIX ${dto.chavePix}`,
      withdrawalRequestId: withdrawal.id,
      criadaPorUserId: actor.sub,
      deltaSaldoDisponivelCentavos: -dto.valorCentavos,
      deltaSaldoPendenteCentavos: 0,
    });

    const providerResult = await this.rottaPayProviderService.iniciarTransferenciaPix(
      dto.valorCentavos,
      dto.chavePix,
    );
    if (!providerResult.sucesso) {
      this.logger.warn(
        `Saque ${withdrawal.id} aguardando processamento manual: ${providerResult.motivo}`,
      );
    }

    await this.recordAudit({
      entidadeTipo: ENTIDADE_TIPO_WITHDRAWAL,
      entidadeId: withdrawal.id,
      acao: "SAQUE_SOLICITADO",
      atorUserId: actor.sub,
      dadosDepois: { valorCentavos: dto.valorCentavos, walletId: wallet.id },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toWithdrawalRequestResponseDto(withdrawal);
  }

  /** Exclusivo de Admin Rotta — confirma um crédito `PENDENTE` (mensalidade recebida de verdade pelo parceiro/conciliação manual). */
  async confirmarCredito(
    transactionId: string,
    actor: AuthenticatedUser,
    meta: RequestMeta = {},
  ): Promise<WalletTransactionResponseDto> {
    const existing = await this.walletRepository.findTransactionById(transactionId);
    if (!existing) throw new NotFoundException("Transação não encontrada.");
    if (existing.status !== "PENDENTE") {
      throw new BadRequestException("Só é possível confirmar uma transação pendente.");
    }

    const { transaction } = await this.walletRepository.transitionTransactionStatus(
      transactionId,
      "CONCLUIDA",
      {
        deltaSaldoDisponivelCentavos: existing.valorCentavos,
        deltaSaldoPendenteCentavos: -existing.valorCentavos,
      },
    );

    await this.recordAudit({
      entidadeTipo: ENTIDADE_TIPO_WALLET,
      entidadeId: existing.walletId,
      acao: "CREDITO_CONFIRMADO",
      atorUserId: actor.sub,
      dadosDepois: { transactionId, valorCentavos: existing.valorCentavos },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toWalletTransactionResponseDto(transaction);
  }

  /** Exclusivo de Admin Rotta — marca um saque como efetivamente pago pelo parceiro (fora da Rotta). */
  async concluirSaque(
    withdrawalRequestId: string,
    actor: AuthenticatedUser,
    meta: RequestMeta = {},
  ): Promise<WithdrawalRequestResponseDto> {
    const withdrawal = await this.walletRepository.findWithdrawalRequestById(withdrawalRequestId);
    if (!withdrawal) throw new NotFoundException("Solicitação de saque não encontrada.");
    if (withdrawal.status !== "SOLICITADO" && withdrawal.status !== "EM_PROCESSAMENTO") {
      throw new BadRequestException("Este saque já foi concluído ou rejeitado.");
    }

    const updated = await this.walletRepository.updateWithdrawalRequest(withdrawalRequestId, {
      status: "CONCLUIDO",
      processadoEm: new Date(),
    });

    const transaction =
      await this.walletRepository.findTransactionByWithdrawalRequestId(withdrawalRequestId);
    if (transaction) {
      await this.walletRepository.transitionTransactionStatus(transaction.id, "CONCLUIDA", {
        deltaSaldoDisponivelCentavos: 0,
        deltaSaldoPendenteCentavos: 0,
      });
    }

    await this.recordAudit({
      entidadeTipo: ENTIDADE_TIPO_WITHDRAWAL,
      entidadeId: withdrawalRequestId,
      acao: "SAQUE_CONCLUIDO",
      atorUserId: actor.sub,
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toWithdrawalRequestResponseDto(updated);
  }

  /** Exclusivo de Admin Rotta — rejeita o saque e devolve o valor ao saldo disponível (`CREDITO_ESTORNO`, nunca edita a linha original). */
  async rejeitarSaque(
    withdrawalRequestId: string,
    motivo: string,
    actor: AuthenticatedUser,
    meta: RequestMeta = {},
  ): Promise<WithdrawalRequestResponseDto> {
    const withdrawal = await this.walletRepository.findWithdrawalRequestById(withdrawalRequestId);
    if (!withdrawal) throw new NotFoundException("Solicitação de saque não encontrada.");
    if (withdrawal.status !== "SOLICITADO" && withdrawal.status !== "EM_PROCESSAMENTO") {
      throw new BadRequestException("Este saque já foi concluído ou rejeitado.");
    }

    const updated = await this.walletRepository.updateWithdrawalRequest(withdrawalRequestId, {
      status: "REJEITADO",
      motivoRejeicao: motivo,
      processadoEm: new Date(),
    });

    const transaction =
      await this.walletRepository.findTransactionByWithdrawalRequestId(withdrawalRequestId);
    if (transaction) {
      await this.walletRepository.transitionTransactionStatus(transaction.id, "FALHOU", {
        deltaSaldoDisponivelCentavos: 0,
        deltaSaldoPendenteCentavos: 0,
      });
      await this.walletRepository.applyTransaction(withdrawal.walletId, {
        tipo: "CREDITO_ESTORNO",
        status: "CONCLUIDA",
        valorCentavos: withdrawal.valorCentavos,
        descricao: `Estorno do saque rejeitado — ${motivo}`,
        withdrawalRequestId: withdrawal.id,
        criadaPorUserId: actor.sub,
        deltaSaldoDisponivelCentavos: withdrawal.valorCentavos,
        deltaSaldoPendenteCentavos: 0,
      });
    }

    await this.recordAudit({
      entidadeTipo: ENTIDADE_TIPO_WITHDRAWAL,
      entidadeId: withdrawalRequestId,
      acao: "SAQUE_REJEITADO",
      atorUserId: actor.sub,
      dadosDepois: { motivo },
      ip: meta.ip,
      userAgent: meta.userAgent,
    });

    return toWithdrawalRequestResponseDto(updated);
  }

  /**
   * Best-effort, chamado por `ContractsService.tryActivateAfterBothSigned`
   * (Dossiê 26, Seção 6) — nunca bloqueia a ativação do contrato por
   * causa de uma falha aqui (mesmo padrão de `resolveNomeEmpresa`).
   */
  async registrarMensalidadePendente(contract: Contract): Promise<void> {
    try {
      const wallet = await this.walletRepository.getOrCreate({
        ownerType: "EMPRESA",
        companyId: contract.companyId,
      });
      await this.walletRepository.applyTransaction(wallet.id, {
        tipo: "CREDITO_MENSALIDADE",
        status: "PENDENTE",
        valorCentavos: contract.valorMensalidadeCentavos,
        descricao: `Mensalidade do contrato ${contract.id} — aguardando confirmação de recebimento`,
        contractId: contract.id,
        deltaSaldoDisponivelCentavos: 0,
        deltaSaldoPendenteCentavos: contract.valorMensalidadeCentavos,
      });
    } catch (error) {
      this.logger.warn(
        `Falha ao registrar mensalidade pendente na carteira (Contract ${contract.id})`,
      );
      this.logger.warn(error instanceof Error ? error.message : String(error));
    }
  }
}
