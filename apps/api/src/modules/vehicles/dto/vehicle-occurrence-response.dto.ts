import { ApiProperty } from "@nestjs/swagger";
import { VehicleOccurrenceSeverity } from "@prisma/client";

export class VehicleOccurrenceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() vehicleId!: string;
  @ApiProperty() reportadoPorId!: string;
  @ApiProperty() titulo!: string;
  @ApiProperty() descricao!: string;
  @ApiProperty({ enum: VehicleOccurrenceSeverity }) severidade!: VehicleOccurrenceSeverity;
  @ApiProperty({ type: [String] }) fotoUrls!: string[];
  @ApiProperty() createdAt!: Date;
}

export class ListVehicleOccurrencesResponseDto {
  @ApiProperty({ type: [VehicleOccurrenceResponseDto] }) items!: VehicleOccurrenceResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
