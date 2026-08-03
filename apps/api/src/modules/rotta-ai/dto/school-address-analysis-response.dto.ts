import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/** Resposta real de `RottaAiService.analyzeSchoolAddress` (Rotta Geo Engine/Nominatim) — campos sugeridos ficam `undefined` quando o Nominatim não os devolve para o endereço informado. */
export class SchoolAddressAnalysisResponseDto {
  @ApiProperty() cepValido!: boolean;
  @ApiPropertyOptional() logradouroSugerido?: string;
  @ApiPropertyOptional() bairroSugerido?: string;
  @ApiPropertyOptional() cidadeSugerida?: string;
  @ApiPropertyOptional() estadoSugerido?: string;
  @ApiPropertyOptional() latitude?: number;
  @ApiPropertyOptional() longitude?: number;
}
