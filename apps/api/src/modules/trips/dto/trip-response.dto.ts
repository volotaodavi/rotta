import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TripStatus } from "@prisma/client";

/** Forma de resposta pública de `Trip` (GPS-01/06). */
export class TripResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() routeId!: string;
  @ApiProperty() data!: Date;
  @ApiProperty({ enum: TripStatus }) status!: TripStatus;
  @ApiProperty() veiculoId!: string;
  @ApiProperty() motoristaId!: string;
  @ApiPropertyOptional() monitorId?: string | null;
  @ApiProperty() iniciadaEm!: Date;
  @ApiPropertyOptional() finalizadaEm?: Date | null;
  @ApiPropertyOptional() canceladaEm?: Date | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListTripsResponseDto {
  @ApiProperty({ type: [TripResponseDto] }) items!: TripResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
