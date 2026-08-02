import { ApiProperty } from "@nestjs/swagger";

/** Dashboard do módulo Veículos (briefing "DASHBOARD"). */
export class VehicleDashboardResponseDto {
  @ApiProperty() totalVeiculos!: number;
  @ApiProperty() veiculosAtivos!: number;
  @ApiProperty() veiculosEmViagem!: number;
  @ApiProperty() veiculosEmManutencao!: number;
  @ApiProperty() capacidadeTotalPassageiros!: number;
  @ApiProperty() quilometragemTotal!: number;
  @ApiProperty() documentosVencendo!: number;
  @ApiProperty({ type: [String] }) alertas!: string[];
}
