import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

/**
 * Substituição PONTUAL do motorista de uma viagem já em andamento hoje
 * (ROT-05, tarefa #102) — grava só em `Trip.motoristaId`, NUNCA em
 * `Route.motoristaPadraoId` (o padrão da rota permanece intacto para os
 * próximos dias). `motivo` é opcional e só entra no log de auditoria
 * (ex. "motorista titular passou mal").
 */
export class SubstituirMotoristaDto {
  @ApiProperty()
  @IsUUID()
  motoristaId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
