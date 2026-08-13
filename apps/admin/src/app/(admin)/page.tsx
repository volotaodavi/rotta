"use client";

import { useAuth } from "@rotta/auth/web";
import {
  BarChart3,
  Building2,
  Car,
  ClipboardCheck,
  GraduationCap,
  MessageCircle,
  ShieldCheck,
  Store,
} from "@rotta/icons";
import { RottaMap, type RottaMapMarker } from "@rotta/maps/web";
import {
  Badge,
  Card,
  PanelGreeting,
  ProgressRing,
  Spinner,
  Typography,
  buttonVariants,
} from "@rotta/ui/web";
import Link from "next/link";
import { useMemo } from "react";

import type { MapVehicle } from "@rotta/api-client";
import type { LucideIcon } from "@rotta/icons";
import type { Route } from "next";

import { useBackofficeDashboard } from "@/features/backoffice/hooks/use-backoffice";
import { useGpsMapNationwide } from "@/features/gps/hooks/use-gps";

interface AtalhoTile {
  href: Route;
  label: string;
  icon: LucideIcon;
}

/**
 * Atalhos rápidos do Painel Rotta (Frente L) — mesma ideia dos atalhos
 * do painel de "Minha Empresa" em `apps/web` (harmonia visual entre os
 * dois painéis, pedido do usuário), com os 8 destinos mais usados do
 * cabeçalho (`NAV_LINKS`, `(admin)/layout.tsx`). Deixa de fora Saúde/
 * Documentos Legais/Auditoria Legal do grid (não do menu) só pra manter
 * o mesmo tamanho de grid da referência (8 atalhos) — continuam a um
 * clique no cabeçalho.
 */
const PAINEL_ATALHOS: AtalhoTile[] = [
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/veiculos", label: "Veículos", icon: Car },
  { href: "/escolas", label: "Escolas", icon: GraduationCap },
  { href: "/marketplace/solicitacoes", label: "Marketplace", icon: Store },
  { href: "/aprovacoes", label: "Aprovações", icon: ClipboardCheck },
  { href: "/verificacao-identidade", label: "Verif. de identidade", icon: ShieldCheck },
  { href: "/suporte", label: "Suporte", icon: MessageCircle },
  { href: "/inteligencia", label: "Inteligência", icon: BarChart3 },
];

function PainelAtalhos(): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {PAINEL_ATALHOS.map(({ href, label, icon: Icon }) => (
        <Link key={href} href={href}>
          <Card interactive className="h-full">
            <Card.Body className="flex flex-col items-center gap-2 py-5 text-center">
              <span className="flex h-11 w-11 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon size={20} />
              </span>
              <Typography variant="bodySmall" className="font-medium">
                {label}
              </Typography>
            </Card.Body>
          </Card>
        </Link>
      ))}
    </div>
  );
}

/**
 * Tela inicial do Admin Rotta (`ADM-01`, Dossiê 11 §6.1 — "KPIs de
 * saúde da plataforma... atalhos para Chamados de suporte abertos e
 * Alertas"). Todos os números vêm de `GET /backoffice/dashboard`
 * (Dossiê 29) — nenhum placeholder fixo em zero.
 *
 * Frente L (pedido do usuário, com imagem de referência de um ERP de
 * RH — "pegue de exemplo esse design para o ERP da Rotta, tanto para
 * os admins quanto para os usuários autônomos, MEIs e empresas"):
 * ganhou `PanelGreeting` (saudação + relógio) e a grade de atalhos
 * rápidos, mesmos componentes/padrão usados no painel de "Minha
 * Empresa" de `apps/web` — harmonia visual entre os dois painéis.
 */
export default function AdminHomePage(): JSX.Element {
  const { user } = useAuth();
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

  const empresasAtivas = data.empresasPorStatus.ATIVO ?? 0;
  const fracaoEmpresasAtivas = data.empresasTotal > 0 ? empresasAtivas / data.empresasTotal : 0;

  return (
    <div className="flex flex-col gap-6">
      <PanelGreeting nome={user?.nome ?? "Admin"} />

      <PainelAtalhos />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Empresas ativas" value={empresasAtivas} />
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <Card.Header title="Empresas ativas na plataforma" />
          <Card.Body className="flex items-center justify-center gap-4 py-6">
            <ProgressRing value={fracaoEmpresasAtivas} progressClassName="stroke-success">
              <Typography variant="subtitle">{Math.round(fracaoEmpresasAtivas * 100)}%</Typography>
            </ProgressRing>
            <Typography variant="bodySmall" color="muted" className="max-w-[10rem]">
              {empresasAtivas} de {data.empresasTotal} empresa{data.empresasTotal === 1 ? "" : "s"}{" "}
              cadastrada{data.empresasTotal === 1 ? "" : "s"}.
            </Typography>
          </Card.Body>
        </Card>

        <Card className="lg:col-span-2">
          <Card.Header title="Empresas por status" />
          <Card.Body className="flex flex-wrap items-center gap-3">
            {Object.entries(data.empresasPorStatus).map(([status, count]) => (
              <Badge key={status} variant={status === "ATIVO" ? "success" : "neutral"}>
                {status} · {count}
              </Badge>
            ))}
          </Card.Body>
        </Card>
      </div>

      <Card>
        <Card.Header
          title="Frota em tempo real"
          action={
            <Link
              href="/veiculos/mapa"
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              Ver mapa nacional
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
