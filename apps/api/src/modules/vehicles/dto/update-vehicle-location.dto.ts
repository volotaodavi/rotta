import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsLatitude, IsLongitude, IsOptional, IsString } from "class-validator";

/**
 * Última posição conhecida (briefing "LOCALIZAÇÃO") — endpoint de
 * ingestão simples, chamado hoje pelo próprio app do motorista durante a
 * viagem. Não é o pipeline de GPS completo do Dossiê 8 Seção 22
 * (particionamento/PostGIS) — apenas um snapshot desnormalizado em
 * `Vehicle`, documentado como lacuna conhecida até o módulo de GPS/Trips
 * existir.
 */
export class UpdateVehicleLocationDto {
  @ApiProperty({ example: -23.561684 })
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @ApiProperty({ example: -46.655981 })
  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional({
    description: "Referência da viagem em andamento (Trips ainda não existe)",
  })
  @IsOptional()
  @IsString()
  viagemId?: string;
}
