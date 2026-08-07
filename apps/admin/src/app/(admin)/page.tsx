"use client";

import { Badge, Card, Spinner, Typography } from "@rotta/ui/web";
import Link from "next/link";

import { useBackofficeDashboard } from "@/features/backoffice/hooks/use-backoffice";

/**
 * Tela inicial do Admin Rotta (`ADM-01`, Dossiê 11 §6.1 — "KPIs de
 * saúde da plataforma... atalhos para Chamados de suporte abertos e
 * Alertas"). Todos os números vêm de `GET /backoffice/dashboard`
 * (Dossiê 29) — nenhum placeholder fixo em zero.
 */
export default function AdminHomePage(): JSX.Element {
  const { data, isLoading, isError } = useBackofficeDashboard();

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
          <Typography variant="body" color="danger">
            Não foi possível carregar o painel. Tente novamente.
          </Typography>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="title">Painel Rotta</Typography>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Empresas ativas" value={data.empresasPorStatus.ATIVO ?? 0} />
        <KpiCard label="Motoristas ativos" value={data.motoristasAtivos} />
        <KpiCard label="Monitores ativos" value={data.monitoresAtivos} />
        <KpiCard label="Veículos cadastrados" value={data.veiculosTotal} />
        <KpiCard label="Alunos cadastrados" value={data.alunosTotal} />
        <KpiCard label="Viagens hoje" value={data.viagensHoje} />
        <KpiCard
          label="Chamados abertos"
          value={data.chamadosAbertos}
          href="/suporte"
          highlight={data.chamadosAbertos > 0}
        />
        <KpiCard
          label="Aprovações pendentes"
          value={data.aprovacoesPendentesTotal}
          href="/aprovacoes"
          highlight={data.aprovacoesPendentesTotal > 0}
        />
      </div>

      <Card>
        <Card.Header title="Empresas por status" />
        <Card.Body className="flex flex-wrap gap-3">
          {Object.entries(data.empresasPorStatus).map(([status, count]) => (
            <Badge key={status} variant={status === "ATIVO" ? "success" : "neutral"}>
              {status} · {count}
            </Badge>
          ))}
          <Typography variant="caption" color="muted" className="w-full pt-1">
            {data.empresasTotal} empresas cadastradas no total.
          </Typography>
        </Card.Body>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  href,
  highlight = false,
}: {
  label: string;
  value: number;
  href?: "/suporte" | "/aprovacoes";
  highlight?: boolean;
}): JSX.Element {
  const content = (
    <Card.Body className="flex flex-col gap-1">
      <Typography variant="caption" color="muted">
        {label}
      </Typography>
      <Typography variant="title" className={highlight ? "text-warning" : undefined}>
        {value}
      </Typography>
    </Card.Body>
  );

  return href ? (
    <Link href={href}>
      <Card interactive>{content}</Card>
    </Link>
  ) : (
    <Card>{content}</Card>
  );
}
