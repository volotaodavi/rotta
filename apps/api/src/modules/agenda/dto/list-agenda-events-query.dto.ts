import { ApiPropertyOptional } from "@nestjs/swagger";
import { EventoAgendaTipo } from "@prisma/client";
import { Type } from "class-transformer";
import { IsDateString, IsEnum, IsInt, IsOptional, Max, Min } from "class-validator";

/** Listagem/filtro de eventos de agenda — visão de calendário por período (Dossiê 8 §14). */
export class ListAgendaEventsQueryDto {
  @ApiPropertyOptional({ enum: EventoAgendaTipo })
  @IsOptional()
  @IsEnum(EventoAgendaTipo)
  tipo?: EventoAgendaTipo;

  @ApiPropertyOptional({ description: "Início do período (inclusivo)" })
  @IsOptional()
  @IsDateString()
  de?: string;

  @ApiPropertyOptional({ description: "Fim do período (inclusivo)" })
  @IsOptional()
  @IsDateString()
  ate?: string;

  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @ApiPropertyOptional({ default: 50, minimum: 1, maximum: 200 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  pageSize: number = 50;
}
