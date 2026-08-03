import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Análise de endereço de ESCOLA (briefing "ROTTA AI" do módulo Escolas
 * — "Corrigir endereços. Validar CEP. Geocodificar endereço. Obter
 * coordenadas automaticamente."). As quatro capacidades vivem em UM
 * único contrato agrupado (não quatro DTOs separados) porque
 * `RottaAiService.analyzeSchoolAddress` resolve todas de uma vez, via
 * Rotta Geo Engine (Mapbox Geocoding API — `MAPBOX_ACCESS_TOKEN`).
 */
export class AnalyzeSchoolAddressDto {
  @ApiProperty({ example: "01310100" })
  @IsString()
  @MaxLength(9)
  cep!: string;

  @ApiPropertyOptional({ example: "Avenida Paulista, 1000" })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  enderecoLivre?: string;
}
