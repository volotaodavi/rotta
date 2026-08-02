import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VehicleDocumentAiStatus, VehicleDocumentType } from "@prisma/client";

export class VehicleDocumentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() vehicleId!: string;
  @ApiPropertyOptional() maintenanceId?: string | null;
  @ApiProperty({ enum: VehicleDocumentType }) tipo!: VehicleDocumentType;
  @ApiProperty() nomeOriginal!: string;
  @ApiProperty() mimeType!: string;
  @ApiProperty() fileUrl!: string;
  @ApiPropertyOptional() vencimentoEm?: Date | null;
  @ApiProperty({ enum: VehicleDocumentAiStatus }) rottaAiStatus!: VehicleDocumentAiStatus;
  @ApiPropertyOptional() rottaAiQualidadeOk?: boolean | null;
  @ApiPropertyOptional() rottaAiLegivel?: boolean | null;
  @ApiPropertyOptional() rottaAiSuspeitaAdulteracao?: boolean | null;
  @ApiPropertyOptional() rottaAiObservacoes?: string | null;
  @ApiPropertyOptional() rottaAiAnalisadoEm?: Date | null;
  @ApiProperty() uploadedByUserId!: string;
  @ApiProperty() createdAt!: Date;
}
