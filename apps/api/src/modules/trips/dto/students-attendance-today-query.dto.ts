import { ApiProperty } from "@nestjs/swagger";
import { Transform } from "class-transformer";
import { ArrayMaxSize, ArrayMinSize, IsUUID } from "class-validator";

/**
 * Consulta de presença do dia (Frente 5 do fluxo novo de Rotas — "ao
 * reiniciar a rota" pra pegar os alunos NA escola, quem foi marcado
 * `AUSENTE` numa viagem anterior de HOJE não deve aparecer como
 * pendente de embarque). `studentIds` chega como string única
 * separada por vírgula (convenção de query string, mesma ideia de
 * outros filtros de lista da API) — `@Transform` já entrega um array
 * pronto pro `class-validator` validar item a item.
 *
 * `ArrayMaxSize(200)`: nunca uma consulta arbitrariamente grande — bem
 * acima do maior número plausível de alunos numa única rota, mas
 * longe de um valor "sem limite" que vire vetor de abuso.
 */
export class StudentsAttendanceTodayQueryDto {
  @ApiProperty({
    type: String,
    description: "IDs de aluno separados por vírgula",
    example: "9c9b6d1e-...,3a1f2b4c-...",
  })
  @Transform(({ value }: { value: unknown }) =>
    typeof value === "string"
      ? value
          .split(",")
          .map((id) => id.trim())
          .filter((id) => id.length > 0)
      : value,
  )
  @IsUUID("4", { each: true })
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  studentIds!: string[];
}
