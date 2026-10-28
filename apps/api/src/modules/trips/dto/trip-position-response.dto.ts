import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import type { TripPositionOrigem } from "@prisma/client";

/** Forma de resposta pública de `TripPosition` (GPS-03/06). */
export class TripPositionResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tripId!: string;
  /**
   * Rastreador do ônibus ou celular do motorista.
   *
   * Vai para fora porque o app do motorista precisa saber quando a
   * posição que ele recebe de volta não é a dele: enquanto o
   * rastreador está falando, as leituras do celular são ignoradas e a
   * resposta é a posição do aparelho.
   */
  @ApiProperty({ enum: ["RASTREADOR", "CELULAR"] }) origem!: TripPositionOrigem;
  @ApiProperty() latitude!: number;
  @ApiProperty() longitude!: number;
  @ApiPropertyOptional() precisaoMetros?: number | null;
  @ApiPropertyOptional() velocidadeKmh?: number | null;
  @ApiProperty() capturadaEm!: Date;
  @ApiProperty() simuladoSuspeito!: boolean;
  @ApiProperty() createdAt!: Date;
}
