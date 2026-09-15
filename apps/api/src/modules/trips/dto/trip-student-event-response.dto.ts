import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { TripStudentEventType } from "@prisma/client";

/** Forma de resposta pública de `TripStudentEvent` (EMB-01/05 + DESEMB-01/03). */
export class TripStudentEventResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() tripId!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() routeStopId!: string;
  /**
   * Endereço da parada onde o evento aconteceu (pedido do usuário
   * 15/09/2026: "a linha de localização aparecerá para os
   * transportadores e para os responsáveis").
   *
   * Vem do JOIN com `RouteStop` — nunca deduzido do tipo do evento.
   * Deduzir erraria justamente na volta, onde o EMBARQUE acontece na
   * escola e o DESEMBARQUE em casa. `null` só quando a parada foi
   * removida da rota depois do evento (a relação é `Restrict`, então na
   * prática não acontece — mas a tela não pode inventar um endereço se
   * acontecer).
   */
  @ApiPropertyOptional() local?: string | null;
  /** `true` quando a parada é uma escola do catálogo — deixa a tela mostrar o ícone certo sem adivinhar pelo texto do endereço. */
  @ApiPropertyOptional() localEhEscola?: boolean;
  @ApiProperty({ enum: TripStudentEventType }) tipo!: TripStudentEventType;
  @ApiPropertyOptional() motivoAusencia?: string | null;
  @ApiProperty() processadoPorId!: string;
  @ApiProperty() processadoEm!: Date;
}
