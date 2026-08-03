import { ApiPropertyOptional } from "@nestjs/swagger";
import { CompanyType, VehicleType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from "class-validator";

/**
 * Busca de transportadores próximos (briefing "Marketplace" §"MAPA"/
 * "BUSCA"/"FILTROS"). `latitude`/`longitude` sempre vêm do cliente
 * (localização atual do dispositivo OU geocodificação do endereço
 * manual feita no app) — mesma convenção já usada por
 * `Company.latitude`/`School.latitude` (aceitos prontos, nunca
 * recalculados aqui; ver nota em `RottaAiService.analyzeSchoolAddress`).
 */
export class SearchTransportersQueryDto {
  @ApiPropertyOptional({ description: "Latitude do ponto de busca (localização do Responsável)" })
  @Type(() => Number)
  @IsLatitude()
  latitude!: number;

  @ApiPropertyOptional({ description: "Longitude do ponto de busca" })
  @Type(() => Number)
  @IsLongitude()
  longitude!: number;

  @ApiPropertyOptional({ description: "Raio máximo de busca em km", minimum: 1, maximum: 500 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(500)
  raioKm?: number;

  @ApiPropertyOptional({ description: "Mensalidade máxima aceita, em centavos" })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  mensalidadeMaxCentavos?: number;

  @ApiPropertyOptional({ description: "Só transportadores que atendem esta escola" })
  @IsOptional()
  @IsUUID()
  escolaId?: string;

  @ApiPropertyOptional({ enum: VehicleType })
  @IsOptional()
  @IsEnum(VehicleType)
  tipoVeiculo?: VehicleType;

  @ApiPropertyOptional({ enum: CompanyType, description: "Empresa/MEI/Autônomo/..." })
  @IsOptional()
  @IsEnum(CompanyType)
  tipoEmpresa?: CompanyType;

  @ApiPropertyOptional({ minimum: 1, maximum: 5 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(5)
  avaliacaoMin?: number;

  @ApiPropertyOptional({ description: "Somente transportadores com selo Verificado" })
  @IsOptional()
  @Type(() => Boolean)
  @IsBoolean()
  apenasVerificados?: boolean;

  @ApiPropertyOptional({ enum: ["distancia", "avaliacao", "mensalidade"], default: "distancia" })
  @IsOptional()
  @IsIn(["distancia", "avaliacao", "mensalidade"])
  sortBy: "distancia" | "avaliacao" | "mensalidade" = "distancia";

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
