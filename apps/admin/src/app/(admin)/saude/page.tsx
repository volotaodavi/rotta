"use client";

import { AlertTriangle, CheckCircle2, HelpCircle, XCircle } from "@rotta/icons";
import { Badge, Card, ErrorState, Spinner, Typography } from "@rotta/ui/web";

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

const INTEGRATION_LABEL: Record<string, string> = {
  abacatepay: "AbacatePay (cobrança de assinaturas)",
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
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
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

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card>
          <Card.Body className="flex flex-col gap-1">
            <Typography variant="caption" color="muted">
              Status geral
            </Typography>
            <Badge
              variant={
                data.status === "ok" ? "success" : data.status === "degraded" ? "warning" : "danger"
              }
            >
              {data.status === "ok"
                ? "Tudo certo"
                : data.status === "degraded"
                  ? "Degradado"
                  : "Fora do ar"}
            </Badge>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body className="flex flex-col gap-1">
            <Typography variant="caption" color="muted">
              Score (Postgres, Redis e integrações com evidência real)
            </Typography>
            <Typography variant="title">{data.score.value}/100</Typography>
            <Typography variant="caption" color="muted">
              {data.score.healthyComponents}/{data.score.consideredComponents} componentes saudáveis
            </Typography>
          </Card.Body>
        </Card>
        <Card>
          <Card.Body className="flex flex-col gap-2">
            <Typography variant="caption" color="muted">
              Infraestrutura
            </Typography>
            <div className="flex gap-2">
              <Badge variant={data.database ? "success" : "danger"}>
                Postgres {data.database ? "ok" : "falhou"}
              </Badge>
              <Badge variant={data.cache ? "success" : "danger"}>
                Redis {data.cache ? "ok" : "falhou"}
              </Badge>
            </div>
          </Card.Body>
        </Card>
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

function IntegrationCard({ snapshot }: { snapshot: IntegrationHealthSnapshot }): JSX.Element {
  const Icon = STATUS_ICON[snapshot.status];

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-4">
      <div className="flex items-center justify-between gap-2">
        <Typography variant="subtitle">
          {INTEGRATION_LABEL[snapshot.integration] ?? snapshot.integration}
        </Typography>
        <Badge variant={STATUS_BADGE[snapshot.status]}>
          <Icon size={12} className="mr-1 inline" />
          {STATUS_LABEL[snapshot.status]}
        </Badge>
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
