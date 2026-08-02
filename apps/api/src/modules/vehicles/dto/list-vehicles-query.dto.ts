import { ApiPropertyOptional } from "@nestjs/swagger";
import { VehicleStatus, VehicleType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

/** Pesquisa/listagem de Veículos (briefing "PESQUISA" — placa/modelo/marca/motorista/status). */
export class ListVehiclesQueryDto {
  @ApiPropertyOptional({ description: "Busca em placa, modelo e marca" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: VehicleStatus })
  @IsOptional()
  @IsEnum(VehicleStatus)
  status?: VehicleStatus;

  @ApiPropertyOptional({ enum: VehicleType })
  @IsOptional()
  @IsEnum(VehicleType)
  tipo?: VehicleType;

  @ApiPropertyOptional({ description: "Filtra pelo motorista atualmente vinculado" })
  @IsOptional()
  @IsUUID()
  motoristaId?: string;

  @ApiPropertyOptional({
    description: "Somente Admin Rotta: filtra a visão cross-tenant por uma empresa específica",
  })
  @IsOptional()
  @IsUUID()
  companyId?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 20, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;

  @ApiPropertyOptional({ enum: ["createdAt", "placa", "modelo", "status"], default: "createdAt" })
  @IsOptional()
  @IsIn(["createdAt", "placa", "modelo", "status"])
  sortBy: "createdAt" | "placa" | "modelo" | "status" = "createdAt";

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder: "asc" | "desc" = "desc";
}
