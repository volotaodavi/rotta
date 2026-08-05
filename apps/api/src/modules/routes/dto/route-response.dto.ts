import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { RouteStatus, RouteWeekday, SchoolShift } from "@prisma/client";

/** Forma de resposta pública de `Route` (ROT-01/02/04). */
export class RouteResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() nome!: string;
  @ApiProperty({ enum: SchoolShift }) turno!: SchoolShift;
  @ApiProperty({ enum: RouteWeekday, isArray: true }) diasSemana!: RouteWeekday[];
  @ApiProperty({ enum: RouteStatus }) status!: RouteStatus;
  @ApiPropertyOptional() veiculoPadraoId?: string | null;
  @ApiPropertyOptional() motoristaPadraoId?: string | null;
  @ApiPropertyOptional() monitorPadraoId?: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListRoutesResponseDto {
  @ApiProperty({ type: [RouteResponseDto] }) items!: RouteResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
