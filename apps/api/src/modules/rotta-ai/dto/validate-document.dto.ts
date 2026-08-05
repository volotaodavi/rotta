import { ApiProperty } from "@nestjs/swagger";
import { IsIn, IsNotEmpty, IsOptional, IsString } from "class-validator";

/**
 * Tipos de verificação previstos para a Rotta AI (briefing "Rotta AI").
 *
 * `RG`/`CIN`/`PASSAPORTE` existem para papéis QUE NÃO SÃO Motorista
 * (Monitor, Despachante e afins — qualquer documento de identidade
 * reconhecido serve). Para o papel Motorista, `RottaAiService` só
 * aceita `CNH` — nunca RG/CIN/Passaporte — porque a CNH é o único
 * documento que também comprova habilitação para dirigir veículo
 * escolar (`DRV-02`, Dossiê 16); um motorista com RG aprovado não
 * atenderia a exigência de categoria mínima D/E.
 */
export const ROTTA_AI_CHECK_TYPES = [
  "CNH",
  "RG",
  "CIN",
  "PASSAPORTE",
  "SELFIE",
  "FACE_MATCH",
  "OCR",
  "EAR",
  "CURSO",
] as const;
export type RottaAiCheckType = (typeof ROTTA_AI_CHECK_TYPES)[number];

/** Documentos de identidade aceitos para papéis que NÃO são Motorista (Monitor, Despachante etc.). */
export const IDENTITY_DOCUMENT_TYPES_NAO_MOTORISTA: readonly RottaAiCheckType[] = [
  "CNH",
  "RG",
  "CIN",
  "PASSAPORTE",
];

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
