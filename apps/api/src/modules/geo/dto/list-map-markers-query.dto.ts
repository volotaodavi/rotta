import { ApiProperty } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsLatitude, IsLongitude } from "class-validator";

/** Marcadores de Escolas dentro de uma janela visível do mapa (bounding box), briefing "MAP INTELLIGENCE AGENT" §"MARCADORES". */
export class ListMapMarkersQueryDto {
  @ApiProperty({ description: "Latitude do canto sudoeste (inferior-esquerdo) da janela do mapa" })
  @Type(() => Number)
  @IsLatitude()
  swLat!: number;

  @ApiProperty({ description: "Longitude do canto sudoeste (inferior-esquerdo) da janela do mapa" })
  @Type(() => Number)
  @IsLongitude()
  swLng!: number;

  @ApiProperty({ description: "Latitude do canto nordeste (superior-direito) da janela do mapa" })
  @Type(() => Number)
  @IsLatitude()
  neLat!: number;

  @ApiProperty({ description: "Longitude do canto nordeste (superior-direito) da janela do mapa" })
  @Type(() => Number)
  @IsLongitude()
  neLng!: number;
}
