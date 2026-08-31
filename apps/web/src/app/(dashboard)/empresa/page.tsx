"use client";

import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import {
  Bell,
  CalendarDays,
  Car,
  GraduationCap,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Store,
  Users,
} from "@rotta/icons";
import { RottaMap, type RottaMapMarker } from "@rotta/maps/web";
import {
  Badge,
  Button,
  Card,
  FormField,
  Input,
  PanelGreeting,
  ProgressRing,
  Select,
  Spinner,
  Tabs,
  Typography,
  buttonVariants,
} from "@rotta/ui/web";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { AgendaEventoTipo, Company, MapVehicle, UpdateCompanyInput } from "@rotta/api-client";
import type { LucideIcon } from "@rotta/icons";
import type { Route } from "next";

import { useAgendaEvents } from "@/features/agenda/hooks/use-agenda";
import {
  useMyCompany,
  useMyCompanyDashboard,
  useMyCompanySettings,
  useUpdateMyCompany,
  useUpdateMyCompanySettings,
} from "@/features/company/hooks/use-company";
import { useGpsMap } from "@/features/gps/hooks/use-gps";

/**
 * Banner de assinatura (briefing "PLANO" — Dossiê 26: cadastro
 * self-service SEMPRE é permitido; a cobrança acontece depois, aqui,
 * nunca bloqueando a criação da conta). Mostrado enquanto
 * `company.status === "TRIAL"`. "Assinar agora" leva pro checkout
 * próprio da Rotta (`/assinatura`) — Pix (AbacatePay) e cartão/débito/
 * boleto (Asaas) numa única tela, sem duplicar o fluxo aqui (mesmo
 * link que `TrialLockModal` usa quando o trial vence de verdade).
 */
const MS_DIA = 24 * 60 * 60 * 1000;

/** "Expira em N dias"/"Expirado há N dias" a partir de `trialExpiraEm` — mesmo cálculo do painel Admin (`/planos`), aqui pra própria empresa ver o prazo antes de o cadeado cair. */
function contagemTrial(trialExpiraEm: string | null): { texto: string; urgente: boolean } | null {
  if (!trialExpiraEm) return null;
  const diasRestantes = Math.ceil((new Date(trialExpiraEm).getTime() - Date.now()) / MS_DIA);
  if (diasRestantes > 0) {
    return {
      texto: `Expira em ${diasRestantes} dia${diasRestantes === 1 ? "" : "s"}`,
      urgente: diasRestantes <= 3,
    };
  }
  const diasVencido = Math.abs(diasRestantes);
  return {
    texto:
      diasVencido === 0
        ? "Vence hoje"
        : `Expirado há ${diasVencido} dia${diasVencido === 1 ? "" : "s"}`,
    urgente: true,
  };
}

function TrialBanner({
  status,
  trialExpiraEm,
}: {
  status: Company["status"];
  trialExpiraEm: string | null;
}): JSX.Element | null {
  if (status !== "TRIAL") return null;
  const contagem = contagemTrial(trialExpiraEm);

  return (
    <Card className="border-primary/30 bg-primary/5">
      <Card.Body className="flex flex-col items-start gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary">
            <Sparkles className="h-5 w-5" />
          </span>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <Typography variant="subtitle">Período de teste</Typography>
              <Badge variant="info">Trial</Badge>
              {contagem && (
                <Badge variant={contagem.urgente ? "danger" : "neutral"}>{contagem.texto}</Badge>
              )}
            </div>
            <Typography variant="bodySmall" color="muted">
              Sua empresa está em período de teste gratuito. Assine o plano Starter (R$ 39,90/mês)
              para continuar usando a plataforma sem interrupções.
            </Typography>
          </div>
        </div>
        <Link href="/assinatura" className={buttonVariants({ variant: "primary" }) + " shrink-0"}>
          Assinar agora
        </Link>
      </Card.Body>
    </Card>
  );
}

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

interface AtalhoTile {
  href: Route;
  label: string;
  icon: LucideIcon;
}

