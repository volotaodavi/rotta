import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsString } from "class-validator";

/** Tipos de verificação previstos para a Rotta AI (briefing "Rotta AI"). */
export const ROTTA_AI_CHECK_TYPES = ["CNH", "SELFIE", "FACE_MATCH", "OCR", "EAR", "CURSO"] as const;
export type RottaAiCheckType = (typeof ROTTA_AI_CHECK_TYPES)[number];

export class ValidateDocumentDto {
  @ApiProperty({ enum: ROTTA_AI_CHECK_TYPES, example: "CNH" })
  @IsIn(ROTTA_AI_CHECK_TYPES)
  tipo!: RottaAiCheckType;

  @ApiProperty({ description: "Caminho/identificador do arquivo já enviado via Supabase Storage." })
  @IsString()
  @IsNotEmpty()
  referenciaArquivo!: string;
}
