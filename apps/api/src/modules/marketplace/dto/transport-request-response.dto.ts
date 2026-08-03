import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SchoolShift, TransportRequestStatus } from "@prisma/client";

/** Solicitação de transporte (briefing "SOLICITAÇÃO"). */
export class TransportRequestResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() responsavelId!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() schoolId!: string;
  @ApiProperty({ enum: SchoolShift }) turno!: SchoolShift;

  @ApiProperty({ enum: TransportRequestStatus }) status!: TransportRequestStatus;
  @ApiPropertyOptional() motivoRecusa?: string | null;

  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListTransportRequestsResponseDto {
  @ApiProperty({ type: [TransportRequestResponseDto] }) items!: TransportRequestResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
