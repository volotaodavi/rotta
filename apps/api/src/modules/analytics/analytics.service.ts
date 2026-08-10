import { Inject, Injectable, NotImplementedException } from "@nestjs/common";
import { CompanyStatus } from "@prisma/client";


import {
  companyBiRowsToCsv,
  companyBiRowsToExcelBuffer,
  companyBiRowsToPdfBuffer,
} from "./analytics-export.util";
import { ANALYTICS_REPOSITORY } from "./analytics.constants";

import type { ExportNationalQueryDto } from "./dto/export-national-query.dto";
import type { NationalKpisQueryDto } from "./dto/national-kpis-query.dto";
import type {
  NationalKpisResponseDto,
  NationalPeriodResponseDto,
} from "./dto/national-kpis-response.dto";
import type { AnalyticsRepository, HeatmapPoint } from "./repositories/analytics.repository";

import { BackofficeService } from "@/modules/backoffice/backoffice.service";

const LTV_CAC_INDISPONIVEL =
  "LTV e CAC ainda não são calculados: a Rotta não tem hoje uma fonte de dado de custo de aquisição " +
  "(gasto de marketing/canal) nem um ledger de receita por coorte de cliente — os dois insumos mínimos " +
  "para um cálculo real. Nenhum valor é estimado/inventado aqui (stub honesto, mesmo princípio de " +
  "RottaAiService/AuthentiqueService, Dossiê 30 §5).";

/** Limiares dos alertas automatizados (`ADM-06`, "melhorias futuras") — regras simples sobre os próprios KPIs já calculados, nunca previsão de IA (isso é `GET /analytics/anomalies`, stub honesto). */
const CHURN_RATE_ALERTA = 0.05;
const CHAMADOS_ABERTOS_ALERTA = 10;
const DOCUMENTOS_PENDENTES_ALERTA = 20;

interface Period {
  from: Date;
  to: Date;
}

function resolvePeriod(query: NationalKpisQueryDto): Period {
  const to = query.to ? new Date(query.to) : new Date();
  const from = query.from ? new Date(query.from) : new Date(to.getFullYear(), to.getMonth(), 1);
  return { from, to };
}

function previousPeriod(period: Period): Period {
  const durationMs = period.to.getTime() - period.from.getTime();
  return {
    from: new Date(period.from.getTime() - durationMs),
    to: new Date(period.from.getTime()),
  };
}

/**
 * Núcleo de negócio do Analytics (Prompt 22/Dossiê 30) — "Central de
 * Inteligência Operacional" do Admin Rotta (`ADM-03`/`ADM-06`).
 * `operacional` reusa `BackofficeService.getDashboard()` (nunca
 * reimplementa as mesmas contagens cross-tenant, Dossiê 29); este
 * módulo é exclusivamente a camada de negócio (MRR/ARR), série
 * temporal por período, geografia e a fronteira honesta com o que
 * ainda não existe (LTV/CAC, detecção de anomalias — ver §5/§7 do
 * Dossiê 30).
 */
@Injectable()
export class AnalyticsService {
  constructor(
    @Inject(ANALYTICS_REPOSITORY) private readonly analyticsRepository: AnalyticsRepository,
    private readonly backofficeService: BackofficeService,
  ) {}

  async getNationalKpis(query: NationalKpisQueryDto): Promise<NationalKpisResponseDto> {
    const period = resolvePeriod(query);
    const previous = previousPeriod(period);

    const [operacional, negocioSnapshot, metricasPeriodo, metricasPeriodoAnterior] =
      await Promise.all([
        this.backofficeService.getDashboard(),
        this.analyticsRepository.getBusinessSnapshot(),
        this.analyticsRepository.getPeriodMetrics(period.from, period.to),
        this.analyticsRepository.getPeriodMetrics(previous.from, previous.to),
      ]);

    const churnRateAproximado =
      negocioSnapshot.empresasAtivasPagantes > 0
        ? metricasPeriodo.empresasCanceladas / negocioSnapshot.empresasAtivasPagantes
        : 0;

    const periodo: NationalPeriodResponseDto = {
      de: period.from.toISOString(),
      ate: period.to.toISOString(),
      novasEmpresas: metricasPeriodo.novasEmpresas,
      empresasCanceladas: metricasPeriodo.empresasCanceladas,
      churnRateAproximado,
      viagensRealizadas: metricasPeriodo.viagensRealizadas,
    };

    const churnRateAnteriorAproximado =
      negocioSnapshot.empresasAtivasPagantes > 0
        ? metricasPeriodoAnterior.empresasCanceladas / negocioSnapshot.empresasAtivasPagantes
        : 0;

    const periodoAnterior: NationalPeriodResponseDto = {
      de: previous.from.toISOString(),
      ate: previous.to.toISOString(),
      novasEmpresas: metricasPeriodoAnterior.novasEmpresas,
      empresasCanceladas: metricasPeriodoAnterior.empresasCanceladas,
      churnRateAproximado: churnRateAnteriorAproximado,
      viagensRealizadas: metricasPeriodoAnterior.viagensRealizadas,
    };

    return {
      operacional,
      negocio: {
        mrrCentavos: negocioSnapshot.mrrCentavos,
        arrCentavos: negocioSnapshot.mrrCentavos * 12,
        empresasAtivasPagantes: negocioSnapshot.empresasAtivasPagantes,
        ltvCentavos: null,
        cacCentavos: null,
        indisponibilidadeLtvCac: LTV_CAC_INDISPONIVEL,
      },
      periodo,
      periodoAnterior,
      alertas: this.gerarAlertas(operacional, periodo),
    };
  }

