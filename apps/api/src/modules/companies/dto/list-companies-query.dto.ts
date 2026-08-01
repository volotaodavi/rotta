import { ApiPropertyOptional } from "@nestjs/swagger";
import { CompanyStatus, CompanyType } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

/** Listagem/pesquisa de Empresas (Dossiê 16 — filtros, paginação, ordenação). */
export class ListCompaniesQueryDto {
  @ApiPropertyOptional({ description: "Busca em razão social, nome fantasia, CPF/CNPJ e e-mail" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: CompanyStatus })
  @IsOptional()
  @IsEnum(CompanyStatus)
  status?: CompanyStatus;

  @ApiPropertyOptional({ enum: CompanyType })
  @IsOptional()
  @IsEnum(CompanyType)
  tipo?: CompanyType;

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

  @ApiPropertyOptional({ enum: ["createdAt", "nomeFantasia", "status"], default: "createdAt" })
  @IsOptional()
  @IsIn(["createdAt", "nomeFantasia", "status"])
  sortBy: "createdAt" | "nomeFantasia" | "status" = "createdAt";

  @ApiPropertyOptional({ enum: ["asc", "desc"], default: "desc" })
  @IsOptional()
  @IsIn(["asc", "desc"])
  sortOrder: "asc" | "desc" = "desc";
}
