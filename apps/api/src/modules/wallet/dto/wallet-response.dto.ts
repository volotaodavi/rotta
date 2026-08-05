import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import {
  WalletOwnerType,
  WalletTransactionStatus,
  WalletTransactionType,
  WithdrawalRequestStatus,
} from "@prisma/client";

export class WalletResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: WalletOwnerType }) ownerType!: WalletOwnerType;
  @ApiPropertyOptional() companyId?: string | null;
  @ApiPropertyOptional() motoristaId?: string | null;
  @ApiProperty() saldoDisponivelCentavos!: number;
  @ApiProperty() saldoPendenteCentavos!: number;
  @ApiProperty() moeda!: string;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class WalletTransactionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() walletId!: string;
  @ApiProperty({ enum: WalletTransactionType }) tipo!: WalletTransactionType;
  @ApiProperty({ enum: WalletTransactionStatus }) status!: WalletTransactionStatus;
  @ApiProperty() valorCentavos!: number;
  @ApiProperty() saldoDisponivelAposCentavos!: number;
  @ApiProperty() descricao!: string;
  @ApiPropertyOptional() contractId?: string | null;
  @ApiPropertyOptional() withdrawalRequestId?: string | null;
  @ApiPropertyOptional() criadaPorUserId?: string | null;
  @ApiProperty() createdAt!: Date;
}

export class ListWalletTransactionsResponseDto {
  @ApiProperty({ type: [WalletTransactionResponseDto] }) items!: WalletTransactionResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}

export class WithdrawalRequestResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() walletId!: string;
  @ApiProperty() valorCentavos!: number;
  @ApiProperty() chavePix!: string;
  @ApiProperty({ enum: WithdrawalRequestStatus }) status!: WithdrawalRequestStatus;
  @ApiProperty() solicitadoPorUserId!: string;
  @ApiPropertyOptional() providerReferencia?: string | null;
  @ApiPropertyOptional() motivoRejeicao?: string | null;
  @ApiPropertyOptional() processadoEm?: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
