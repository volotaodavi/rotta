import { ApiProperty } from "@nestjs/swagger";

import { BackofficeDashboardResponseDto } from "@/modules/backoffice/dto/backoffice-dashboard-response.dto";

/**
 * `ADM-03`: MRR/ARR reais (soma de `Plan.priceCents` das empresas
 * `ATIVO`). LTV/CAC são deliberadamente `null` — a Rotta não tem hoje
 * nenhuma fonte de dado de custo de aquisição (gasto de marketing) nem
 * um ledger de receita por coorte que permita calcular um LTV real;
 * inventar um número aqui seria o oposto do "stub honesto" já praticado
 * em `RottaAiService`/`AuthentiqueService` (Dossiê 30 §5).
 */
export class NationalBusinessResponseDto {
  @ApiProperty() mrrCentavos!: number;
  @ApiProperty() arrCentavos!: number;
  @ApiProperty() empresasAtivasPagantes!: number;
  @ApiProperty({
    nullable: true,
    description: "Sempre null nesta fase — ver indisponibilidadeLtvCac",
  })
  ltvCentavos!: number | null;
  @ApiProperty({
    nullable: true,
    description: "Sempre null nesta fase — ver indisponibilidadeLtvCac",
  })
  cacCentavos!: number | null;
  @ApiProperty() indisponibilidadeLtvCac!: string;
}

export class NationalPeriodResponseDto {
  @ApiProperty() de!: string;
  @ApiProperty() ate!: string;
  @ApiProperty() novasEmpresas!: number;
  @ApiProperty() empresasCanceladas!: number;
  @ApiProperty({
    description:
      "Aproximação: empresasCanceladas do período / empresasAtivasPagantes ATUAL (não há snapshot histórico do total ativo no início do período — Dossiê 30 §5).",
  })
  churnRateAproximado!: number;
  @ApiProperty() viagensRealizadas!: number;
}

/**
 * `GET /analytics/national/kpis` — Central de Inteligência Operacional
 * (Prompt 22/Dossiê 30). `operacional` reusa `BackofficeService.getDashboard()`
 * (nunca recalcula as mesmas contagens); os demais campos são
 * exclusivos deste módulo (negócio, período, comparação, alertas).
 */
export class NationalKpisResponseDto {
  @ApiProperty({ type: BackofficeDashboardResponseDto })
  operacional!: BackofficeDashboardResponseDto;
  @ApiProperty({ type: NationalBusinessResponseDto }) negocio!: NationalBusinessResponseDto;
  @ApiProperty({ type: NationalPeriodResponseDto }) periodo!: NationalPeriodResponseDto;
  @ApiProperty({
    type: NationalPeriodResponseDto,
    description: "Janela imediatamente anterior, de mesmo tamanho — comparação de períodos",
  })
  periodoAnterior!: NationalPeriodResponseDto;
  @ApiProperty({
    type: [String],
    description:
      "Alertas baseados em regras (limiares), nunca em previsão de IA — ver GET /analytics/anomalies",
  })
  alertas!: string[];
}
