import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VehicleCategory, VehicleStatus, VehicleType } from "@prisma/client";

/** Forma de resposta pública de `Vehicle` (briefing "CADASTUR"/"STATUS"/"LOCALIZAÇÃO"). */
export class VehicleResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() placa!: string;
  @ApiProperty() modelo!: string;
  @ApiPropertyOptional() marca?: string | null;
  @ApiPropertyOptional() ano?: number | null;
  @ApiPropertyOptional() cor?: string | null;
  @ApiPropertyOptional() renavam?: string | null;
  @ApiPropertyOptional() chassi?: string | null;
  @ApiProperty() capacidadePassageiros!: number;
  @ApiProperty({ enum: VehicleType }) tipo!: VehicleType;
  @ApiProperty({ enum: VehicleCategory }) categoria!: VehicleCategory;
  @ApiPropertyOptional() observacoes?: string | null;
  @ApiPropertyOptional() fotoUrl?: string | null;
  @ApiProperty({ enum: VehicleStatus }) status!: VehicleStatus;
  @ApiProperty() quilometragemAtual!: number;
  @ApiPropertyOptional() ultimaLatitude?: number | null;
  @ApiPropertyOptional() ultimaLongitude?: number | null;
  @ApiPropertyOptional() ultimaPosicaoEm?: Date | null;
  @ApiPropertyOptional() viagemAtualId?: string | null;
  @ApiPropertyOptional() ultimoMotoristaId?: string | null;
  @ApiPropertyOptional() ultimoMonitorId?: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListVehiclesResponseDto {
  @ApiProperty({ type: [VehicleResponseDto] }) items!: VehicleResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
