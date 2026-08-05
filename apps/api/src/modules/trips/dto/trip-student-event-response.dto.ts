import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TripStudentEventType } from "@prisma/client";

/** Forma de resposta pública de `TripStudentEvent` (EMB-01/05 + DESEMB-01/03). */
export class TripStudentEventResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tripId!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() routeStopId!: string;
  @ApiProperty({ enum: TripStudentEventType }) tipo!: TripStudentEventType;
  @ApiPropertyOptional() motivoAusencia?: string | null;
  @ApiProperty() processadoPorId!: string;
  @ApiProperty() processadoEm!: Date;
}
