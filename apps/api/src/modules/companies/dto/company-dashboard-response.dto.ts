import { ApiProperty } from "@nestjs/swagger";

/**
 * Dashboard da Empresa (Dossiê 16 — "quantidade de motoristas/alunos/
 * responsáveis/veículos/rotas/viagens, receita estimada, alertas,
 * documentos vencendo, mapa resumido"; `DASH-01` a `DASH-07`, Dossiê 19).
 *
 * Completo desde o Prompt 22 (Dossiê 30 §3.1) — todo campo é real hoje.
 * `alunos`/`rotas`/`viagens`/`documentosVencendo`/`alertas` ficaram
 * hardcoded em `0`/`[]` até esta fase, honestamente, porque os módulos
 * que os alimentam (Routes, Trips, Marketplace/Contract, Documents)
 * ainda não existiam quando este DTO foi criado (Dossiê 13/16) — nunca
 * um número inventado nesse meio tempo.
 */
export class CompanyDashboardResponseDto {
  @ApiProperty() motoristas!: number;
  @ApiProperty() responsaveis!: number;
  @ApiProperty({ description: "Alunos com ao menos um Contract ATIVO com esta empresa" })
  alunos!: number;
  @ApiProperty() veiculos!: number;
  @ApiProperty({ description: "Total de rotas cadastradas (não deletadas)" }) rotas!: number;
  @ApiProperty({ description: "Viagens de hoje (todos os status)" }) viagens!: number;
  @ApiProperty({
    description:
      'Soma de Contract.valorMensalidadeCentavos dos contratos ATIVO — sempre "estimada" (RN-34), nunca receita reconhecida. Corrigido no Prompt 22: antes lia o preço da assinatura da própria empresa com a Rotta (Plan.priceCents), que não é a receita do transporte escolar.',
  })
  receitaEstimadaCentavos!: number;
  @ApiProperty({ description: "Documentos de motorista + veículo vencendo nos próximos 7 dias" })
  documentosVencendo!: number;
  @ApiProperty({
    type: [String],
    description: "Alertas baseados em regras (chamados abertos, documentos vencendo)",
  })
  alertas!: string[];
}
