import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

/**
 * Onde a criança está no fluxo de hoje, do ponto de vista da escola.
 *
 * `AGUARDANDO` é o estado inicial e o mais importante para o controle
 * de saída: é quem ainda não entrou em nenhum ônibus.
 */
export type StatusDoAlunoNoDia = "AGUARDANDO" | "EMBARCADO" | "DESEMBARCOU" | "AUSENTE";

/**
 * Uma linha do Portal da Escola (22/09/2026) — "ver quais alunos irão
 * nos ônibus e se eles já foram, para maior controle".
 *
 * Tudo aqui é SOMENTE LEITURA. A escola confere e cobra; quem registra
 * embarque e desembarque continua sendo o motorista/monitor dentro do
 * veículo, que é quem de fato vê a criança subir.
 */
export class AlunoDoDiaResponseDto {
  @ApiProperty()
  studentId!: string;

  @ApiProperty()
  nome!: string;

  /** `AAAA-MM-DD` — ajuda a distinguir homônimos, comum em escola grande. */
  @ApiProperty({ example: "2015-03-22" })
  dataNascimento!: string;

  @ApiProperty({ example: "MANHA" })
  turno!: string;

  @ApiProperty({ enum: ["AGUARDANDO", "EMBARCADO", "DESEMBARCOU", "AUSENTE"] })
  status!: StatusDoAlunoNoDia;

  @ApiPropertyOptional({
    description:
      "Quando o último evento do dia aconteceu. `null` enquanto o aluno está AGUARDANDO.",
    nullable: true,
  })
  ocorridoEm!: string | null;

  @ApiPropertyOptional({ nullable: true })
  tripId!: string | null;

  @ApiPropertyOptional({ nullable: true })
  rotaNome!: string | null;

  @ApiPropertyOptional({ example: "IDA", nullable: true })
  sentido!: string | null;

  @ApiPropertyOptional({
    description: "Placa do veículo de hoje — é o que a escola confere no portão.",
    nullable: true,
  })
  veiculoPlaca!: string | null;

  @ApiPropertyOptional({ nullable: true })
  veiculoModelo!: string | null;

  @ApiPropertyOptional({
    description:
      "Transportadora responsável por este aluno hoje. Presente porque a MESMA escola costuma ser atendida por várias — sem ele, não dá para saber a quem cobrar.",
    nullable: true,
  })
  transportadoraNome!: string | null;
}