  private gerarAlertas(
    operacional: NationalKpisResponseDto["operacional"],
    periodo: NationalPeriodResponseDto,
  ): string[] {
    const alertas: string[] = [];

    if (periodo.churnRateAproximado > CHURN_RATE_ALERTA) {
      alertas.push(
        `Churn aproximado do período em ${(periodo.churnRateAproximado * 100).toFixed(1)}% — acima do limiar de ${CHURN_RATE_ALERTA * 100}%.`,
      );
    }

    const inadimplentes = operacional.empresasPorStatus[CompanyStatus.INADIMPLENTE] ?? 0;
    if (inadimplentes > 0) {
      alertas.push(`${inadimplentes} empresa(s) inadimplente(s) — ver Financeiro (ADM-03).`);
    }

    if (operacional.chamadosAbertos > CHAMADOS_ABERTOS_ALERTA) {
      alertas.push(
        `${operacional.chamadosAbertos} chamados de suporte abertos — acima do limiar de ${CHAMADOS_ABERTOS_ALERTA}.`,
      );
    }

    const documentosPendentes =
      operacional.documentosMotoristaPendentes + operacional.documentosVeiculoPendentes;
    if (documentosPendentes > DOCUMENTOS_PENDENTES_ALERTA) {
      alertas.push(
        `${documentosPendentes} documentos pendentes de análise (motorista + veículo) — fila de aprovações acumulando.`,
      );
    }

    return alertas;
  }

  getHeatmap(): Promise<HeatmapPoint[]> {
    return this.analyticsRepository.getOperationalHeatmap();
  }

  async exportNational(
    query: ExportNationalQueryDto,
  ): Promise<{ buffer: Buffer; contentType: string; filename: string }> {
    const period = resolvePeriod(query);
    const rows = await this.analyticsRepository.listCompanyBiRows(period.from, period.to);

    if (query.format === "excel") {
      return {
        buffer: await companyBiRowsToExcelBuffer(rows),
        contentType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        filename: "rotta-bi-nacional.xlsx",
      };
    }

    if (query.format === "pdf") {
      return {
        buffer: await companyBiRowsToPdfBuffer(rows),
        contentType: "application/pdf",
        filename: "rotta-bi-nacional.pdf",
      };
    }

    return {
      buffer: Buffer.from(companyBiRowsToCsv(rows), "utf-8"),
      contentType: "text/csv; charset=utf-8",
      filename: "rotta-bi-nacional.csv",
    };
  }

  /**
   * "Analytics AI" (briefing) — detecção de anomalias/forecasting.
   * Stub honesto: a Rotta não tem hoje um provedor de séries temporais/
   * ML integrado (nem volume de histórico suficiente para treinar algo
   * próprio com confiança) — declarar isso explicitamente é melhor do
   * que devolver uma anomalia inventada. Mesmo padrão de
   * `RottaAiService.suggestRouteOptimization`/`AuthentiqueService`
   * (Dossiê 30 §5/§7).
   */
  getAnomalies(): never {
    throw new NotImplementedException(
      "A detecção de anomalias e o forecasting do Analytics AI ainda não estão disponíveis — " +
        "integração pendente de um provedor de séries temporais/ML (ex. Prophet, um serviço de forecasting " +
        "gerenciado) e de um volume histórico mínimo para treinar/calibrar. Os alertas em " +
        "GET /analytics/national/kpis (baseados em regras/limiares) são o que existe de real hoje.",
    );
  }
}
