import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VehicleMaintenanceType } from "@prisma/client";

export class VehicleMaintenanceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() vehicleId!: string;
  @ApiProperty({ enum: VehicleMaintenanceType }) tipo!: VehicleMaintenanceType;
  @ApiProperty() data!: Date;
  @ApiPropertyOptional() quilometragem?: number | null;
  @ApiPropertyOptional() valorCentavos?: number | null;
  @ApiPropertyOptional() fornecedor?: string | null;
  @ApiPropertyOptional() observacoes?: string | null;
  @ApiProperty() registradoPorId!: string;
  @ApiProperty() createdAt!: Date;
}

export class ListVehicleMaintenancesResponseDto {
  @ApiProperty({ type: [VehicleMaintenanceResponseDto] }) items!: VehicleMaintenanceResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
