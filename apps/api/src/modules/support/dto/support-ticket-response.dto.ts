import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SupportTicketCategoria, SupportTicketStatus } from "@prisma/client";

import { SupportMessageResponseDto } from "./support-message-response.dto";

export class SupportTicketResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() companyNome!: string;
  @ApiProperty() abertoPorUserId!: string;
  @ApiProperty() abertoPorNome!: string;
  @ApiProperty() abertoPorEmail!: string;
  @ApiProperty() assunto!: string;
  @ApiProperty() descricao!: string;
  @ApiProperty({ enum: SupportTicketCategoria }) categoria!: SupportTicketCategoria;
  @ApiProperty({ enum: SupportTicketStatus }) status!: SupportTicketStatus;
  @ApiPropertyOptional() anexoUrl?: string | null;
  @ApiPropertyOptional() encerradoEm?: Date | null;
  @ApiPropertyOptional() encerradoPorNome?: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class SupportTicketDetailResponseDto extends SupportTicketResponseDto {
  @ApiProperty({ type: [SupportMessageResponseDto] }) mensagens!: SupportMessageResponseDto[];
}

export class ListSupportTicketsResponseDto {
  @ApiProperty({ type: [SupportTicketResponseDto] }) items!: SupportTicketResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
