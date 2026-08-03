import { ApiProperty } from "@nestjs/swagger";
import { IsLatitude, IsLongitude } from "class-validator";

/** Correção manual de uma coordenada na Fila de Revisão Manual (briefing "IMPORTANTE" — 3 tentativas automáticas esgotadas). */
export class RevisarCoordinateDto {
  @ApiProperty({ example: -23.561684 })
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: -46.655981 })
  @IsLongitude()
  longitude!: number;
}
