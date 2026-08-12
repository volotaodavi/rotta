import { ApiPropertyOptional } from "@nestjs/swagger";
import { IdentityVerificationStatus } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

/** Listagem/pesquisa das verificações de identidade (Admin Rotta → Verificação de Identidade) — mesmo padrão de paginação de `ListCompaniesQueryDto`. */
export class ListIdentityVerificationsQueryDto {
  @ApiPropertyOptional({ description: "Busca em nome, e-mail e CPF" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ enum: IdentityVerificationStatus })
  @IsOptional()
  @IsEnum(IdentityVerificationStatus)
  status?: IdentityVerificationStatus;

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
