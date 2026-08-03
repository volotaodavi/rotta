import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/** Nunca retornado hoje — `RottaAiService.analyzeSchoolAddress` é um stub (`NotImplementedException`). Documentado para já fixar o contrato que o provedor real devolverá. */
export class SchoolAddressAnalysisResponseDto {
  @ApiProperty() cepValido!: boolean;
  @ApiPropertyOptional() logradouroSugerido?: string;
  @ApiPropertyOptional() bairroSugerido?: string;
  @ApiPropertyOptional() cidadeSugerida?: string;
  @ApiPropertyOptional() estadoSugerido?: string;
  @ApiPropertyOptional() latitude?: number;
  @ApiPropertyOptional() longitude?: number;
}
