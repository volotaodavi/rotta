"use client";

import {
  AlertTriangle,
  Car,
  ClipboardCheck,
  GraduationCap,
  MessageCircle,
  Route as RouteIcon,
  ShieldCheck,
  Users,
} from "@rotta/icons";
import { type HeatmapPoint } from "@rotta/maps/types";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Skeleton,
  StatTile,
  TrendBarChart,
  Typography,
} from "@rotta/ui/web";
import { useMemo, useState } from "react";

import { RottaMapLazy as RottaMap } from "@/components/rotta-map-lazy";
import { useNationalHeatmap, useNationalKpis } from "@/features/analytics/hooks/use-analytics";
import { analyticsApi } from "@/lib/api-client";

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function formatPercent(rate: number): string {
  return `${(rate * 100).toFixed(1)}%`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR");
}

/**
 * Central de Inteligência Operacional (Prompt 22/Dossiê 30) — dashboard
 * nacional do Admin Rotta: KPIs operacionais (reusados de
 * `GET /backoffice/dashboard`) + negócio (MRR/ARR reais) + comparação
 * de períodos + alertas automatizados (regras) + heatmap OSM de
 * densidade operacional + exportação CSV/Excel/PDF.
 */
export default function InteligenciaPage(): JSX.Element {
  const [exporting, setExporting] = useState<"csv" | "excel" | "pdf" | null>(null);
  const { data, isLoading, isError, refetch, isFetching } = useNationalKpis();
  const { data: heatmap } = useNationalHeatmap();

  const heatmapPoints = useMemo<HeatmapPoint[]>(
    () => (heatmap ?? []).map((point) => ({ ...point })),
    [heatmap],
  );

  async function handleExport(format: "csv" | "excel" | "pdf"): Promise<void> {
    setExporting(format);
    try {
      const blob = await analyticsApi.exportNational({ format });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `rotta-bi-nacional.${format === "excel" ? "xlsx" : format}`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
    }
  }

  if (isLoading) {
    return <InteligenciaSkeleton />;
  }

  if (isError || !data) {
    return (
      <Card>
        <Card.Body>
          <ErrorState
            message="Não foi possível carregar a Central de Inteligência."
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <Typography variant="title">Central de Inteligência Operacional</Typography>
          <Typography variant="bodySmall" color="muted">
            Período: {formatDate(data.periodo.de)} a {formatDate(data.periodo.ate)}
          </Typography>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            isLoading={exporting === "csv"}
            onClick={() => void handleExport("csv")}
          >
            Exportar CSV
          </Button>
          <Button
            variant="ghost"
            size="sm"
            isLoading={exporting === "excel"}
            onClick={() => void handleExport("excel")}
          >
            Exportar Excel
          </Button>
          <Button
            variant="ghost"
            size="sm"
            isLoading={exporting === "pdf"}
            onClick={() => void handleExport("pdf")}
          >
            Exportar PDF
          </Button>
        </div>
      </div>

      {data.alertas.length > 0 && (
        <Card className="border-warning/40 bg-warning/5">
          <Card.Header title="Alertas automatizados" />
          <Card.Body className="flex flex-col gap-2">
            {data.alertas.map((alerta) => (
              <Typography key={alerta} variant="bodySmall" className="flex items-center gap-2">
                <AlertTriangle size={16} className="shrink-0 text-warning" />
                {alerta}
              </Typography>
            ))}
          </Card.Body>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile label="MRR (assinaturas ativas)" value={centsToBRL(data.negocio.mrrCentavos)} />
        <StatTile label="ARR" value={centsToBRL(data.negocio.arrCentavos)} tone="info" />
        <StatTile
          label="Empresas ativas pagantes"
          value={data.negocio.empresasAtivasPagantes}
          icon={Users}
          tone="success"
        />
        <StatTile
          label="Churn aproximado (período)"
          value={formatPercent(data.periodo.churnRateAproximado)}
          tone="warning"
        />
      </div>

      <Card>
        <Card.Header title="LTV / CAC" />
        <Card.Body className="flex flex-col gap-2">
          <Typography variant="bodySmall" color="muted">
            {data.negocio.indisponibilidadeLtvCac}
          </Typography>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header title="Período atual vs. anterior" />
        <Card.Body>
          <TrendBarChart
            data={[
              {
                categoria: "Novas empresas",
                atual: data.periodo.novasEmpresas,
                anterior: data.periodoAnterior.novasEmpresas,
              },
              {
                categoria: "Empresas canceladas",
                atual: data.periodo.empresasCanceladas,
                anterior: data.periodoAnterior.empresasCanceladas,
              },
              {
                categoria: "Viagens realizadas",
                atual: data.periodo.viagensRealizadas,
                anterior: data.periodoAnterior.viagensRealizadas,
              },
            ]}
            categoryKey="categoria"
            series={[
              { key: "atual", label: "Atual" },
              { key: "anterior", label: "Anterior", color: "rgb(var(--color-secondary) / 0.5)" },
            ]}
            height={280}
          />
        </Card.Body>
      </Card>

      <Card>
        <Card.Header title="Operação nacional (hoje)" />
        <Card.Body className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatTile
            label="Motoristas ativos"
            value={data.operacional.motoristasAtivos}
            icon={Users}
          />
          <StatTile
            label="Monitores ativos"
            value={data.operacional.monitoresAtivos}
            icon={ShieldCheck}
          />
          <StatTile label="Veículos" value={data.operacional.veiculosTotal} icon={Car} />
          <StatTile label="Alunos" value={data.operacional.alunosTotal} icon={GraduationCap} />
          <StatTile label="Viagens hoje" value={data.operacional.viagensHoje} icon={RouteIcon} />
          <StatTile
            label="Aprovações pendentes"
            value={data.operacional.aprovacoesPendentesTotal}
            icon={ClipboardCheck}
            tone={data.operacional.aprovacoesPendentesTotal > 0 ? "warning" : "primary"}
          />
          <StatTile
            label="Chamados abertos"
            value={data.operacional.chamadosAbertos}
            icon={MessageCircle}
            tone={data.operacional.chamadosAbertos > 0 ? "warning" : "primary"}
          />
        </Card.Body>
      </Card>

      <Card>
        <Card.Header title="Empresas por status" />
        <Card.Body className="flex flex-wrap gap-3">
          {Object.entries(data.operacional.empresasPorStatus).map(([status, count]) => (
            <Badge key={status} variant={status === "ATIVO" ? "success" : "neutral"}>
              {status} · {count}
            </Badge>
          ))}
        </Card.Body>
      </Card>

      <Card>
        <Card.Header title="Heatmap operacional nacional" />
        <Card.Body className="flex flex-col gap-3">
          <Typography variant="bodySmall" color="muted">
            Densidade de paradas de rotas ativas, agregadas em grade (OpenStreetMap, MapLibre).
          </Typography>
          <div style={{ height: 480 }}>
            <RottaMap markers={[]} heatmapPoints={heatmapPoints} initialZoom={4} />
          </div>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header title="Detecção de anomalias (Analytics AI)" />
        <Card.Body>
          <Typography variant="bodySmall" color="muted">
            Ainda não disponível: integração pendente de um provedor de séries temporais/ML e de
            volume histórico suficiente para calibrar. Os alertas acima (baseados em
            regras/limiares) são o que existe de real hoje. Ver GET /analytics/anomalies.
          </Typography>
        </Card.Body>
      </Card>
    </div>
  );
}

/** Esqueleto do carregamento inicial — mesmo grid da tela de verdade, mesma disciplina da Home (pedido do usuário 02/09/2026: "trazer mais modernidade"). */
function InteligenciaSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton variant="text" width={260} height={24} />
        <Skeleton variant="text" width={180} height={14} />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} variant="rect" height={96} />
        ))}
      </div>
      <Card>
        <Card.Body>
          <Skeleton variant="rect" height={280} />
        </Card.Body>
      </Card>
    </div>
  );
}
