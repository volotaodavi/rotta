import { ApiProperty } from "@nestjs/swagger";

/** Resposta real de `RottaAiService.validateDocument` (Didit) para CNH/SELFIE/FACE_MATCH/OCR. */
export class ValidateDocumentResponseDto {
  @ApiProperty({ description: "true quando a Didit aprovou a verificação." })
  aprovado!: boolean;

  @ApiProperty({
    description: 'Status bruto devolvido pela Didit (ex. "approved", "declined", "in review").',
  })
  status!: string;

  @ApiProperty({ example: "didit" })
  provedor!: "didit";

  @ApiProperty({
    required: false,
    description: "Só para CNH/OCR: tipo de documento reconhecido pela Didit.",
  })
  tipoDocumento?: string;

  @ApiProperty({
    required: false,
    description: "Só para FACE_MATCH: score de similaridade facial (0 a 1).",
  })
  scoreFaceMatch?: number;

  @ApiProperty({ description: "Corpo bruto da resposta da Didit, para auditoria/depuração." })
  dadosBrutos!: Record<string, unknown>;
}
