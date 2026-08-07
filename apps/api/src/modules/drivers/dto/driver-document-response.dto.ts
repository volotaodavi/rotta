import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DriverDocumentAiStatus, DriverDocumentType } from "@prisma/client";

export class DriverDocumentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() userId!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty({ enum: DriverDocumentType }) tipo!: DriverDocumentType;
  @ApiPropertyOptional() numero?: string | null;
  @ApiPropertyOptional() categoria?: string | null;
  @ApiProperty() nomeOriginal!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty() fileUrl!: string;
  @ApiPropertyOptional() vencimentoEm?: Date | null;
  @ApiProperty({ enum: DriverDocumentAiStatus }) rottaAiStatus!: DriverDocumentAiStatus;
  @ApiPropertyOptional() rottaAiQualidadeOk?: boolean | null;
  @ApiPropertyOptional() rottaAiLegivel?: boolean | null;
  @ApiPropertyOptional() rottaAiSuspeitaAdulteracao?: boolean | null;
  @ApiPropertyOptional() rottaAiObservacoes?: string | null;
  @ApiPropertyOptional() rottaAiAnalisadoEm?: Date | null;
  @ApiProperty() uploadedByUserId!: string;
  @ApiProperty() createdAt!: Date;
}
