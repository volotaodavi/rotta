import { ApiProperty } from "@nestjs/swagger";

/**
 * Resposta real de `RottaAiService.analyzeVehicleDocument` (Frente E) —
 * cobre APENAS formato e resolução da imagem (lidos direto dos bytes do
 * arquivo, `readImageMetadata`), não OCR de conteúdo nem detecção de
 * adulteração/fraude. `analiseCompleta: false` é permanente até um
 * provedor de visão computacional/OCR ser contratado — ver o porquê no
 * doc comment do método em `RottaAiService`. Nunca tratar
 * `qualidadeAdequada: true` como "documento aprovado": significa só
 * "a imagem está nítida o bastante para alguém LER" — não que o
 * conteúdo foi conferido.
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
    type: [String],
    description: "Avisos legíveis — sempre inclui a ressalva de escopo (só formato/resolução).",
  })
  avisos!: string[];

  @ApiProperty({
    example: false,
    description:
      "Sempre false hoje — nenhum provedor de OCR/detecção de adulteração está contratado.",
  })
  analiseCompleta!: false;
}
