import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsString } from "class-validator";

/**
 * Tipos de verificação sobre documentos de VEÍCULO (briefing "ROTTA AI"
 * do módulo Veículos) — "Analisar documentos enviados, verificar
 * qualidade das imagens, detectar documentos ilegíveis, detectar
 * possíveis adulterações, alertar vencimentos". Deliberadamente um
 * contrato separado de `ValidateDocumentDto`/`RottaAiCheckType`: aquele
 * é escopo de identidade da PESSOA (CNH/Selfie/Face Match — Dossiê 15);
 * este é escopo de documentação do VEÍCULO (CRLV/Seguro/Laudo/Vistoria).
 */
export const VEHICLE_DOCUMENT_AI_CHECK_TYPES = [
  "CRLV",
  "LICENCIAMENTO",
  "SEGURO",
  "LAUDO",
  "VISTORIA",
  "FOTO",
] as const;
export type VehicleDocumentAiCheckType = (typeof VEHICLE_DOCUMENT_AI_CHECK_TYPES)[number];

export class AnalyzeVehicleDocumentDto {
  @ApiProperty({ enum: VEHICLE_DOCUMENT_AI_CHECK_TYPES, example: "CRLV" })
  @IsIn(VEHICLE_DOCUMENT_AI_CHECK_TYPES)
  tipo!: VehicleDocumentAiCheckType;

  @ApiProperty({ description: "Caminho/identificador do arquivo já enviado via Supabase Storage." })
  @IsString()
  @IsNotEmpty()
  referenciaArquivo!: string;
}
