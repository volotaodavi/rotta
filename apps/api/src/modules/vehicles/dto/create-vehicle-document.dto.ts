import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VehicleDocumentType } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsUUID } from "class-validator";

/**
 * Metadados enviados junto com o arquivo (`multipart/form-data`, campo
 * `file`) no upload de documento do veículo (briefing "DOCUMENTAÇÃO").
 */
export class CreateVehicleDocumentDto {
  @ApiProperty({ enum: VehicleDocumentType, example: VehicleDocumentType.CRLV })
  @IsEnum(VehicleDocumentType)
  tipo!: VehicleDocumentType;

  @ApiPropertyOptional({ description: "Data de vencimento (CRLV/Seguro/Licenciamento/Vistoria)" })
  @IsOptional()
  @IsDateString()
  vencimentoEm?: string;

  @ApiPropertyOptional({ description: "Anexa este documento a uma manutenção específica" })
  @IsOptional()
  @IsUUID()
  maintenanceId?: string;
}
