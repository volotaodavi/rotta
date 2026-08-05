import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/** Forma de resposta pública de `TripPosition` (GPS-03/06). */
export class TripPositionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tripId!: string;
  @ApiProperty() latitude!: number;
  @ApiProperty() longitude!: number;
  @ApiPropertyOptional() precisaoMetros?: number | null;
  @ApiPropertyOptional() velocidadeKmh?: number | null;
  @ApiProperty() capturadaEm!: Date;
  @ApiProperty() simuladoSuspeito!: boolean;
  @ApiProperty() createdAt!: Date;
}
