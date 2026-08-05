import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

/**
 * Substituição PONTUAL do veículo de uma viagem já em andamento hoje
 * (ROT-06/RN-CAP-01, tarefa #102) — grava só em `Trip.veiculoId`, NUNCA
 * em `Route.veiculoPadraoId`. Passa pela mesma checagem de capacidade
 * (`RoutesService.assertVeiculoCapacidade`) que a substituição
 * permanente usa.
 */
export class SubstituirVeiculoDto {
  @ApiProperty()
  @IsUUID()
  veiculoId!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
