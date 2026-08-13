import { ApiProperty } from "@nestjs/swagger";
import { IsLatitude, IsLongitude } from "class-validator";

/** Ponto geográfico — mesmo shape de `RevisarCoordinateDto`, extraído aqui pra ser reaproveitado por `RoutePreviewDto` sem duplicar `@IsLatitude`/`@IsLongitude`. */
export class CoordenadaDto {
  @ApiProperty({ example: -23.561684 })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: -46.655981 })
  @IsLongitude()
  longitude!: number;
}
