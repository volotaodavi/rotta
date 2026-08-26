import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { VehicleCategory, VehicleType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min } from "class-validator";

import { IsPlate } from "@/common/validators";

/** Cadastro de Veículo (briefing "CADASTRO") — sempre pertence ao tenant do ator autenticado. */
export class CreateVehicleDto {
  @ApiProperty({ example: "ABC1D23", description: "Formato antigo ou Mercosul" })
  @IsPlate()
  placa!: string;

  @ApiProperty({ example: "Sprinter 415" })
  @IsString()
  @MaxLength(120)
  modelo!: string;

  @ApiProperty({ example: "Mercedes-Benz" })
  @IsString()
  @MaxLength(80)
  marca!: string;

  @ApiPropertyOptional({ example: 2022 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1950)
  @Max(2100)
  ano?: number;

  @ApiPropertyOptional({ example: "Branco" })
  @IsOptional()
  @IsString()
  @MaxLength(40)
  cor?: string;

  @ApiPropertyOptional({ example: "12345678901" })
  @IsOptional()
  @IsString()
  renavam?: string;

  @ApiPropertyOptional({ example: "9BWZZZ377VT004251" })
  @IsOptional()
  @IsString()
  chassi?: string;

  @ApiProperty({ example: 16, minimum: 1, maximum: 90 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(90)
  capacidadePassageiros!: number;

  @ApiProperty({ enum: VehicleType, example: VehicleType.VAN })
  @IsEnum(VehicleType)
  tipo!: VehicleType;

  @ApiPropertyOptional({ enum: VehicleCategory, default: VehicleCategory.ESCOLAR })
  @IsOptional()
  @IsEnum(VehicleCategory)
  categoria?: VehicleCategory;

  @ApiPropertyOptional({ example: "Ar-condicionado, cinto de segurança em todos os bancos." })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string;
}
