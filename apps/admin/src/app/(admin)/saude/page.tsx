"use client";

import { AlertTriangle, CheckCircle2, Database, HelpCircle, Server, XCircle } from "@rotta/icons";
import {
  Badge,
  Card,
  ErrorState,
  ProgressRing,
  Skeleton,
  StatTile,
  Typography,
} from "@rotta/ui/web";

import type { IntegrationHealthSnapshot, IntegrationStatusLevel } from "@rotta/api-client";

import { useIntegrationsHealth } from "@/features/health/hooks/use-integrations-health";

const STATUS_LABEL: Record<IntegrationStatusLevel, string> = {
  healthy: "Saudável",
  degraded: "Degradada",
  down: "Fora do ar",
  not_configured: "Não configurada",
  unknown: "Sem chamadas ainda",
};

const STATUS_BADGE: Record<IntegrationStatusLevel, "success" | "warning" | "danger" | "neutral"> = {
  healthy: "success",
  degraded: "warning",
  down: "danger",
  not_configured: "neutral",
  unknown: "neutral",
};

const STATUS_ICON: Record<IntegrationStatusLevel, typeof CheckCircle2> = {
  healthy: CheckCircle2,
  degraded: AlertTriangle,
  down: XCircle,
  not_configured: HelpCircle,
  unknown: HelpCircle,
};

const STATUS_TONE: Record<IntegrationStatusLevel, "success" | "warning" | "danger" | "info"> = {
  healthy: "success",
  degraded: "warning",
  down: "danger",
  not_configured: "info",
  unknown: "info",
};

const INTEGRATION_LABEL: Record<string, string> = {
  abacatepay: "AbacatePay (assinatura via Pix)",
  asaas: "Asaas (cartão de crédito, débito e boleto)",
  lytex: "Lytex (Rotta Pay: split/transferência PIX)",
  nominatim: "Nominatim (Rotta Geo Engine: geocodificação)",
  osrm: "OSRM (Rotta Geo Engine: rotas)",
  didit: "Didit (verificação de identidade: CNH/Selfie/Face Match)",
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "nunca";
  return new Date(iso).toLocaleString("pt-BR");
}

/**
 * "Rotta Control Center" (Dossiê 44 — PROMPT ROTTA INTEGRATION &
 * INTELLIGENCE AUDIT ENGINE, Seção 35) — saúde REAL das integrações
 * externas rastreadas por `IntegrationHealthService`, derivada do
 * tráfego real de produção (nunca um ping artificial). Escopo desta
 * entrega: as integrações com instrumentação real até agora (AbacatePay,
 * Lytex, Nominatim, OSRM, Didit — adicionada na Frente C) — o restante
 * do Dossiê 44 (KPIs de negócio, funil, reconciliação com provedores,
 * tracing distribuído) fica documentado como deferido, não fingido aqui.
 */
export default function SaudePage(): JSX.Element {
  const { data, isLoading, isError, refetch, isFetching } = useIntegrationsHealth();

  if (isLoading) {
    return <SaudeSkeleton />;
  }

  if (isError || !data) {
    return (
      <Card>
        <Card.Body>
          <ErrorState
            message="Não foi possível carregar o Rotta Control Center."
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Typography variant="title">Rotta Control Center</Typography>
        <Typography variant="bodySmall" color="muted">
          Saúde real acumulada: só reflete chamadas que de fato aconteceram, nunca um ping
          artificial. Atualiza a cada 30s.
        </Typography>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-2">
          <Card.Body className="flex items-center gap-4">
            <ProgressRing
              value={
                data.score.consideredComponents > 0
                  ? data.score.healthyComponents / data.score.consideredComponents
                  : 1
              }
              size={80}
              strokeWidth={8}
              progressClassName={
                data.status === "ok"
                  ? "stroke-success"
                  : data.status === "degraded"
                    ? "stroke-warning"
                    : "stroke-danger"
              }
            >
              <Typography variant="subtitle">{Math.round(data.score.value)}%</Typography>
            </ProgressRing>
            <div className="flex flex-1 flex-col gap-1">
              <Badge
                variant={
                  data.status === "ok"
                    ? "success"
                    : data.status === "degraded"
                      ? "warning"
                      : "danger"
                }
                className="w-fit"
              >
                {data.status === "ok"
                  ? "Tudo certo"
                  : data.status === "degraded"
                    ? "Degradado"
                    : "Fora do ar"}
              </Badge>
              <Typography variant="caption" color="muted">
                {data.score.healthyComponents}/{data.score.consideredComponents} componentes
                saudáveis — Postgres, Redis e integrações com evidência real.
              </Typography>
            </div>
          </Card.Body>
        </Card>
        <StatTile
          icon={Database}
          tone={data.database ? "success" : "danger"}
          label="Postgres"
          value={data.database ? "Operacional" : "Falhou"}
        />
        <StatTile
          icon={Server}
          tone={data.cache ? "success" : "danger"}
          label="Redis"
          value={data.cache ? "Operacional" : "Falhou"}
        />
      </div>

      <Card>
        <Card.Header title="Integrações externas" />
        <Card.Body className="flex flex-col gap-3">
          <Typography variant="caption" color="muted">
            {data.score.note}
          </Typography>
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            {data.integrations.map((snapshot) => (
              <IntegrationCard key={snapshot.integration} snapshot={snapshot} />
            ))}
          </div>
        </Card.Body>
      </Card>
    </div>
  );
}

const TONE_CIRCLE_CLASSES: Record<(typeof STATUS_TONE)[IntegrationStatusLevel], string> = {
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  info: "bg-info/15 text-info",
};

function IntegrationCard({ snapshot }: { snapshot: IntegrationHealthSnapshot }): JSX.Element {
  const Icon = STATUS_ICON[snapshot.status];

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${TONE_CIRCLE_CLASSES[STATUS_TONE[snapshot.status]]}`}
        >
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex flex-1 flex-col gap-0.5">
          <Typography variant="subtitle">
            {INTEGRATION_LABEL[snapshot.integration] ?? snapshot.integration}
          </Typography>
          <Badge variant={STATUS_BADGE[snapshot.status]} className="w-fit">
            {STATUS_LABEL[snapshot.status]}
          </Badge>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-text-muted">
        <span>Última chamada com sucesso: {formatDateTime(snapshot.lastSuccessAt)}</span>
        <span>Última falha: {formatDateTime(snapshot.lastFailureAt)}</span>
        <span>
          Latência da última chamada:{" "}
          {snapshot.lastLatencyMs !== null ? `${snapshot.lastLatencyMs}ms` : "não registrada"}
        </span>
        <span>Falhas consecutivas: {snapshot.consecutiveFailures}</span>
      </div>
      {snapshot.lastError && (
        <Typography variant="caption" color="muted" className="break-words">
          Último erro/motivo: {snapshot.lastError}
        </Typography>
      )}
    </div>
  );
}

function SaudeSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton variant="text" width={220} height={24} />
        <Skeleton variant="text" width={340} height={14} />
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <Skeleton variant="rect" height={88} className="lg:col-span-2" />
        <Skeleton variant="rect" height={88} />
        <Skeleton variant="rect" height={88} />
      </div>
      <Card>
        <Card.Body className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} variant="rect" height={112} />
          ))}
        </Card.Body>
      </Card>
    </div>
  );
}
