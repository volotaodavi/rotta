import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsLatitude, IsLongitude, IsOptional, IsPositive, Max } from "class-validator";

/** Escolas mais próximas de um ponto (raio em km), briefing "MAP INTELLIGENCE AGENT" §"MARCADORES". */
export class ListNearbySchoolsQueryDto {
  @ApiProperty({ description: "Latitude do ponto de origem" })
  @Type(() => Number)
  @IsLatitude()
  lat!: number;

  @ApiProperty({ description: "Longitude do ponto de origem" })
  @Type(() => Number)
  @IsLongitude()
  lng!: number;

  @ApiPropertyOptional({ description: "Raio de busca em km", default: 10, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsPositive()
  @Max(100)
  raioKm: number = 10;
}
