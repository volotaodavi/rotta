import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

/** Tipos de verificação previstos para a Rotta AI (briefing "Rotta AI"). */
export const ROTTA_AI_CHECK_TYPES = ["CNH", "SELFIE", "FACE_MATCH", "OCR", "EAR", "CURSO"] as const;
export type RottaAiCheckType = (typeof ROTTA_AI_CHECK_TYPES)[number];

export class ValidateDocumentDto {
  @ApiProperty({ enum: ROTTA_AI_CHECK_TYPES, example: "CNH" })
  @IsIn(ROTTA_AI_CHECK_TYPES)
  tipo!: RottaAiCheckType;

  @ApiProperty({
    description:
      "Caminho/identificador do arquivo já enviado via Supabase Storage. Para CNH/OCR: frente do documento. Para SELFIE: a própria selfie. Para FACE_MATCH: a selfie (o documento de referência vai em `referenciaArquivoComparacao`).",
  })
  @IsString()
  @IsNotEmpty()
  referenciaArquivo!: string;

  @ApiProperty({
    required: false,
    description:
      "Só para FACE_MATCH: referência da foto do documento de identidade (ex. retrato da CNH) a comparar com `referenciaArquivo` (a selfie).",
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  referenciaArquivoComparacao?: string;
}
