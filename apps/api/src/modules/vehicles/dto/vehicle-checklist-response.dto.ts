import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class VehicleChecklistResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() vehicleId!: string;
  @ApiProperty() motoristaId!: string;
  @ApiPropertyOptional() viagemId?: string | null;
  @ApiProperty() pneusOk!: boolean;
  @ApiProperty() lucesOk!: boolean;
  @ApiProperty() combustivelOk!: boolean;
  @ApiProperty() limpezaOk!: boolean;
  @ApiProperty() equipamentosObrigatoriosOk!: boolean;
  @ApiPropertyOptional() observacoes?: string | null;
  @ApiProperty() createdAt!: Date;
}

export class ListVehicleChecklistsResponseDto {
  @ApiProperty({ type: [VehicleChecklistResponseDto] }) items!: VehicleChecklistResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
