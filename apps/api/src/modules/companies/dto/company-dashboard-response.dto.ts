import { ApiProperty } from "@nestjs/swagger";

/**
 * Dashboard da Empresa (Dossiê 16 — "quantidade de motoristas/alunos/
 * responsáveis/veículos/rotas/viagens, receita estimada, alertas,
 * documentos vencendo, mapa resumido").
 *
 * Alguns números já são reais hoje (`motoristas`/`responsaveis`, contados
 * a partir de `Membership.role` — o único dado que já existe no schema
 * atual para essas duas contagens) e `receitaEstimadaCentavos` (preço do
 * plano ativo da própria empresa). Os demais (`alunos`, `veiculos`,
 * `rotas`, `viagens`, `documentosVencendo`) dependem de módulos ainda
 * não implementados (Dossiê 13: Students, Vehicles, Routes, Trips,
 * Documents) — retornam `0` explicitamente, nunca um número inventado,
 * e serão religados assim que cada módulo existir.
 */
export class CompanyDashboardResponseDto {
  @ApiProperty() motoristas!: number;
  @ApiProperty() responsaveis!: number;
  @ApiProperty({ description: "0 até o módulo Students (Dossiê 13) existir" }) alunos!: number;
  @ApiProperty({ description: "0 até o módulo Vehicles (Dossiê 13) existir" }) veiculos!: number;
  @ApiProperty({ description: "0 até o módulo Routes (Dossiê 13) existir" }) rotas!: number;
  @ApiProperty({ description: "0 até o módulo Trips (Dossiê 13) existir" }) viagens!: number;
  @ApiProperty() receitaEstimadaCentavos!: number;
  @ApiProperty({ description: "0 até o módulo Documents (Dossiê 13) existir" })
  documentosVencendo!: number;
  @ApiProperty({
    type: [String],
    description: "Vazio até haver uma fonte real de alertas operacionais",
  })
  alertas!: string[];
}
