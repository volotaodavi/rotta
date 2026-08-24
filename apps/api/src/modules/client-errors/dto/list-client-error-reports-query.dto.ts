import { ApiPropertyOptional } from "@nestjs/swagger";
import { ClientApp } from "@prisma/client";
import { Type } from "class-transformer";
import { IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

/** Só Admin Rotta lista (`GET /client-errors`) — painel de diagnóstico cross-tenant, nunca visível pra Empresa/Gestor. */
export class ListClientErrorReportsQueryDto {
  @ApiPropertyOptional({ enum: ClientApp })
  @IsOptional()
  @IsEnum(ClientApp)
  app?: ClientApp;

  /** Filtra por `digest` exato — o caminho mais direto quando já se sabe o digest reportado pelo usuário. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  digest?: string;

  /** Filtra por `buildId` exato — útil pra isolar todas as ocorrências de um bundle específico desatualizado. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  buildId?: string;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize?: number = 20;
}
