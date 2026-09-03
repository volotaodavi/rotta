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
  MessageCircle,
  Store,
  TrendingDown,
  TrendingUp,
} from "@rotta/icons";
import { type RottaMapMarker } from "@rotta/maps/types";
import {
  Badge,
  Card,
  ErrorState,
  PanelGreeting,
  ProgressRing,
  Skeleton,
  Spinner,
  StatTile,
  TrendBarChart,
  Typography,
  buttonVariants,
} from "@rotta/ui/web";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { CalendarAgendaItem } from "@/features/dashboard/components/operational-calendar";
import type { ApprovalQueue, MapVehicle } from "@rotta/api-client";
import type { LucideIcon } from "@rotta/icons";
import type { Route } from "next";

import { RottaMapLazy as RottaMap } from "@/components/rotta-map-lazy";
import { useNationalKpis } from "@/features/analytics/hooks/use-analytics";
import {
  useApprovalQueue,
  useBackofficeDashboard,
} from "@/features/backoffice/hooks/use-backoffice";
import { OperationalCalendarCard } from "@/features/dashboard/components/operational-calendar";
import { useGpsMapNationwide } from "@/features/gps/hooks/use-gps";
import { useIntegrationsHealth } from "@/features/health/hooks/use-integrations-health";
import { useSupportTickets } from "@/features/support/hooks/use-support";
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
 * Grade de indicadores (Frente Mercury original: lista "Contas", cada
 * linha com ícone + saldo — trocado por `StatTile` na modernização
 * pedida pelo usuário 02/09/2026, mesma forma de card usada em
 * qualquer dashboard "de verdade"). Cada tile continua um `<Link>`
 * real (nunca um `onClick` sintético) pra `GET /backoffice/dashboard`
 * já existente — `StatTile interactive` só liga o destaque visual de
 * hover, a navegação em si é inteiramente do `<Link>`.
 */
function IndicadoresGrid({ itens }: { itens: IndicadorItem[] }): JSX.Element {
  return (
    <div className="grid grid-cols-2 gap-3">
      {itens.map((item) => (
        <Link key={item.label} href={item.href} className="block">
          <StatTile
            icon={item.icon}
            tone={item.highlight && item.value > 0 ? "warning" : "primary"}
            label={item.label}
            value={item.value.toLocaleString("pt-BR")}
            interactive
          />
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
      titulo: `${d.tipo}: ${d.userNome}`,
      empresa: d.companyNome,
      createdAt: d.createdAt,
    })),
    ...queue.documentosVeiculo.map((d) => ({
      id: d.id,
      tipo: "Documento de veículo" as const,
      titulo: `${d.tipo}: ${d.vehiclePlaca}`,
      empresa: d.companyNome,
      createdAt: d.createdAt,
    })),
    ...queue.contratos.map((c) => ({
      id: c.id,
      tipo: "Contrato" as const,
      titulo: `Contrato: ${c.studentNome}`,
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
          <div className="flex items-center gap-4">
            <Skeleton variant="circle" width={72} height={72} />
            <Skeleton variant="text" height={16} className="flex-1" />
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <ProgressRing
              value={
                data.score.consideredComponents > 0
                  ? data.score.healthyComponents / data.score.consideredComponents
                  : 1
              }
              size={72}
              strokeWidth={7}
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
            <Typography variant="bodySmall" className="flex-1 font-medium">
              {data.score.healthyComponents} de {data.score.consideredComponents} integrações
              saudáveis
            </Typography>
          </div>
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
 * Esqueleto do carregamento inicial (pedido do usuário 02/09/2026:
 * "trazer mais modernidade") — substitui o `Spinner` de página inteira
 * que escondia toda a estrutura enquanto `useBackofficeDashboard`
 * carregava. Mesmo grid da tela de verdade (saudação, ações, receita +
 * indicadores, aprovações + saúde), só com blocos de `Skeleton` no
 * lugar do conteúdo.
 */
function AdminHomeSkeleton(): JSX.Element {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton variant="text" width={220} height={28} />
        <Skeleton variant="text" width={160} height={16} />
      </div>
      <div className="flex flex-wrap gap-3">
        {Array.from({ length: 5 }).map((_, index) => (
          <Skeleton key={index} variant="rect" width={128} height={36} className="rounded-md" />
        ))}
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <Card.Body className="flex flex-col gap-4">
            <Skeleton variant="text" width={100} height={14} />
            <Skeleton variant="text" width={200} height={40} />
            <Skeleton variant="rect" height={140} />
          </Card.Body>
        </Card>
        <Card>
          <Card.Body className="grid grid-cols-2 gap-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} variant="rect" height={96} />
            ))}
          </Card.Body>
        </Card>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <Card.Body className="flex flex-col gap-3">
            <Skeleton variant="text" width={140} height={16} />
            <Skeleton variant="rect" height={80} />
          </Card.Body>
        </Card>
        <Card>
          <Card.Body className="flex flex-col gap-3">
            <Skeleton variant="text" width={160} height={16} />
            <Skeleton variant="rect" height={80} />
          </Card.Body>
        </Card>
      </div>
    </div>
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
  const { data, isLoading, isError, refetch, isFetching } = useBackofficeDashboard();
  const { data: fleet, isLoading: isFleetLoading } = useGpsMapNationwide();
  const { data: approvalQueue } = useApprovalQueue();
  const { data: chamadosAbertos } = useSupportTickets({ status: "ABERTO", pageSize: 100 });
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
          titulo: `${v.placa}: ${v.companyNome ?? "Empresa"}`,
          latitude: v.latitude,
          longitude: v.longitude,
          emMovimento: true,
        })),
    [fleet],
  );

  const approvalItems = useMemo(() => buildApprovalItems(approvalQueue), [approvalQueue]);

  const agendaItems = useMemo<CalendarAgendaItem[]>(
    () => [
      ...approvalItems.map((item): CalendarAgendaItem => ({
        id: item.id,
        tipo: "Aprovação",
        titulo: item.titulo,
        empresa: item.empresa,
        href: "/aprovacoes",
        createdAt: item.createdAt,
      })),
      ...(chamadosAbertos?.items ?? []).map((ticket): CalendarAgendaItem => ({
        id: ticket.id,
        tipo: "Chamado",
        titulo: ticket.assunto,
        empresa: ticket.companyNome,
        href: `/suporte/${ticket.id}?companyId=${ticket.companyId}` as Route,
        createdAt: ticket.createdAt,
      })),
    ],
    [approvalItems, chamadosAbertos],
  );

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
    return <AdminHomeSkeleton />;
  }

  if (isError || !data) {
    return (
      <Card>
        <Card.Body>
          <ErrorState
            message="Não foi possível carregar o painel."
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
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
                        Viagens realizadas: período atual vs. anterior
                      </Typography>
                      <TrendBarChart
                        data={[
                          {
                            categoria: "Viagens",
                            atual: periodo.viagensRealizadas,
                            anterior: periodoAnterior.viagensRealizadas,
                          },
                        ]}
                        categoryKey="categoria"
                        series={[
                          { key: "atual", label: "Atual" },
                          {
                            key: "anterior",
                            label: "Anterior",
                            color: "rgb(var(--color-secondary) / 0.5)",
                          },
                        ]}
                        height={180}
                      />
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
            <IndicadoresGrid itens={indicadores} />
          </Card.Body>
        </Card>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <AprovacoesCarousel itens={approvalItems} total={data.aprovacoesPendentesTotal} />
        <SaudeIntegracoesCard />
      </div>

      <OperationalCalendarCard itens={agendaItems} />

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
