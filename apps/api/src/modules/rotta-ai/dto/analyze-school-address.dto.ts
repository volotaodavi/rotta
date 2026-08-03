import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Análise de endereço de ESCOLA (briefing "ROTTA AI" do módulo Escolas
 * — "Corrigir endereços. Validar CEP. Geocodificar endereço. Obter
 * coordenadas automaticamente."). As quatro capacidades pedidas
 * dependem de um provedor externo de geocodificação/endereços (ex.
 * ViaCEP + Google Maps/Mapbox) — nenhum está contratado/configurado
 * (mesma lacuna de `packages/maps`, já disclosed no módulo Veículos),
 * então vivem em UM único contrato agrupado, não quatro stubs
 * separados sem diferença real de implementação hoje.
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
