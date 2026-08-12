import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsString } from "class-validator";

/**
 * Tipos de qualificação do MOTORISTA que a Didit não cobre (Frente F —
 * EAR/Curso especializado, Dossiê 28 `DRV-03`/`DRV-04`). CNH continua
 * pelo caminho existente (`ValidateDocumentDto`/`RottaAiService.validateDocument`,
 * real via Didit desde o Dossiê 15) — este contrato é só para os dois
 * tipos que a Didit não reconhece (catálogo dela é documento de
 * identidade mundial, não certificado específico de trânsito
 * brasileiro).
 */
export const DRIVER_DOCUMENT_IMAGE_QUALITY_CHECK_TYPES = ["EAR", "CURSO"] as const;
export type DriverDocumentImageQualityCheckType =
  (typeof DRIVER_DOCUMENT_IMAGE_QUALITY_CHECK_TYPES)[number];

export class AnalyzeDriverDocumentDto {
  @ApiProperty({ enum: DRIVER_DOCUMENT_IMAGE_QUALITY_CHECK_TYPES, example: "EAR" })
  @IsIn(DRIVER_DOCUMENT_IMAGE_QUALITY_CHECK_TYPES)
  tipo!: DriverDocumentImageQualityCheckType;

  @ApiProperty({ description: "Caminho/identificador do arquivo já enviado via Supabase Storage." })
  @IsString()
  @IsNotEmpty()
  referenciaArquivo!: string;
}
