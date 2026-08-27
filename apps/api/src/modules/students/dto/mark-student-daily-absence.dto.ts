import { ApiPropertyOptional } from "@nestjs/swagger";
import { IsOptional, IsString, MaxLength } from "class-validator";

/**
 * "Meu filho não vai hoje" (Epic C, Responsável) — motivo é sempre
 * opcional (mesmo espírito de `CreateTripStudentEventDto.motivoAusencia`:
 * o responsável pode confirmar a ausência sem preencher nada).
 */
export class MarkStudentDailyAbsenceDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
