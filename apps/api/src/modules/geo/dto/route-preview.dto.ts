import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { ArrayMaxSize, IsArray, IsOptional, ValidateNested } from "class-validator";

import { CoordenadaDto } from "./coordenada.dto";

/**
 * Prévia de rota entre dois pontos (OSRM `/route`, via
 * `GeoEngineService.getRoute`) — usado pelo cadastro de Aluno pra
 * desenhar o trajeto embarque → escola antes mesmo de o aluno ser
 * salvo (nenhuma `Route`/`RouteStop` envolvida, é só visualização no
 * formulário).
 */
export class RoutePreviewDto {
  @ApiProperty({ type: CoordenadaDto })
  @ValidateNested()
  @Type(() => CoordenadaDto)
  origem!: CoordenadaDto;

  @ApiProperty({ type: CoordenadaDto })
  @ValidateNested()
  @Type(() => CoordenadaDto)
  destino!: CoordenadaDto;

  @ApiPropertyOptional({ type: [CoordenadaDto] })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => CoordenadaDto)
  paradas?: CoordenadaDto[];
}
