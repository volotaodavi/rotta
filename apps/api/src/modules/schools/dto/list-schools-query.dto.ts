import { ApiPropertyOptional } from "@nestjs/swagger";
import { SchoolShift, SchoolStatus, SchoolType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsIn, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

/** Pesquisa/listagem de Escolas (briefing "PESQUISA"/"FILTROS" — nome, código INEP, cidade, estado, rede, tipo, turno). */
export class ListSchoolsQueryDto {
  @ApiPropertyOptional({
    description: "Busca em nome oficial, nome fantasia, código INEP e código interno",
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cidade?: string;

  @ApiPropertyOptional({ example: "SP" })
  @IsOptional()
  @IsString()
  estado?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  redeEnsino?: string;

  @ApiPropertyOptional({ enum: SchoolType })
  @IsOptional()
  @IsEnum(SchoolType)
  tipo?: SchoolType;

  @ApiPropertyOptional({ enum: SchoolShift })
  @IsOptional()
  @IsEnum(SchoolShift)
  turno?: SchoolShift;

  @ApiPropertyOptional({ enum: SchoolStatus })
  @IsOptional()
  @IsEnum(SchoolStatus)
  status?: SchoolStatus;

  @ApiPropertyOptional({
    description: "Somente Admin Rotta: filtra pelas escolas vinculadas a uma empresa específica",
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

  @ApiPropertyOptional({ enum: ["createdAt", "nomeOficial", "cidade"], default: "nomeOficial" })
  @IsOptional()
  @IsIn(["createdAt", "nomeOficial", "cidade"])
  sortBy: "createdAt" | "nomeOficial" | "cidade" = "nomeOficial";

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "asc" })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder: "asc" | "desc" = "asc";
}
