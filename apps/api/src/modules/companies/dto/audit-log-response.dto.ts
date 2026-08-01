import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class AuditLogResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() entidadeTipo!: string;
  @ApiProperty() entidadeId!: string;
  @ApiProperty() acao!: string;
  @ApiPropertyOptional() atorUserId?: string | null;
  @ApiPropertyOptional({ type: "object", additionalProperties: true }) dadosAntes?: unknown;
  @ApiPropertyOptional({ type: "object", additionalProperties: true }) dadosDepois?: unknown;
  @ApiProperty() createdAt!: Date;
}

export class ListAuditLogsResponseDto {
  @ApiProperty({ type: [AuditLogResponseDto] }) items!: AuditLogResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
