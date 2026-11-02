import { ApiProperty } from "@nestjs/swagger";

/**
 * Uma semana da série "a família foi avisada?".
 *
 * Existe como DTO próprio (e não como o tipo do repositório devolvido
 * cru) por causa de `semana`: no banco é `timestamp`, e na resposta é
 * uma data ISO de dia — `2026-10-26`, não `2026-10-26T00:00:00.000Z`. O
 * gráfico do Admin rotula um eixo de semanas; hora e fuso ali não são
 * informação, são ruído que o front teria de cortar de novo.
 */
export class SemanaDeViagensNotificadasDto {
  @ApiProperty({
    description: "Segunda-feira da semana (ISO 8601, só a data)",
    example: "2026-10-26",
  })
  semana!: string;

  @ApiProperty({ description: "Viagens que rodaram na semana" })
  viagens!: number;

  @ApiProperty({
    description: "Quantas dessas viagens geraram pelo menos um aviso a um responsável",
  })
  comResponsavelNotificado!: number;

  @ApiProperty({
    description:
      "Cobertura da semana, de 0 a 1 — `comResponsavelNotificado / viagens`. Semana sem viagem nenhuma devolve 0, nunca divisão por zero.",
    example: 0.92,
  })
  cobertura!: number;
}
