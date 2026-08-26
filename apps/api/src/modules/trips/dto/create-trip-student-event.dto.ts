import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TripStudentEventType } from "@prisma/client";
import { IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

/**
 * Checklist manual de embarque/desembarque (EMB-01/05 + DESEMB-01/03) —
 * o motorista/monitor marca EMBARCOU/AUSENTE/DESEMBARCOU para um aluno
 * da lista do dia. `routeStopId` NUNCA é enviado pelo cliente: é sempre
 * derivado server-side do `RouteStudent` (parada de embarque para
 * EMBARCOU/AUSENTE, parada de desembarque para DESEMBARCOU) — a tela já
 * sabe qual parada está ativa, então pedir o id de volta só abriria
 * espaço para o cliente mandar uma parada errada.
 */
export class CreateTripStudentEventDto {
  @ApiProperty()
  @IsUUID()
  studentId!: string;

  @ApiProperty({ enum: TripStudentEventType })
  @IsEnum(TripStudentEventType)
  tipo!: TripStudentEventType;

  /**
   * Pedido do usuário: "um formulário simples e opcional (motivo com
   * opções ou comentário, ambos opcionais)" — sempre opcional, mesmo
   * quando tipo = AUSENTE; o motorista/monitor pode confirmar a
   * ausência sem preencher nada.
   */
  @ApiPropertyOptional({ description: "Sempre opcional, mesmo quando tipo = AUSENTE." })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivoAusencia?: string;
}
