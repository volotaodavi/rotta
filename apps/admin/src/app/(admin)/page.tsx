"use client";

import { RottaMap, type RottaMapMarker } from "@rotta/maps/web";
import { Badge, Button, Card, Spinner, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useMemo } from "react";

import type { MapVehicle } from "@rotta/api-client";

import { useBackofficeDashboard } from "@/features/backoffice/hooks/use-backoffice";
import { useGpsMapNationwide } from "@/features/gps/hooks/use-gps";

/**
 * Tela inicial do Admin Rotta (`ADM-01`, Dossiê 11 §6.1 — "KPIs de
 * saúde da plataforma... atalhos para Chamados de suporte abertos e
 * Alertas"). Todos os números vêm de `GET /backoffice/dashboard`
 * (Dossiê 29) — nenhum placeholder fixo em zero.
 */
export default function AdminHomePage(): JSX.Element {
  const { data, isLoading, isError } = useBackofficeDashboard();
  const { data: fleet, isLoading: isFleetLoading } = useGpsMapNationwide();

  const fleetMarkers = useMemo<RottaMapMarker[]>(
    () =>
      (fleet ?? [])
        .filter((v): v is MapVehicle & { latitude: number; longitude: number } =>
          Boolean(v.latitude && v.longitude),
        )
        .map((v) => ({
          id: v.tripId,
          titulo: `${v.placa} — ${v.companyNome ?? "Empresa"}`,
          latitude: v.latitude,
          longitude: v.longitude,
          emMovimento: true,
        })),
    [fleet],
  );

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
        <Card.Header
          title="Frota em tempo real"
          action={
            <Link href="/veiculos/mapa">
              <Button variant="secondary" size="sm">
                Ver mapa nacional
              </Button>
            </Link>
          }
        />
        <Card.Body className="flex flex-col gap-3">
          <Typography variant="bodySmall" color="muted">
            {fleet?.length ?? 0} veículo(s) em viagem agora, em todas as empresas.
          </Typography>
          {isFleetLoading ? (
            <div className="flex justify-center py-8">
              <Spinner size="md" />
            </div>
          ) : fleetMarkers.length === 0 ? (
            <Typography variant="bodySmall" color="muted">
              Nenhum veículo em viagem no momento.
            </Typography>
          ) : (
            <div style={{ height: 320 }}>
              <RottaMap markers={fleetMarkers} initialZoom={4} />
            </div>
          )}
        </Card.Body>
      </Card>

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
