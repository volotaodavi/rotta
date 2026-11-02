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

/**
 * Uma semana da serie "a familia foi avisada?".
 *
 * `viagens` e o total que rodou; `comResponsavelNotificado` e quantas
 * delas geraram pelo menos um aviso que chegou a um RESPONSAVEL. A
 * diferenca entre os dois e a promessa do produto que nao se cumpriu
 * naquela semana.
 */
export interface SemanaDeViagensNotificadas {
  /** Segunda-feira da semana, meia-noite UTC — o que `date_trunc('week')` devolve. */
  semana: Date;
  viagens: number;
  comResponsavelNotificado: number;
}

export interface AnalyticsRepository {
  getBusinessSnapshot(): Promise<NationalBusinessSnapshot>;
  getPeriodMetrics(from: Date, to: Date): Promise<NationalPeriodMetrics>;
  listCompanyBiRows(from: Date, to: Date): Promise<CompanyBiRow[]>;
  getOperationalHeatmap(): Promise<HeatmapPoint[]>;
  /**
   * Viagens por semana, e quantas delas avisaram alguma familia.
   *
   * ## Por que esta e a metrica, e nao "notificacoes enviadas"
   *
   * Porque contar notificacao mede o nosso esforco; contar VIAGEM
   * COBERTA mede o que a familia recebeu. Dez mil avisos de uma
   * transportadora grande escondem a transportadora inteira que nao
   * avisou ninguem a semana toda -- e e essa que esta prestes a
   * cancelar, ou a ser cobrada por uma mae que nao soube onde o filho
   * estava.
   *
   * A serie de oito semanas existe pela mesma razao: o numero de uma
   * semana nao diz nada sozinho. O que diz e a linha descendo.
   */
  listViagensNotificadasPorSemana(semanas: number): Promise<SemanaDeViagensNotificadas[]>;
}
