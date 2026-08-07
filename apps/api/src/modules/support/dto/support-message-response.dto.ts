import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SupportMessageResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() ticketId!: string;
  @ApiProperty() autorUserId!: string;
  @ApiProperty() autorNome!: string;
  @ApiProperty() autorIsAdminRotta!: boolean;
  @ApiProperty() mensagem!: string;
  @ApiPropertyOptional() anexoUrl?: string | null;
  @ApiProperty() createdAt!: Date;
}
