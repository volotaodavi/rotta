import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsDateString, IsOptional, IsString, MaxLength } from "class-validator";

/**
 * Edição de evento de agenda — `tipo`/`entidadeId`/`entidadeTipo` nunca
 * são editáveis (o evento é recriado, não migrado de tipo). Rejeitado
 * pelo `AgendaService` quando `geradoAutomaticamente = true`.
 */
export class UpdateAgendaEventDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  data?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  dataFim?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  titulo?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  descricao?: string;
}
