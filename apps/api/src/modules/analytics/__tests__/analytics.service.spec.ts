import { AnalyticsService } from "../analytics.service";

import type { NationalKpisResponseDto } from "../dto/national-kpis-response.dto";
import type { AnalyticsRepository } from "../repositories/analytics.repository";
import type { BackofficeService } from "@/modules/backoffice/backoffice.service";
import type { BackofficeDashboardResponseDto } from "@/modules/backoffice/dto/backoffice-dashboard-response.dto";

function buildOperacional(
  overrides: Partial<BackofficeDashboardResponseDto> = {},
): BackofficeDashboardResponseDto {
  return {
    empresasPorStatus: { TRIAL: 2, ATIVO: 10, SUSPENSO: 1, CANCELADO: 0, INADIMPLENTE: 0 },
    empresasTotal: 13,
    motoristasAtivos: 30,
    monitoresAtivos: 12,
    veiculosTotal: 25,
    alunosTotal: 200,
    viagensHoje: 40,
    chamadosAbertos: 3,
    documentosMotoristaPendentes: 5,
    documentosVeiculoPendentes: 2,
    contratosAguardandoAssinatura: 4,
    aprovacoesPendentesTotal: 11,
    ...overrides,
  };
}

describe("AnalyticsService", () => {
  let analyticsRepository: jest.Mocked<AnalyticsRepository>;
  let backofficeService: jest.Mocked<BackofficeService>;
  let service: AnalyticsService;

  beforeEach(() => {
    analyticsRepository = {
      getBusinessSnapshot: jest.fn(),
      getPeriodMetrics: jest.fn(),
      listCompanyBiRows: jest.fn(),
      getOperationalHeatmap: jest.fn(),
    };
    backofficeService = { getDashboard: jest.fn() } as unknown as jest.Mocked<BackofficeService>;

    service = new AnalyticsService(analyticsRepository, backofficeService);
  });

  describe("getNationalKpis", () => {
    it("calcula MRR/ARR reais a partir do snapshot de negócio", async () => {
      backofficeService.getDashboard.mockResolvedValue(buildOperacional());
      analyticsRepository.getBusinessSnapshot.mockResolvedValue({
        mrrCentavos: 500_000,
        empresasAtivasPagantes: 10,
      });
      analyticsRepository.getPeriodMetrics.mockResolvedValue({
        novasEmpresas: 2,
        empresasCanceladas: 0,
        viagensRealizadas: 100,
      });

      const result = await service.getNationalKpis({});

      expect(result.negocio.mrrCentavos).toBe(500_000);
      expect(result.negocio.arrCentavos).toBe(500_000 * 12);
      expect(result.negocio.ltvCentavos).toBeNull();
      expect(result.negocio.cacCentavos).toBeNull();
      expect(result.negocio.indisponibilidadeLtvCac).toMatch(/LTV e CAC/);
    });

    it("nunca inventa LTV/CAC — sempre null com motivo explicado, mesmo com dados de negócio disponíveis", async () => {
      backofficeService.getDashboard.mockResolvedValue(buildOperacional());
      analyticsRepository.getBusinessSnapshot.mockResolvedValue({
        mrrCentavos: 1_000_000,
        empresasAtivasPagantes: 50,
      });
      analyticsRepository.getPeriodMetrics.mockResolvedValue({
        novasEmpresas: 0,
        empresasCanceladas: 0,
        viagensRealizadas: 0,
      });

      const result = await service.getNationalKpis({});

      expect(result.negocio.ltvCentavos).toBeNull();
      expect(result.negocio.cacCentavos).toBeNull();
    });

    it("calcula churnRateAproximado como canceladas do período / ativas pagantes atuais", async () => {
      backofficeService.getDashboard.mockResolvedValue(buildOperacional());
      analyticsRepository.getBusinessSnapshot.mockResolvedValue({
        mrrCentavos: 100_000,
        empresasAtivasPagantes: 20,
      });
      analyticsRepository.getPeriodMetrics.mockResolvedValue({
        novasEmpresas: 1,
        empresasCanceladas: 2,
        viagensRealizadas: 10,
      });

      const result = await service.getNationalKpis({ from: "2026-08-01", to: "2026-08-07" });

      expect(result.periodo.churnRateAproximado).toBeCloseTo(2 / 20);
      expect(result.periodo.novasEmpresas).toBe(1);
      expect(result.periodo.viagensRealizadas).toBe(10);
    });

    it("busca o período anterior de mesma duração para a comparação", async () => {
      backofficeService.getDashboard.mockResolvedValue(buildOperacional());
      analyticsRepository.getBusinessSnapshot.mockResolvedValue({
        mrrCentavos: 0,
        empresasAtivasPagantes: 0,
      });
      analyticsRepository.getPeriodMetrics.mockResolvedValue({
        novasEmpresas: 0,
        empresasCanceladas: 0,
        viagensRealizadas: 0,
      });

      await service.getNationalKpis({
        from: "2026-08-01T00:00:00.000Z",
        to: "2026-08-08T00:00:00.000Z",
      });

      expect(analyticsRepository.getPeriodMetrics).toHaveBeenCalledTimes(2);
      const previousCall = analyticsRepository.getPeriodMetrics.mock.calls[1];
      expect(previousCall).toBeDefined();
      const [previousFrom, previousTo] = previousCall!;
      expect(previousFrom.toISOString()).toBe("2026-07-25T00:00:00.000Z");
      expect(previousTo.toISOString()).toBe("2026-08-01T00:00:00.000Z");
    });

    it("gera um alerta quando o churn aproximado ultrapassa 5%", async () => {
      backofficeService.getDashboard.mockResolvedValue(buildOperacional());
      analyticsRepository.getBusinessSnapshot.mockResolvedValue({
        mrrCentavos: 0,
        empresasAtivasPagantes: 10,
      });
      analyticsRepository.getPeriodMetrics.mockResolvedValue({
        novasEmpresas: 0,
        empresasCanceladas: 1,
        viagensRealizadas: 0,
      });

      const result = await service.getNationalKpis({});

      expect(result.alertas.some((alerta) => alerta.includes("Churn"))).toBe(true);
    });

    it("gera um alerta quando há empresas inadimplentes", async () => {
      backofficeService.getDashboard.mockResolvedValue(
        buildOperacional({
          empresasPorStatus: { TRIAL: 0, ATIVO: 5, SUSPENSO: 0, CANCELADO: 0, INADIMPLENTE: 3 },
        }),
      );
      analyticsRepository.getBusinessSnapshot.mockResolvedValue({
        mrrCentavos: 0,
        empresasAtivasPagantes: 5,
      });
      analyticsRepository.getPeriodMetrics.mockResolvedValue({
        novasEmpresas: 0,
        empresasCanceladas: 0,
        viagensRealizadas: 0,
      });

      const result = await service.getNationalKpis({});

      expect(result.alertas.some((alerta) => alerta.includes("inadimplente"))).toBe(true);
    });

    it("não gera alertas quando todos os indicadores estão dentro dos limiares", async () => {
      backofficeService.getDashboard.mockResolvedValue(buildOperacional({ chamadosAbertos: 1 }));
      analyticsRepository.getBusinessSnapshot.mockResolvedValue({
        mrrCentavos: 100_000,
        empresasAtivasPagantes: 100,
      });
      analyticsRepository.getPeriodMetrics.mockResolvedValue({
        novasEmpresas: 3,
        empresasCanceladas: 0,
        viagensRealizadas: 500,
      });

      const result: NationalKpisResponseDto = await service.getNationalKpis({});

      expect(result.alertas).toEqual([]);
    });
  });

  describe("getHeatmap", () => {
    it("delega ao repositório", async () => {
      analyticsRepository.getOperationalHeatmap.mockResolvedValue([
        { latitude: -23.55, longitude: -46.63, peso: 5 },
      ]);

      const result = await service.getHeatmap();

      expect(result).toHaveLength(1);
      expect(analyticsRepository.getOperationalHeatmap).toHaveBeenCalled();
    });
  });

  describe("exportNational", () => {
    it("exporta em CSV por padrão", async () => {
      analyticsRepository.listCompanyBiRows.mockResolvedValue([
        {
          companyId: "c1",
          nomeFantasia: "Transportes Silva",
          status: "ATIVO",
          planoNome: "Rotta Essencial",
          mensalidadeCentavos: 3990,
          motoristasAtivos: 2,
          veiculosTotal: 3,
          contratosAtivos: 20,
          viagensNoPeriodo: 40,
        },
      ]);

      const result = await service.exportNational({ format: "csv" });

      expect(result.contentType).toContain("text/csv");
      expect(result.filename).toBe("rotta-bi-nacional.csv");
      expect(result.buffer.toString("utf-8")).toContain("Transportes Silva");
    });

    it("exporta em Excel quando solicitado", async () => {
      analyticsRepository.listCompanyBiRows.mockResolvedValue([]);

      const result = await service.exportNational({ format: "excel" });

      expect(result.contentType).toContain("spreadsheetml");
      expect(result.filename).toBe("rotta-bi-nacional.xlsx");
    });
  });

  describe("getAnomalies", () => {
    it("é um stub honesto — sempre lança NotImplementedException, nunca inventa uma anomalia", () => {
      expect(() => service.getAnomalies()).toThrow(
        /detecção de anomalias e o forecasting do Analytics AI ainda não estão disponíveis/,
      );
    });
  });
});
