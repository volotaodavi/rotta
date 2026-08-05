import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { EventoAgendaTipo } from "@prisma/client";
import { IsDateString, IsEnum, IsOptional, IsString, IsUUID, MaxLength } from "class-validator";

/**
 * Criação manual de evento de agenda (AGE-01/02/03, tarefa #101).
 * `VENCIMENTO_*`/`TROCA_DE_ROTA_PONTUAL` são rejeitados aqui
 * (`AgendaService`) — são sempre `geradoAutomaticamente`, uma
 * integração cross-módulo ainda não implementada (ver
 * `docs/27-rotta-agenda-calendario.md`), nunca aceitos por criação
 * manual do cliente.
 */
export class CreateAgendaEventDto {
  @ApiProperty({ enum: EventoAgendaTipo })
  @IsEnum(EventoAgendaTipo)
  tipo!: EventoAgendaTipo;

  @ApiProperty({ description: "Data única do evento (ou início, quando dataFim é informado)" })
  @IsDateString()
  data!: string;

  @ApiPropertyOptional({ description: "Fim do período — omitido para um evento de um único dia" })
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @ApiProperty()
  @IsString()
  @MaxLength(200)
  titulo!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descricao?: string;

  @ApiPropertyOptional({
    description: "Rota/veículo/motorista/aluno relacionado, conforme o tipo (AGE-02/03)",
  })
  @IsOptional()
  @IsUUID()
  entidadeId?: string;

  @ApiPropertyOptional({ enum: ["Route", "Vehicle", "User", "Student"] })
  @IsOptional()
  @IsString()
  entidadeTipo?: string;
}