/**
 * Atalhos rápidos do Painel (Frente L) — mesmo papel dos "Sickleave/
 * Leave/Vacation/Support/Requests/Reports/Projects/Schedule" de uma
 * imagem de referência de ERP de RH, adaptado ao que a transportadora
 * realmente faz no dia a dia: nenhum item aqui é novo, são as MESMAS
 * rotas que já existem no menu de cabeçalho (`PROFISSIONAL_NAV`,
 * `(dashboard)/layout.tsx`) — só ganharam um atalho visual maior/mais
 * rápido de tocar na tela inicial. Nada de "Rotas" aqui: a
 * transportadora ainda não tem uma tela própria de CRUD de rotas no
 * Painel Web (só o app mobile e a operação em "Minha Rota") — um atalho
 * pra ela seria um link morto. Nada de "Rotta Pay" aqui também: removido
 * a pedido explícito do usuário ("Apague a 'Rotta pay' também, não
 * iremos utilizar também") — a transportadora não vai usar essa carteira.
 */
const PAINEL_ATALHOS: AtalhoTile[] = [
  { href: "/equipe", label: "Equipe", icon: Users },
  { href: "/veiculos", label: "Veículos", icon: Car },
  { href: "/escolas", label: "Escolas", icon: GraduationCap },
  { href: "/marketplace/solicitacoes", label: "Marketplace", icon: Store },
  { href: "/verificacao-identidade", label: "Verificar identidade", icon: ShieldCheck },
  { href: "/notificacoes", label: "Notificações", icon: Bell },
  { href: "/chamados", label: "Chamados", icon: MessageCircle },
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
 * Anel "Frota em operação agora" (Frente L) — única métrica em anel
 * desta tela, de propósito: é a única proporção honesta que os dados
 * hoje sustentam (veículos em viagem agora / total de veículos da
 * empresa, mesma fonte de `useGpsMap` já usada em "Frota ao vivo"
 * abaixo). A imagem de referência mostra três anéis (frequência,
 * férias, performance) — os outros dois não têm equivalente real na
 * Rotta hoje (não existe banco de horas/férias pra motorista autônomo/
 * funcionário, e "performance" viraria um número inventado): melhor um
 * anel real do que três decorativos.
 */
function FrotaEmOperacaoCard({ ativos, total }: { ativos: number; total: number }): JSX.Element {
  const fracao = total > 0 ? ativos / total : 0;
  return (
    <Card>
      <Card.Header title="Frota em operação agora" />
      <Card.Body className="flex items-center justify-center gap-4 py-6">
        <ProgressRing value={fracao} progressClassName="stroke-success">
          <Typography variant="subtitle">{Math.round(fracao * 100)}%</Typography>
        </ProgressRing>
        <Typography variant="bodySmall" color="muted" className="max-w-[10rem]">
          {ativos} de {total} veículo{total === 1 ? "" : "s"} em viagem agora.
        </Typography>
      </Card.Body>
    </Card>
  );
}

const AGENDA_TIPO_LABEL: Record<AgendaEventoTipo, string> = {
  FERIADO: "Feriado",
  RECESSO: "Recesso",
  EVENTO_ESCOLAR: "Evento escolar",
  TROCA_DE_ROTA_PONTUAL: "Troca de rota",
  AUSENCIA_PLANEJADA: "Ausência planejada",
  MANUTENCAO_VEICULO: "Manutenção de veículo",
  VENCIMENTO_CNH: "Vencimento de CNH",
  VENCIMENTO_SEGURO: "Vencimento de seguro",
  VENCIMENTO_DOCUMENTO_GENERICO: "Vencimento de documento",
};

/**
 * "Próximos eventos" (Frente L) — adapta "Events & Announcements" da
 * imagem de referência. Primeiro consumo real do módulo Agenda no
 * Painel Web (Dossiê 8 §14, tarefa #101): backend e `@rotta/api-client`
 * já existiam prontos, só nunca tinham ganhado uma tela.
 */
function ProximosEventos(): JSX.Element {
  const hojeISO = useMemo(() => new Date().toISOString(), []);
  const { data, isLoading } = useAgendaEvents({ de: hojeISO, pageSize: 5 });
  const eventos = data?.items ?? [];

  return (
    <Card>
      <Card.Header title="Próximos eventos" />
      <Card.Body className="flex flex-col gap-3">
        {isLoading ? (
          <div className="flex justify-center py-4">
            <Spinner size="sm" />
          </div>
        ) : eventos.length === 0 ? (
          <Typography variant="bodySmall" color="muted">
            Nenhum evento cadastrado na Agenda.
          </Typography>
        ) : (
          eventos.map((evento) => (
            <div
              key={evento.id}
              className="flex items-center justify-between gap-3 border-t border-border pt-3 first:border-t-0 first:pt-0"
            >
              <div className="flex items-start gap-2">
                <CalendarDays size={16} className="mt-0.5 shrink-0 text-text-muted" />
                <div>
                  <Typography variant="bodySmall" className="font-medium">
                    {evento.titulo}
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {AGENDA_TIPO_LABEL[evento.tipo]}
                  </Typography>
                </div>
              </div>
              <Typography variant="caption" color="muted" className="whitespace-nowrap">
                {new Date(evento.data).toLocaleDateString("pt-BR", {
                  day: "2-digit",
                  month: "short",
                })}
              </Typography>
            </div>
          ))
        )}
      </Card.Body>
    </Card>
  );
}

/**
 * "Minha Empresa" — visão da própria empresa para Administrador/Gestor
 * (Dossiê 16), e também do dono autônomo/MEI em "Visão completa"
 * (Frente G/H — em "Modo Ação" ele nem vê este item de menu, vai direto
 * pra "Minha Rota"; a mesma regra vale pro Motorista/Monitor
 * funcionário, que nunca alcança esta página). Combina Painel +
 * Configurações em uma única tela com abas (Frente L): decisão
 * deliberada de escopo (ver relatório de entrega do módulo original) —
 * o Admin da própria empresa só tem UMA empresa para olhar, então não
 * há razão de negócio para rotas separadas como existe em `apps/admin`
 * (que lista N tenants). `companyId` vem da sessão real (Dossiê 15),
 * nunca mais de uma ponte de `localStorage`.
 */
export default function MinhaEmpresaPage(): JSX.Element {
  const { user } = useAuth();

  if (!user?.companyId) {
    return (
      <Typography variant="body" color="danger">
        Sua conta não está vinculada a nenhuma empresa.
      </Typography>
    );
  }

  return <MinhaEmpresaContent companyId={user.companyId} />;
}

function MinhaEmpresaContent({ companyId }: { companyId: string }): JSX.Element {
  const { data: company, isLoading, isError } = useMyCompany(companyId);
  const { data: dashboard } = useMyCompanyDashboard(companyId);
  const { data: settings } = useMyCompanySettings(companyId);
  const { data: fleet, isLoading: isFleetLoading } = useGpsMap();
  const updateCompany = useUpdateMyCompany(companyId);
  const updateSettings = useUpdateMyCompanySettings(companyId);

  const [aba, setAba] = useState<"painel" | "configuracoes">("painel");
  const [form, setForm] = useState<UpdateCompanyInput | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (company && !form) {
      setForm({
        razaoSocial: company.razaoSocial,
        nomeFantasia: company.nomeFantasia,
        email: company.email,
        telefone: company.telefone,
        whatsapp: company.whatsapp ?? "",
        cep: company.cep,
        endereco: company.endereco,
        numero: company.numero,
        complemento: company.complemento ?? "",
        bairro: company.bairro,
        cidade: company.cidade,
        estado: company.estado,
      });
    }
  }, [company, form]);

  function updateField<K extends keyof UpdateCompanyInput>(
    key: K,
    value: UpdateCompanyInput[K],
  ): void {
    setForm((current) => (current ? { ...current, [key]: value } : current));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    if (!form) return;
    setErrorMessage(null);
    try {
      await updateCompany.mutateAsync(form);
    } catch (error) {
      setErrorMessage(
        error instanceof ApiError ? error.message : "Erro inesperado ao salvar empresa.",
      );
    }
  }

  const fleetMarkers = useMemo<RottaMapMarker[]>(
    () =>
      (fleet ?? [])
        .filter((v): v is MapVehicle & { latitude: number; longitude: number } =>
          Boolean(v.latitude && v.longitude),
        )
        .map((v) => ({
          id: v.tripId,
          titulo: `${v.placa}: ${v.routeNome} (${v.motoristaNome})`,
          latitude: v.latitude,
          longitude: v.longitude,
          emMovimento: true,
        })),
    [fleet],
  );

  if (isLoading || !form) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !company) {
    return (
      <Typography variant="body" color="danger">
        Não foi possível carregar os dados da sua empresa.
      </Typography>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <Tabs
        tabs={[
          { id: "painel", label: "Painel" },
          { id: "configuracoes", label: "Configurações" },
        ]}
        activeId={aba}
        onChange={(id) => setAba(id as "painel" | "configuracoes")}
      />

      {aba === "painel" ? (
        <div className="flex flex-col gap-6">
          <PanelGreeting nome={company.nomeFantasia} />

          {/*
            Frente M (briefing "Marketplace" §"SOLICITAR TRANSPORTE") — o
            código que a transportadora compartilha com um Responsável que
            já sabe quem quer contratar, pra ele pular a busca por
            proximidade/escola e ir direto no Marketplace do app com o
            código em mãos.
          */}
          <Card>
            <Card.Body className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-1">
                <Typography variant="bodySmall" className="font-semibold">
                  Código da sua transportadora
                </Typography>
                <Typography variant="caption" color="muted">
                  Compartilhe com responsáveis que já sabem que querem contratar vocês: eles
                  informam esse código no app da Rotta em vez de buscar por proximidade.
                </Typography>
              </div>
              <Typography
                variant="title"
                className="rounded-md bg-primary/10 px-4 py-2 font-mono tracking-wide text-primary"
              >
                {company.codigoInterno}
              </Typography>
            </Card.Body>
          </Card>

          <TrialBanner status={company.status} trialExpiraEm={company.trialExpiraEm} />

          <PainelAtalhos />

          {dashboard && (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {[
                { label: "Motoristas", value: dashboard.motoristas },
                { label: "Responsáveis", value: dashboard.responsaveis },
                { label: "Alunos", value: dashboard.alunos },
                { label: "Veículos", value: dashboard.veiculos },
                { label: "Rotas", value: dashboard.rotas },
                { label: "Viagens", value: dashboard.viagens },
              ].map((metric) => (
                <Card key={metric.label}>
                  <Card.Body className="flex flex-col gap-1">
                    <Typography variant="caption" color="muted">
                      {metric.label}
                    </Typography>
                    <Typography variant="subtitle">{metric.value}</Typography>
                  </Card.Body>
                </Card>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <FrotaEmOperacaoCard ativos={fleet?.length ?? 0} total={dashboard?.veiculos ?? 0} />
            <Card>
              <Card.Body className="flex flex-col justify-center gap-1">
                <Typography variant="bodySmall" color="muted">
                  Receita estimada
                </Typography>
                <Typography variant="title">
                  {centsToBRL(dashboard?.receitaEstimadaCentavos ?? 0)}
                </Typography>
              </Card.Body>
            </Card>
            <Card>
              <Card.Body className="flex flex-col justify-center gap-1">
                <Typography variant="bodySmall" color="muted">
                  Documentos vencendo (7 dias)
                </Typography>
                <Typography
                  variant="title"
                  color={(dashboard?.documentosVencendo ?? 0) > 0 ? "danger" : undefined}
                >
                  {dashboard?.documentosVencendo ?? 0}
                </Typography>
              </Card.Body>
            </Card>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <Card>
              <Card.Header
                title="Frota ao vivo"
                action={
                  <Link
                    href="/veiculos/mapa"
                    className={buttonVariants({ variant: "secondary", size: "sm" })}
                  >
                    Ver mapa completo
                  </Link>
                }
              />
              <Card.Body className="flex flex-col gap-3">
                <Typography variant="bodySmall" color="muted">
                  {fleet?.length ?? 0} veículo(s) em viagem agora.
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
                  <div style={{ height: 280 }}>
                    <RottaMap markers={fleetMarkers} />
                  </div>
                )}
              </Card.Body>
            </Card>

            <ProximosEventos />
          </div>

          {dashboard && dashboard.alertas.length > 0 && (
            <Card>
              <Card.Header title="Alertas" />
              <Card.Body className="flex flex-col gap-2">
                {dashboard.alertas.map((alerta) => (
                  <Typography key={alerta} variant="bodySmall" color="danger">
                    {alerta}
                  </Typography>
                ))}
              </Card.Body>
            </Card>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <form onSubmit={(event) => void handleSubmit(event)} className="flex flex-col gap-6">
            <Card>
              <Card.Header title="Dados da empresa" />
              <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Razão social" isRequired>
                  <Input
                    required
                    value={form.razaoSocial}
                    onChange={(event) => updateField("razaoSocial", event.target.value)}
                  />
                </FormField>
                <FormField label="Nome fantasia" isRequired>
                  <Input
                    required
                    value={form.nomeFantasia}
                    onChange={(event) => updateField("nomeFantasia", event.target.value)}
                  />
                </FormField>
                <FormField label="Email" isRequired>
                  <Input
                    type="email"
                    required
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                  />
                </FormField>
                <FormField label="Telefone" isRequired>
                  <Input
                    required
                    value={form.telefone}
                    onChange={(event) => updateField("telefone", event.target.value)}
                  />
                </FormField>
                <FormField label="WhatsApp">
                  <Input
                    value={form.whatsapp}
                    onChange={(event) => updateField("whatsapp", event.target.value)}
                  />
                </FormField>
              </Card.Body>
            </Card>

            <Card>
              <Card.Header title="Endereço" />
              <Card.Body className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="CEP" isRequired>
                  <Input
                    required
                    value={form.cep}
                    onChange={(event) => updateField("cep", event.target.value)}
                  />
                </FormField>
                <FormField label="Endereço" isRequired>
                  <Input
                    required
                    value={form.endereco}
                    onChange={(event) => updateField("endereco", event.target.value)}
                  />
                </FormField>
                <FormField label="Número" isRequired>
                  <Input
                    required
                    value={form.numero}
                    onChange={(event) => updateField("numero", event.target.value)}
                  />
                </FormField>
                <FormField label="Complemento">
                  <Input
                    value={form.complemento}
                    onChange={(event) => updateField("complemento", event.target.value)}
                  />
                </FormField>
                <FormField label="Bairro" isRequired>
                  <Input
                    required
                    value={form.bairro}
                    onChange={(event) => updateField("bairro", event.target.value)}
                  />
                </FormField>
                <FormField label="Cidade" isRequired>
                  <Input
                    required
                    value={form.cidade}
                    onChange={(event) => updateField("cidade", event.target.value)}
                  />
                </FormField>
                <FormField label="Estado (UF)" isRequired>
                  <Input
                    required
                    maxLength={2}
                    value={form.estado}
                    onChange={(event) => updateField("estado", event.target.value.toUpperCase())}
                  />
                </FormField>
              </Card.Body>
              <Card.Footer>
                {errorMessage && (
                  <Typography variant="bodySmall" color="danger" className="mr-auto">
                    {errorMessage}
                  </Typography>
                )}
                <Button type="submit" variant="primary" isLoading={updateCompany.isPending}>
                  Salvar alterações
                </Button>
              </Card.Footer>
            </Card>
          </form>

          {settings && (
            <Card>
              <Card.Header title="Configurações" />
              <Card.Body className="flex flex-col gap-4">
                <FormField label="Tema">
                  <Select
                    className="max-w-xs"
                    value={settings.tema}
                    onChange={(event) =>
                      updateSettings.mutate({ tema: event.target.value as "dark" | "light" })
                    }
                  >
                    <option value="dark">Escuro</option>
                    <option value="light">Claro</option>
                  </Select>
                </FormField>
                <Typography variant="caption" color="muted">
                  Canais de notificação: {settings.canaisNotificacao.join(", ") || "nenhum"}
                </Typography>
              </Card.Body>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
