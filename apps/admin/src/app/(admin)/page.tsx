"use client";

import { useAuth } from "@rotta/auth/web";
import {
  Building2,
  Car,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  Download,
  GraduationCap,
  HeartPulse,
  MessageCircle,
  Store,
  TrendingDown,
  TrendingUp,
} from "@rotta/icons";
import { RottaMap, type RottaMapMarker } from "@rotta/maps/web";
import { Badge, Card, PanelGreeting, Spinner, Typography, buttonVariants } from "@rotta/ui/web";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { ApprovalQueue, MapVehicle } from "@rotta/api-client";
import type { LucideIcon } from "@rotta/icons";
import type { Route } from "next";

import { useNationalKpis } from "@/features/analytics/hooks/use-analytics";
import {
  useApprovalQueue,
  useBackofficeDashboard,
} from "@/features/backoffice/hooks/use-backoffice";
import { useGpsMapNationwide } from "@/features/gps/hooks/use-gps";
import { useIntegrationsHealth } from "@/features/health/hooks/use-integrations-health";
import { analyticsApi } from "@/lib/api-client";
import { usePrivacy } from "@/providers/privacy-provider";


function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

const PERIODOS = [
  { dias: 7, label: "Últimos 7 dias" },
  { dias: 30, label: "Últimos 30 dias" },
  { dias: 90, label: "Últimos 90 dias" },
];

/**
 * Botões de ação rápida logo abaixo da saudação (Frente Mercury — banner
 * de referência: Send/Transfer/Deposit/Request/Upload bill). Adaptação
 * honesta: a Rotta não movimenta dinheiro pelo Admin Rotta (quem faz
 * isso é o Rotta Pay, do lado da empresa/motorista), então em vez de
 * fingir "Enviar"/"Transferir", os 5 botões levam aos 5 verbos reais do
 * dia a dia do Admin — todos navegam pra uma tela que existe ou
 * disparam uma ação real (exportar), nunca decorativos.
 */
function AcoesRapidas({
  onExportar,
  isExportando,
}: {
  onExportar: () => void;
  isExportando: boolean;
}) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link href="/empresas/nova" className={buttonVariants({ variant: "primary" })}>
        Nova empresa
      </Link>
      <Link href="/aprovacoes" className={buttonVariants({ variant: "secondary" })}>
        Aprovações
      </Link>
      <Link href="/suporte" className={buttonVariants({ variant: "secondary" })}>
        Chamados
      </Link>
      <Link href="/verificacao-identidade" className={buttonVariants({ variant: "secondary" })}>
        Verificar identidade
      </Link>
      <button
        type="button"
        onClick={onExportar}
        disabled={isExportando}
        className={buttonVariants({ variant: "secondary", disabled: isExportando })}
      >
        {isExportando ? <Spinner size="sm" /> : <Download className="h-4 w-4" />}
        Exportar relatório
      </button>
    </div>
  );
}

interface IndicadorItem {
  label: string;
  value: number;
  href: Route;
  icon: LucideIcon;
  highlight?: boolean;
}

/**
 * Lista "Contas" do painel (Frente Mercury — banner de referência:
 * Credit Card/Treasury/Ops-Payroll/AP/AR, cada linha com ícone + saldo).
 * Adaptação honesta: a Rotta não tem sub-contas bancárias no Admin, mas
 * tem exatamente essa mesma FORMA — uma lista de indicadores
 * operacionais reais, cada linha clicável levando pra tela de gestão
 * daquele indicador (`GET /backoffice/dashboard`, já existia).
 */
function IndicadoresList({ itens }: { itens: IndicadorItem[] }): JSX.Element {
  return (
    <div className="flex flex-col divide-y divide-border">
      {itens.map((item) => (
        <Link
          key={item.label}
          href={item.href}
          className="flex items-center justify-between gap-3 py-3 transition-colors hover:bg-muted"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
              <item.icon size={16} />
            </span>
            <Typography variant="bodySmall" className="font-medium">
              {item.label}
            </Typography>
          </div>
          <Typography
            variant="subtitle"
            className={item.highlight && item.value > 0 ? "text-warning" : undefined}
          >
            {item.value.toLocaleString("pt-BR")}
          </Typography>
        </Link>
      ))}
    </div>
  );
}

type ApprovalItemTipo = "Documento de motorista" | "Documento de veículo" | "Contrato";

interface ApprovalItem {
  id: string;
  tipo: ApprovalItemTipo;
  titulo: string;
  empresa: string;
  createdAt: string;
}

