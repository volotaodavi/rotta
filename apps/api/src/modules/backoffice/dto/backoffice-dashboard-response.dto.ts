import { ApiProperty } from "@nestjs/swagger";
import { CompanyStatus } from "@prisma/client";

/**
 * "Tela inicial" do Admin Rotta (Dossiê 11 §6.1 — "KPIs de saúde da
 * plataforma... atalhos para Chamados de suporte abertos e Alertas").
 * Todos os números são reais (nenhum placeholder em zero) — cada campo
 * lê diretamente do módulo de domínio correspondente (Dossiê 29).
 */
export class BackofficeDashboardResponseDto {
  @ApiProperty({ description: "Contagem de empresas por CompanyStatus" })
  empresasPorStatus!: Record<CompanyStatus, number>;

  @ApiProperty() empresasTotal!: number;
  @ApiProperty() motoristasAtivos!: number;
  @ApiProperty() monitoresAtivos!: number;
  @ApiProperty() veiculosTotal!: number;
  @ApiProperty() alunosTotal!: number;
  @ApiProperty() viagensHoje!: number;
  @ApiProperty() chamadosAbertos!: number;
  @ApiProperty() documentosMotoristaPendentes!: number;
  @ApiProperty() documentosVeiculoPendentes!: number;
  @ApiProperty() contratosAguardandoAssinatura!: number;
  @ApiProperty({ description: 'Soma dos 3 tipos de pendência — atalho "Central de Aprovações"' })
  aprovacoesPendentesTotal!: number;
}
