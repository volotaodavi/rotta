import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";


import { ListWalletTransactionsQueryDto } from "./dto/list-wallet-transactions-query.dto";
import { RejectWithdrawalDto } from "./dto/reject-withdrawal.dto";
import { RequestWithdrawalDto } from "./dto/request-withdrawal.dto";
import { WalletService, type RequestMeta } from "./wallet.service";

import type { Request } from "express";

import { CurrentUser, type AuthenticatedUser } from "@/common/decorators/current-user.decorator";
import { Roles } from "@/common/decorators/roles.decorator";
import { Role } from "@/shared/enums";

/** Dono de carteira própria — quem pode ver/movimentar A PRÓPRIA carteira (Dossiê 26, Seção 5). */
const OWNER_ROLES = [Role.EMPRESA, Role.GESTOR, Role.MOTORISTA] as const;

function requestMeta(req: Request): RequestMeta {
  return { ip: req.ip, userAgent: req.headers["user-agent"] };
}

/**
 * API REST do módulo Rotta Pay (Dossiê 26) — rotas de auto-serviço
 * (`/wallet/me/*`, Empresa/Gestor/Motorista só a própria carteira) e
 * rotas administrativas (`/wallet/admin/*`, exclusivas de Admin Rotta:
 * confirmar créditos pendentes, concluir/rejeitar saques).
 */
@ApiTags("wallet")
@ApiBearerAuth()
@Controller("wallet")
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get("me")
  @Roles(...OWNER_ROLES)
  getMyWallet(@CurrentUser() actor: AuthenticatedUser) {
    return this.walletService.getWalletForActor(actor);
  }

  @Get("me/transactions")
  @Roles(...OWNER_ROLES)
  listMyTransactions(
    @Query() query: ListWalletTransactionsQueryDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.walletService.listTransactionsForActor(actor, query.page, query.pageSize);
  }

  @Get("me/withdrawal-requests")
  @Roles(...OWNER_ROLES)
  listMyWithdrawalRequests(@CurrentUser() actor: AuthenticatedUser) {
    return this.walletService.listWithdrawalRequestsForActor(actor);
  }

  @Post("me/withdrawal-requests")
  @Roles(...OWNER_ROLES)
  requestWithdrawal(
    @Body() dto: RequestWithdrawalDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.walletService.solicitarSaque(actor, dto, requestMeta(req));
  }

  @Get("admin/:walletId")
  @Roles(Role.ADMIN_ROTTA)
  getWalletByIdForAdmin(@Param("walletId", ParseUUIDPipe) walletId: string) {
    return this.walletService.getWalletByIdForAdmin(walletId);
  }

  @Get("admin/:walletId/transactions")
  @Roles(Role.ADMIN_ROTTA)
  listTransactionsForAdmin(
    @Param("walletId", ParseUUIDPipe) walletId: string,
    @Query() query: ListWalletTransactionsQueryDto,
  ) {
    return this.walletService.listTransactionsByWalletIdForAdmin(
      walletId,
      query.page,
      query.pageSize,
    );
  }

  @Patch("admin/transactions/:transactionId/confirmar")
  @Roles(Role.ADMIN_ROTTA)
  confirmarCredito(
    @Param("transactionId", ParseUUIDPipe) transactionId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.walletService.confirmarCredito(transactionId, actor, requestMeta(req));
  }

  @Patch("admin/withdrawal-requests/:withdrawalRequestId/concluir")
  @HttpCode(HttpStatus.OK)
  @Roles(Role.ADMIN_ROTTA)
  concluirSaque(
    @Param("withdrawalRequestId", ParseUUIDPipe) withdrawalRequestId: string,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.walletService.concluirSaque(withdrawalRequestId, actor, requestMeta(req));
  }

  @Patch("admin/withdrawal-requests/:withdrawalRequestId/rejeitar")
  @Roles(Role.ADMIN_ROTTA)
  rejeitarSaque(
    @Param("withdrawalRequestId", ParseUUIDPipe) withdrawalRequestId: string,
    @Body() dto: RejectWithdrawalDto,
    @CurrentUser() actor: AuthenticatedUser,
    @Req() req: Request,
  ) {
    return this.walletService.rejeitarSaque(
      withdrawalRequestId,
      dto.motivo,
      actor,
      requestMeta(req),
    );
  }
}
