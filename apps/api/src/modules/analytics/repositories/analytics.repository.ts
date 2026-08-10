/**
 * Leitura agregada nacional cross-tenant para a Central de Inteligência
 * Operacional (Prompt 22/Dossiê 30, `ADM-03`/`ADM-06`). Sempre
 * `withBypass` (Admin Rotta) — nunca reimplementa as contagens
 * operacionais já expostas por `BackofficeRepository` (Dossiê 29);
 * este repositório cobre exclusivamente o que o Backoffice não cobre:
 * negócio (MRR/ARR), séries temporais por período e geografia.
 */

export interface NationalBusinessSnapshot {
  /** Soma de `Plan.priceCents` de toda `Company` com `status = ATIVO` — assinatura da plataforma, nunca Rotta Pay (Dossiê 28 §6.7). */
  mrrCentavos: number;
  empresasAtivasPagantes: number;
}

export interface NationalPeriodMetrics {
  novasEmpresas: number;
  /**
   * Empresas cujo `status` atual é `CANCELADO` e cuja última
   * atualização (`updatedAt`) caiu dentro da janela — aproximação
   * honesta (ver Dossiê 30 §5): o schema guarda o ESTADO atual da
   * empresa, não um histórico de transições; uma empresa que
   * cancelou e foi reativada mais de uma vez na mesma janela conta
   * só a última transição.
   */
  empresasCanceladas: number;
  viagensRealizadas: number;
}

export interface CompanyBiRow {
  companyId: string;
  nomeFantasia: string;
  status: string;
  planoNome: string;
  mensalidadeCentavos: number;
  motoristasAtivos: number;
  veiculosTotal: number;
  contratosAtivos: number;
  viagensNoPeriodo: number;
}

export interface HeatmapPoint {
  latitude: number;
  longitude: number;
  /** Quantidade de paradas de rota ATIVA nesta célula de grade (~1,1km, 2 casas decimais) — densidade operacional, não tráfego ao vivo (Dossiê 30 §4). */
  peso: number;
}

export interface AnalyticsRepository {
  getBusinessSnapshot(): Promise<NationalBusinessSnapshot>;
  getPeriodMetrics(from: Date, to: Date): Promise<NationalPeriodMetrics>;
  listCompanyBiRows(from: Date, to: Date): Promise<CompanyBiRow[]>;
  getOperationalHeatmap(): Promise<HeatmapPoint[]>;
}
