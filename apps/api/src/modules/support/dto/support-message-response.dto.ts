import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class SupportMessageResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() ticketId!: string;
  @ApiPropertyOptional() autorUserId?: string | null;
  @ApiProperty() autorNome!: string;
  @ApiProperty() autorIsAdminRotta!: boolean;
  @ApiProperty() autorIsIA!: boolean;
  @ApiProperty() mensagem!: string;
  @ApiPropertyOptional() anexoUrl?: string | null;
  @ApiProperty() createdAt!: Date;
}
