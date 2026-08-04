import { ApiPropertyOptional } from "@nestjs/swagger";
import { NotificationEventType } from "@prisma/client";
import { Transform, Type } from "class-transformer";
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Max, Min } from "class-validator";

function toBoolean({ value }: { value: unknown }): boolean | undefined {
  if (value === undefined) return undefined;
  return value === true || value === "true";
}

/** Listagem/busca/filtro da Central de Notificações (briefing "NOTIFICAÇÕES INTERNAS") — sempre escopado ao próprio usuário autenticado. */
export class ListNotificationsQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  arquivada?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  lida?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @Transform(toBoolean)
  @IsBoolean()
  favoritada?: boolean;

  @ApiPropertyOptional({ enum: NotificationEventType })
  @IsOptional()
  @IsEnum(NotificationEventType)
  tipo?: NotificationEventType;

  @ApiPropertyOptional({ description: "Busca por título/corpo" })
  @IsOptional()
  @IsString()
  search?: string;

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
