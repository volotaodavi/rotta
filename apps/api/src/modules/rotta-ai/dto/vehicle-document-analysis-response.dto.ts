import { ApiProperty } from "@nestjs/swagger";

/**
 * Resposta real de `RottaAiService.analyzeVehicleDocument` (Frente E) e
 * `analyzeDriverDocument` (Frente F, tipos EAR/CURSO — mesma análise,
 * documento de pessoa em vez de veículo) — formato/resolução da imagem
 * (`readImageMetadata`) MAIS, desde as Frentes G/H, OCR real via
 * Tesseract.js (`ocr.util.ts`) checando se palavras/números esperados
 * pro tipo de documento aparecem no texto lido (`document-field-
 * detection.util.ts`). Continua NÃO confirmando autenticidade nem
 * detectando adulteração — `analiseCompleta` é permanentemente `false`
 * até um provedor de visão computacional ser contratado. Nunca tratar
 * `qualidadeAdequada: true` ou `camposEncontrados` não-vazio como
 * "documento aprovado": significa só "a imagem está legível e contém
 * palavras/números compatíveis com o tipo declarado" — não que o
 * conteúdo foi verificado/autenticado.
 */
export class VehicleDocumentAnalysisResponseDto {
  @ApiProperty() tipo!: string;

  @ApiProperty({ description: "true quando o arquivo é um JPEG ou PNG reconhecível." })
  formatoValido!: boolean;

  @ApiProperty({ required: false, nullable: true, enum: ["jpeg", "png"] })
  formatoDetectado!: "jpeg" | "png" | null;

  @ApiProperty({ required: false, nullable: true })
  larguraPx!: number | null;

  @ApiProperty({ required: false, nullable: true })
  alturaPx!: number | null;

  @ApiProperty({
    description:
      "true quando o formato é reconhecido e a resolução está acima do mínimo legível — NÃO significa que o conteúdo do documento foi verificado.",
  })
  qualidadeAdequada!: boolean;

  @ApiProperty() tamanhoBytes!: number;

  @ApiProperty({
    description:
      "true quando o OCR (Tesseract.js) conseguiu extrair algum texto da imagem — só roda quando qualidadeAdequada é true. false não significa documento inválido, pode ser falha temporária do OCR.",
  })
  ocrExecutado!: boolean;

  @ApiProperty({
    type: [String],
    description:
      'Palavras/números esperados pro tipo de documento que o OCR encontrou no texto (ex. RENAVAM, placa, "apólice") — vazio não significa documento inválido, só que nada do esperado foi lido.',
  })
  camposEncontrados!: string[];

  @ApiProperty({
    type: [String],
    description:
      "Avisos legíveis — sempre inclui a ressalva de escopo (formato/resolução/OCR de palavras-chave, nunca autenticidade).",
  })
  avisos!: string[];

  @ApiProperty({
    example: false,
    description:
      "Sempre false hoje — o OCR (Frentes G/H) lê texto e confere campos esperados, mas nenhum provedor de detecção de adulteração/autenticidade está contratado.",
  })
  analiseCompleta!: false;
}
