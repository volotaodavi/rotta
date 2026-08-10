import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional } from "class-validator";

/** Janela de período para `GET /analytics/national/kpis` — omitida, o padrão é o mês corrente até hoje (`AnalyticsService.resolvePeriod`). */
export class NationalKpisQueryDto {
  @ApiPropertyOptional({
    description: "Início do período (ISO 8601) — padrão: dia 1 do mês corrente",
  })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ description: "Fim do período (ISO 8601, exclusivo) — padrão: agora" })
  @IsOptional()
  @IsDateString()
  to?: string;
}