function buildApprovalItems(queue: ApprovalQueue | undefined): ApprovalItem[] {
  if (!queue) return [];
  return [
    ...queue.documentosMotorista.map((d) => ({
      id: d.id,
      tipo: "Documento de motorista" as const,
      titulo: `${d.tipo} — ${d.userNome}`,
      empresa: d.companyNome,
      createdAt: d.createdAt,
    })),
    ...queue.documentosVeiculo.map((d) => ({
      id: d.id,
      tipo: "Documento de veículo" as const,
      titulo: `${d.tipo} — ${d.vehiclePlaca}`,
      empresa: d.companyNome,
      createdAt: d.createdAt,
    })),
    ...queue.contratos.map((c) => ({
      id: c.id,
      tipo: "Contrato" as const,
      titulo: `Contrato — ${c.studentNome}`,
      empresa: c.companyNome,
      createdAt: c.createdAt,
    })),
  ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}

/**
 * Carrossel "Aprovações pendentes" (Frente Mercury — banner de
 * referência: "Disputes", `< 1/9 >`, item + "Open disputes — View").
 * Mesmo formato visual, dado 100% real (`GET /backoffice/approvals`,
 * já existia — só nunca tinha virado um carrossel na Home).
 */
function AprovacoesCarousel({
  itens,
  total,
}: {
  itens: ApprovalItem[];
  total: number;
}): JSX.Element {
  const [indice, setIndice] = useState(0);
  const atual = itens[indice];

  return (
    <Card>
      <Card.Header
        title="Aprovações"
        action={
          itens.length > 0 && (
            <div className="flex items-center gap-2">
              <button
                type="button"
                aria-label="Anterior"
                disabled={indice === 0}
                onClick={() => setIndice((i) => Math.max(0, i - 1))}
                className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-muted disabled:opacity-30"
              >
                <ChevronLeft size={16} />
              </button>
              <Typography variant="caption" color="muted">
                {indice + 1}/{itens.length}
              </Typography>
              <button
                type="button"
                aria-label="Próxima"
                disabled={indice === itens.length - 1}
                onClick={() => setIndice((i) => Math.min(itens.length - 1, i + 1))}
                className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-muted disabled:opacity-30"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          )
        }
      />
      <Card.Body className="flex flex-col gap-4">
        {atual ? (
          <div>
            <Badge variant="warning">{atual.tipo}</Badge>
            <Typography variant="subtitle" className="mt-2">
              {atual.titulo}
            </Typography>
            <Typography variant="bodySmall" color="muted">
              {atual.empresa} · enviado em {new Date(atual.createdAt).toLocaleDateString("pt-BR")}
            </Typography>
          </div>
        ) : (
          <Typography variant="bodySmall" color="muted">
            Nenhuma aprovação pendente agora.
          </Typography>
        )}
        <div className="flex items-center justify-between border-t border-border pt-3">
          <div>
            <Typography variant="caption" color="muted">
              Fila de aprovações
            </Typography>
            <Typography variant="bodySmall" className="font-semibold">
              {total} pendente{total === 1 ? "" : "s"}
            </Typography>
          </div>
          <Link href="/aprovacoes" className={buttonVariants({ variant: "secondary", size: "sm" })}>
            Ver todas
          </Link>
        </div>
      </Card.Body>
    </Card>
  );
}

/**
 * Card "Saúde das integrações" (Frente Mercury — banner de referência:
 * "Credit Card", barra de saldo/pendente + "Pay"). Adaptação honesta:
 * a Rotta não tem cartão de crédito no Admin, mas tem a MESMA forma —
 * uma barra de progresso + um botão de ação — só que sobre a saúde real
 * das integrações externas (`GET /health/integrations`, "Rotta Control
 * Center", Dossiê 44), já em produção.
 */
function SaudeIntegracoesCard(): JSX.Element {
  const { data, isLoading } = useIntegrationsHealth();

  return (
    <Card>
      <Card.Header
        title="Saúde das integrações"
        action={
          data && (
            <Badge
              variant={
                data.status === "ok" ? "success" : data.status === "degraded" ? "warning" : "danger"
              }
            >
              {data.status === "ok"
                ? "Operacional"
                : data.status === "degraded"
                  ? "Degradada"
                  : "Fora do ar"}
            </Badge>
          )
        }
      />
      <Card.Body className="flex flex-col gap-4">
        {isLoading || !data ? (
          <div className="flex justify-center py-6">
            <Spinner size="md" />
          </div>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <HeartPulse size={20} />
              </span>
              <div className="flex-1">
                <Typography variant="title">{Math.round(data.score.value)}%</Typography>
                <Typography variant="caption" color="muted">
                  {data.score.healthyComponents} de {data.score.consideredComponents} integrações
                  saudáveis
                </Typography>
              </div>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full ${
                  data.status === "ok"
                    ? "bg-success"
                    : data.status === "degraded"
                      ? "bg-warning"
                      : "bg-danger"
                }`}
                style={{
                  width: `${data.score.consideredComponents > 0 ? (data.score.healthyComponents / data.score.consideredComponents) * 100 : 100}%`,
                }}
              />
            </div>
          </>
        )}
        <Link
          href="/saude"
          className={buttonVariants({ variant: "secondary", size: "sm", fullWidth: true })}
        >
          Ver Rotta Control Center
        </Link>
      </Card.Body>
    </Card>
  );
}

/**
 * Tela inicial do Admin Rotta (`ADM-01`, Dossiê 11 §6.1). Redesenho
 * "Frente Mercury" (pedido do usuário, banner de referência de um
 * painel bancário): sidebar + saudação + ações rápidas + cartão de
 * receita (equivalente ao "Mercury balance") + lista de indicadores
 * (equivalente a "Accounts") + aprovações em carrossel (equivalente a
 * "Disputes") + saúde das integrações (equivalente ao cartão de
 * "Credit Card"). Todo número vem de endpoint real que já existia
 * (`backoffice/dashboard`, `analytics/national/kpis`,
 * `backoffice/approvals`, `health/integrations`) — nada fabricado, e
 * cada botão leva a uma tela real ou dispara uma ação real (pedido
 * explícito do usuário: "não quero botão fake").
 */
export default function AdminHomePage(): JSX.Element {
  const { user } = useAuth();
  const { hidden } = usePrivacy();
  const { data, isLoading, isError } = useBackofficeDashboard();
  const { data: fleet, isLoading: isFleetLoading } = useGpsMapNationwide();
  const { data: approvalQueue } = useApprovalQueue();
  const [periodoDias, setPeriodoDias] = useState(30);
  const [isExportando, setIsExportando] = useState(false);

  const { from, to } = useMemo(() => {
    const agora = new Date();
    const inicio = new Date(agora);
    inicio.setDate(inicio.getDate() - periodoDias);
    return { from: inicio.toISOString().slice(0, 10), to: agora.toISOString().slice(0, 10) };
  }, [periodoDias]);

  const { data: kpis, isLoading: isLoadingKpis } = useNationalKpis({ from, to });

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

  const approvalItems = useMemo(() => buildApprovalItems(approvalQueue), [approvalQueue]);

  async function handleExportarRelatorio(): Promise<void> {
    setIsExportando(true);
    try {
      const blob = await analyticsApi.exportNational({ from, to, format: "csv" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `relatorio-nacional-${to}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsExportando(false);
    }
  }

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

  const indicadores: IndicadorItem[] = [
    {
      label: "Empresas ativas",
      value: data.empresasPorStatus.ATIVO ?? 0,
      href: "/empresas",
      icon: Building2,
    },
    { label: "Veículos cadastrados", value: data.veiculosTotal, href: "/veiculos", icon: Car },
    { label: "Alunos cadastrados", value: data.alunosTotal, href: "/escolas", icon: GraduationCap },
    {
      label: "Solicitações no Marketplace",
      value: data.contratosAguardandoAssinatura,
      href: "/marketplace/solicitacoes",
      icon: Store,
    },
    {
      label: "Chamados abertos",
      value: data.chamadosAbertos,
      href: "/suporte",
      icon: MessageCircle,
      highlight: true,
    },
    {
      label: "Aprovações pendentes",
      value: data.aprovacoesPendentesTotal,
      href: "/aprovacoes",
      icon: ClipboardCheck,
      highlight: true,
    },
  ];

  const negocio = kpis?.negocio;
  const periodo = kpis?.periodo;
  const periodoAnterior = kpis?.periodoAnterior;
  const maiorViagens = Math.max(
    periodo?.viagensRealizadas ?? 0,
    periodoAnterior?.viagensRealizadas ?? 0,
    1,
  );

  return (
    <div className="flex flex-col gap-6">
      <PanelGreeting nome={user?.nome ?? "Admin"} />

      <AcoesRapidas onExportar={() => void handleExportarRelatorio()} isExportando={isExportando} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Card.Header
            title="Receita recorrente"
            action={
              <select
                value={periodoDias}
                onChange={(event) => setPeriodoDias(Number(event.target.value))}
                className="rounded-md border border-border bg-surface px-2 py-1.5 text-sm text-text outline-none"
              >
                {PERIODOS.map((opcao) => (
                  <option key={opcao.dias} value={opcao.dias}>
                    {opcao.label}
                  </option>
                ))}
              </select>
            }
          />
          <Card.Body className="flex flex-col gap-6">
            {isLoadingKpis || !negocio ? (
              <div className="flex justify-center py-8">
                <Spinner size="lg" />
              </div>
            ) : (
              <>
                <div className="flex flex-wrap items-end gap-8">
                  <div>
                    <Typography variant="caption" color="muted">
                      MRR
                    </Typography>
                    <Typography variant="display">
                      {hidden ? "R$ ••••••" : centsToBRL(negocio.mrrCentavos)}
                    </Typography>
                  </div>
                  <div>
                    <Typography variant="caption" color="muted">
                      ARR
                    </Typography>
                    <Typography variant="title">
                      {hidden ? "R$ ••••••" : centsToBRL(negocio.arrCentavos)}
                    </Typography>
                  </div>
                  <div>
                    <Typography variant="caption" color="muted">
                      Empresas pagantes
                    </Typography>
                    <Typography variant="title">{negocio.empresasAtivasPagantes}</Typography>
                  </div>
                </div>

                {periodo && periodoAnterior && (
                  <div className="flex flex-col gap-3 border-t border-border pt-4">
                    <div className="flex flex-wrap items-center gap-6">
                      <div className="flex items-center gap-1.5 text-success">
                        <TrendingUp className="h-4 w-4" />
                        <Typography variant="bodySmall" className="font-semibold text-success">
                          +{periodo.novasEmpresas} empresas novas
                        </Typography>
                      </div>
                      <div className="flex items-center gap-1.5 text-danger">
                        <TrendingDown className="h-4 w-4" />
                        <Typography variant="bodySmall" className="font-semibold text-danger">
                          -{periodo.empresasCanceladas} canceladas
                        </Typography>
                      </div>
                      <Typography variant="bodySmall" color="muted">
                        Churn aproximado: {(periodo.churnRateAproximado * 100).toFixed(1)}%
                      </Typography>
                    </div>

                    <div className="flex flex-col gap-2">
                      <Typography variant="caption" color="muted">
                        Viagens realizadas — período atual vs. anterior
                      </Typography>
                      <div className="flex items-end gap-4">
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className="w-10 rounded-t-md bg-primary"
                            style={{
                              height: `${Math.max((periodo.viagensRealizadas / maiorViagens) * 96, 4)}px`,
                            }}
                          />
                          <Typography variant="caption" className="font-semibold">
                            {periodo.viagensRealizadas}
                          </Typography>
                          <Typography variant="caption" color="muted">
                            Atual
                          </Typography>
                        </div>
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className="w-10 rounded-t-md bg-secondary/40"
                            style={{
                              height: `${Math.max((periodoAnterior.viagensRealizadas / maiorViagens) * 96, 4)}px`,
                            }}
                          />
                          <Typography variant="caption" className="font-semibold">
                            {periodoAnterior.viagensRealizadas}
                          </Typography>
                          <Typography variant="caption" color="muted">
                            Anterior
                          </Typography>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </Card.Body>
        </Card>

        <Card>
          <Card.Header
            title="Indicadores"
            action={
              <Link
                href="/inteligencia"
                className="text-xs font-semibold text-primary hover:underline"
              >
                Ver todos
              </Link>
            }
          />
          <Card.Body>
            <IndicadoresList itens={indicadores} />
          </Card.Body>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AprovacoesCarousel itens={approvalItems} total={data.aprovacoesPendentesTotal} />
        <SaudeIntegracoesCard />
      </div>

      <Card>
        <Card.Header
          title="Empresas por status"
          action={
            <Link href="/empresas" className={buttonVariants({ variant: "secondary", size: "sm" })}>
              Ver empresas
            </Link>
          }
        />
        <Card.Body className="flex flex-wrap items-center gap-3">
          {Object.entries(data.empresasPorStatus).map(([status, count]) => (
            <Badge key={status} variant={status === "ATIVO" ? "success" : "neutral"}>
              {status} · {count}
            </Badge>
          ))}
        </Card.Body>
      </Card>

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
