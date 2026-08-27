import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * "Meu filho não vai hoje" (Epic C, Responsável) — resposta de
 * `POST/DELETE .../ausencia-hoje`. Sempre o dia corrente (servidor,
 * UTC) — não existe marcar ausência de um dia futuro/passado nesta
 * tela (mesmo espírito do "hoje" de `TripsService`).
 */
export class StudentDailyAbsenceResponseDto {
  @ApiProperty()
  studentId!: string;

  /** "YYYY-MM-DD" — sempre o dia corrente no momento da chamada. */
  @ApiProperty()
  data!: string;

  @ApiPropertyOptional()
  motivo!: string | null;
}
