import { ApiPropertyOptional } from "@nestjs/swagger";
import { RouteStatus, SchoolShift } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Max, Min } from "class-validator";

/** Listagem/pesquisa de Rotas (ROT-04). */
export class ListRoutesQueryDto {
  @ApiPropertyOptional({ description: "Busca pelo nome da rota" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: RouteStatus })
  @IsOptional()
  @IsEnum(RouteStatus)
  status?: RouteStatus;

  @ApiPropertyOptional({ enum: SchoolShift })
  @IsOptional()
  @IsEnum(SchoolShift)
  turno?: SchoolShift;

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
}
