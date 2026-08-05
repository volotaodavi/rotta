import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { EventoAgendaTipo } from "@prisma/client";

/** Forma de resposta pública de `EventoAgenda`. */
export class AgendaEventResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty({ enum: EventoAgendaTipo }) tipo!: EventoAgendaTipo;
  @ApiProperty() data!: Date;
  @ApiPropertyOptional() dataFim!: Date | null;
  @ApiProperty() titulo!: string;
  @ApiPropertyOptional() descricao!: string | null;
  @ApiPropertyOptional() entidadeTipo!: string | null;
  @ApiPropertyOptional() entidadeId!: string | null;
  @ApiProperty() geradoAutomaticamente!: boolean;
  @ApiPropertyOptional() criadoPorId!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListAgendaEventsResponseDto {
  @ApiProperty({ type: [AgendaEventResponseDto] }) items!: AgendaEventResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
