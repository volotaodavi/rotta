import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/** Tela "Meus dispositivos" (Dossiê 15, `AUTH-06`). `isCurrentSession` nunca vem do cliente — resolvido no service comparando com a sessão do token em uso. */
export class SessionResponseDto {
  @ApiProperty() id!: string;
  @ApiPropertyOptional() deviceName?: string | null;
  @ApiPropertyOptional() ip?: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() lastUsedAt!: Date;
  @ApiProperty() isCurrentSession!: boolean;
}
