import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VehicleDocumentType } from "@prisma/client";
import { IsEnum, IsOptional, IsUUID } from "class-validator";

import { IsDiaDoCalendario } from "@/common/validators";

/**
 * Metadados enviados junto com o arquivo (`multipart/form-data`, campo
 * `file`) no upload de documento do veículo (briefing "DOCUMENTAÇÃO").
 */
export class CreateVehicleDocumentDto {
  @ApiProperty({ enum: VehicleDocumentType, example: VehicleDocumentType.CRLV })
  @IsEnum(VehicleDocumentType)
  tipo!: VehicleDocumentType;

  @ApiPropertyOptional({
    example: "2026-12-31",
    description: "Data de vencimento (CRLV/Seguro/Licenciamento/Vistoria), `AAAA-MM-DD`.",
  })
  @IsOptional()
  @IsDiaDoCalendario()
  vencimentoEm?: string;

  @ApiPropertyOptional({ description: "Anexa este documento a uma manutenção específica" })
  @IsOptional()
  @IsUUID()
  maintenanceId?: string;
}
