import { ApiProperty } from "@nestjs/swagger";

/** Dashboard do módulo Escolas (briefing "DASHBOARD"). */
export class SchoolDashboardResponseDto {
  @ApiProperty() totalEscolas!: number;
  @ApiProperty() escolasPublicas!: number;
  @ApiProperty() escolasPrivadas!: number;
  /** Placeholder honesto — módulo de Alunos ainda não existe (ver nota em `School`, schema.prisma). */
  @ApiProperty() alunosVinculados!: number;
  /** Placeholder honesto — módulo de Rotas ainda não existe. */
  @ApiProperty() rotasAtivas!: number;
  @ApiProperty({ type: [String] }) turnosAtendidos!: string[];
}
