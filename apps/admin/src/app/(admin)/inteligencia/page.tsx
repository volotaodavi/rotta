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
import { formatarCentavos } from "@rotta/utils";
import { useMemo, useState } from "react";

import { RottaMapLazy as RottaMap } from "@/components/rotta-map-lazy";
import {
  useNationalHeatmap,
  useNationalKpis,
  useViagensNotificadas,
} from "@/features/analytics/hooks/use-analytics";
import { analyticsApi } from "@/lib/api-client";

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
        <StatTile
          label="MRR (assinaturas ativas)"
          value={formatarCentavos(data.negocio.mrrCentavos)}
        />
        <StatTile label="ARR" value={formatarCentavos(data.negocio.arrCentavos)} tone="info" />
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

      <ViagensNotificadasCard />

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

/**
 * "A família foi avisada?" — oito semanas.
 *
 * ## Por que este cartão existe, e por que a linha de baixo importa
 *
 * Porque é a única métrica desta tela que mede a PROMESSA do produto,
 * não o negócio dele. MRR, churn e aprovações pendentes dizem como a
 * Rotta está indo; esta diz se a mãe soube onde o filho estava. Uma
 * semana com mil viagens e trezentas avisadas é uma semana em que a
 * Rotta funcionou como software e falhou como serviço — e nenhum dos
 * outros números desta tela mostraria isso.
 *
 * Cartão próprio (e não um `StatTile` na grade de cima) por duas
 * razões: ele tem seu próprio carregamento, que não pode derrubar o
 * resto da tela; e o número de uma semana sozinho não diz nada — o que
 * diz é a linha descendo, e linha precisa de gráfico.
 */
function ViagensNotificadasCard(): JSX.Element {
  const { data, isLoading, isError, refetch, isFetching } = useViagensNotificadas();

  const ultima = data?.[data.length - 1];

  return (
    <Card>
      <Card.Header title="Viagens com a família avisada" />
      <Card.Body className="flex flex-col gap-4">
        <Typography variant="bodySmall" color="muted">
          Viagens que rodaram contra viagens que geraram ao menos um aviso a um responsável, por
          semana. A diferença entre as duas barras é a promessa que não foi cumprida.
        </Typography>

        {isLoading && <Skeleton variant="rect" height={280} />}

        {isError && (
          <ErrorState
            message="Não foi possível carregar a série de notificação."
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
        )}

        {data && (
          <>
            {ultima && (
              <StatTile
                label={`Cobertura da semana de ${formatDiaCurto(ultima.semana)}`}
                value={formatPercent(ultima.cobertura)}
                /* `tone` pelo valor, nunca fixo: um verde constante faz
                   uma cobertura de 40% parecer notícia boa. */
                tone={coberturaTone(ultima.cobertura)}
              />
            )}
            <TrendBarChart
              data={data.map((semana) => ({
                semana: formatDiaCurto(semana.semana),
                viagens: semana.viagens,
                avisadas: semana.comResponsavelNotificado,
              }))}
              categoryKey="semana"
              series={[
                { key: "viagens", label: "Viagens" },
                { key: "avisadas", label: "Com responsável avisado" },
              ]}
              height={280}
            />
          </>
        )}
      </Card.Body>
    </Card>
  );
}

/**
 * `26/10` — o rótulo de uma semana no eixo X.
 *
 * `T00:00:00` explícito na string: `new Date("2026-10-26")` é
 * interpretado como UTC pelo JS, e no Brasil (UTC-3) isso volta um dia
 * ao formatar. O eixo mostraria 25/10 para a semana que começa em 26.
 */
function formatDiaCurto(dia: string): string {
  return new Date(`${dia}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
  });
}

/**
 * Os limiares da cobertura.
 *
 * 90% não é meta de vaidade: abaixo disso, uma viagem em dez rodou sem
 * a família saber. 70% é onde deixa de ser incidente e passa a ser
 * defeito do produto.
 */
function coberturaTone(cobertura: number): "success" | "warning" | "danger" {
  if (cobertura >= 0.9) return "success";
  if (cobertura >= 0.7) return "warning";
  return "danger";
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
