import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Forma de resposta pública de `AuditLog` (Dossiê 8, Seção 16) —
 * compartilhada por qualquer módulo de domínio que exponha seu próprio
 * `GET /:recurso/:id/audit-logs` (Companies, Vehicles, ...): cada
 * domínio resolve a própria autorização, mas o formato do log em si é
 * sempre o mesmo, então vive aqui em vez de duplicado por módulo.
 */
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
