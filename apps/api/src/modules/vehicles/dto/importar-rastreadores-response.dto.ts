import { ApiProperty } from "@nestjs/swagger";

/** Uma linha que NÃO entrou, com o motivo em português para quem vai corrigir a planilha. */
export class LinhaRecusadaDto {
  @ApiProperty({
    description: "Posição na planilha, começando em 1 — é assim que a pessoa acha a linha.",
  })
  linha!: number;

  @ApiProperty({ example: "412" })
  identificador!: string;

  @ApiProperty({ example: "Nenhum ônibus com este número nesta transportadora." })
  motivo!: string;
}

/**
 * Resultado da importação em lote. Deliberadamente parcial: uma linha
 * errada não derruba as certas, e o Admin corrige só o que sobrou.
 */
export class ImportarRastreadoresResponseDto {
  @ApiProperty() total!: number;

  @ApiProperty({ description: "Quantos ônibus ficaram com rastreador credenciado." })
  credenciados!: number;

  @ApiProperty({ type: [LinhaRecusadaDto] })
  recusadas!: LinhaRecusadaDto[];
}
