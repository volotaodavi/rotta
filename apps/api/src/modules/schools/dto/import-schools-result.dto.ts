import { ApiProperty } from "@nestjs/swagger";

export class ImportSchoolsRowErrorDto {
  @ApiProperty() linha!: number;
  @ApiProperty() mensagem!: string;
}

/** Resultado da importação (briefing "IMPORTAÇÃO") — nunca falha a linha inteira do arquivo por causa de uma linha só; erros ficam em `erros`, o resto é processado. */
export class ImportSchoolsResultDto {
  @ApiProperty() totalLinhas!: number;
  @ApiProperty() importadas!: number;
  @ApiProperty({ type: [ImportSchoolsRowErrorDto] }) erros!: ImportSchoolsRowErrorDto[];
}
