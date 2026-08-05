import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

/**
 * Substituição PONTUAL do monitor de uma viagem já em andamento hoje
 * (tarefa #102) — grava só em `Trip.monitorId`, NUNCA em
 * `Route.monitorPadraoId`. `monitorId: null` (ou omitido) remove o
 * monitor apenas desta viagem — a rota pode não ter monitor obrigatório
 * (mesma regra de `TripsService.start`).
 */
export class SubstituirMonitorDto {
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsUUID()
  monitorId?: string | null;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
