import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VehicleMaintenanceType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, IsString, Min, MaxLength } from "class-validator";

/** Registro de manutenção (briefing "MANUTENÇÃO"). */
export class CreateVehicleMaintenanceDto {
  @ApiProperty({ enum: VehicleMaintenanceType, example: VehicleMaintenanceType.TROCA_OLEO })
  @IsEnum(VehicleMaintenanceType)
  tipo!: VehicleMaintenanceType;

  @ApiProperty({ example: "2026-08-01" })
  @IsDateString()
  data!: string;

  @ApiPropertyOptional({ example: 45000 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  quilometragem?: number;

  @ApiPropertyOptional({ example: 25000, description: "Valor em centavos" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  valorCentavos?: number;

  @ApiPropertyOptional({ example: "Oficina Central" })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  fornecedor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string;
}
