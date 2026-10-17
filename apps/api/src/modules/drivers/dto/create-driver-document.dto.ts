import { ApiPropertyOptional, ApiProperty } from "@nestjs/swagger";
import { DriverDocumentType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";

import { IsDiaDoCalendario } from "@/common/validators";

/**
 * Metadados enviados junto com o arquivo (`multipart/form-data`, campo
 * `file`) no upload de documento de habilitação/qualificação do
 * motorista (Dossiê 28 — CNH/EAR/Cursos obrigatórios).
 */
export class CreateDriverDocumentDto {
  @ApiProperty({ enum: DriverDocumentType, example: DriverDocumentType.CNH })
  @IsEnum(DriverDocumentType)
  tipo!: DriverDocumentType;

  @ApiPropertyOptional({ description: "Número do documento (nº da CNH, nº do certificado EAR)" })
  @IsOptional()
  @IsString()
  @MaxLength(64)
  numero?: string;

  @ApiPropertyOptional({ description: "Categoria da CNH (ex. D, E): só relevante para tipo=CNH" })
  @IsOptional()
  @IsString()
  @MaxLength(8)
  categoria?: string;

  @ApiPropertyOptional({ description: "Data de vencimento (CNH/EAR/curso)" })
  @IsOptional()
  @IsDiaDoCalendario()
  vencimentoEm?: string;
}
