"use client";

import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import { ExternalLink, Sparkles, X } from "@rotta/icons";
import { RottaMap, type RottaMapMarker } from "@rotta/maps/web";
import { Badge, Button, Card, FormField, Input, Select, Spinner, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

import type { Company, MapVehicle, UpdateCompanyInput } from "@rotta/api-client";

import {
  useCreateCheckout,
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
 * `company.status === "TRIAL"` — nunca finge uma data de expiração
 * (não existe nenhum campo de prazo de trial no schema hoje, ver
 * `Company` no Prisma). "Assinar agora" abre um checkout REAL da
 * AbacatePay (`useCreateCheckout`/`CheckoutModal` abaixo) — só chamado
 * para Empresa/Gestor (esta página nunca é alcançada por Responsável,
 * que não tem `Company`/plano, ver `MinhaEmpresaPage`).
 */
function TrialBanner({
  status,
  onSubscribe,
  isLoading,
}: {
  status: Company["status"];
  onSubscribe: () => void;
  isLoading: boolean;
}): JSX.Element | null {
  if (status !== "TRIAL") return null;

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
            </div>
            <Typography variant="bodySmall" color="muted">
              Sua empresa está em período de teste gratuito. Assine o plano Rotta — R$ 39,90/mês —
              para continuar usando a plataforma sem interrupções.
            </Typography>
          </div>
        </div>
        <Button variant="primary" className="shrink-0" onClick={onSubscribe} isLoading={isLoading}>
          Assinar agora — R$ 39,90/mês
        </Button>
      </Card.Body>
    </Card>
  );
}

/**
 * Checkout embutido (briefing "pagar sem sair do site") — abre a página
 * hospedada da AbacatePay dentro de um modal/iframe no próprio domínio
 * da Rotta. Honestidade sobre o limite real: a AbacatePay não documenta
 * `frame-ancestors`/`X-Frame-Options` da página de checkout, então o
 * iframe pode aparecer em branco se ela bloquear ser embutida — por
 * isso "Abrir em nova aba" fica sempre visível, nunca escondido atrás
 * de um erro que talvez nunca dispare (um bloqueio de frame não gera
 * evento de erro detectável em JS).
 */
function CheckoutModal({ url, onClose }: { url: string; onClose: () => void }): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="flex h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg bg-white shadow-xl dark:bg-neutral-900">
        <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3 dark:border-neutral-700">
          <Typography variant="subtitle">Assinar plano Rotta</Typography>
          <div className="flex items-center gap-3">
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir em nova aba
            </a>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="rounded p-1 text-neutral-500 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
        <iframe src={url} title="Checkout AbacatePay" className="h-full w-full flex-1 border-0" />
      </div>
    </div>
  );
}

function centsToBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/**
 * "Minha Empresa" — visão da própria empresa para Administrador/Gestor
 * (Dossiê 16). Combina Detalhes + Editar + Dashboard + Configurações em
 * uma única tela: decisão deliberada de escopo (ver relatório de
 * entrega do módulo) — o Admin da própria empresa só tem UMA empresa
 * para olhar, então não há razão de negócio para 4 rotas separadas
 * como existe em `apps/admin` (que lista N tenants). `companyId` vem
 * da sessão real (Dossiê 15), nunca mais de uma ponte de `localStorage`.
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
  const createCheckout = useCreateCheckout();
  const router = useRouter();
  const searchParams = useSearchParams();

  const [form, setForm] = useState<UpdateCompanyInput | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Retorno do checkout hospedado (`completionUrl`/`returnUrl`, ver
  // `BillingService.createCheckoutForCompany`) — o webhook da AbacatePay
  // é a fonte de verdade do `status`, este `?billing=success` só limpa
  // a URL e força um refetch para o usuário ver o novo status sem
  // precisar recarregar a página manualmente.
  useEffect(() => {
    if (searchParams.get("billing") === "success") {
      setCheckoutUrl(null);
      router.replace("/empresa");
    }
  }, [searchParams, router]);

  async function handleSubscribe(): Promise<void> {
    setCheckoutError(null);
    try {
      const result = await createCheckout.mutateAsync({
        returnUrl: `${window.location.origin}/empresa`,
      });
      setCheckoutUrl(result.url);
    } catch (error) {
      setCheckoutError(
        error instanceof ApiError ? error.message : "Não foi possível iniciar o pagamento.",
      );
    }
  }

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
          titulo: `${v.placa} — ${v.routeNome} (${v.motoristaNome})`,
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
      <Typography variant="title">Minha empresa</Typography>

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
              Compartilhe com responsáveis que já sabem que querem contratar vocês — eles informam
              esse código no app da Rotta em vez de buscar por proximidade.
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

      <TrialBanner
        status={company.status}
        onSubscribe={() => void handleSubscribe()}
        isLoading={createCheckout.isPending}
      />
      {checkoutError && (
        <Typography variant="bodySmall" color="danger">
          {checkoutError}
        </Typography>
      )}
      {checkoutUrl && <CheckoutModal url={checkoutUrl} onClose={() => setCheckoutUrl(null)} />}

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

      <Card>
        <Card.Header
          title="Frota ao vivo"
          action={
            <Link href="/veiculos/mapa">
              <Button variant="secondary" size="sm">
                Ver mapa completo
              </Button>
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
            <div style={{ height: 320 }}>
              <RottaMap markers={fleetMarkers} />
            </div>
          )}
        </Card.Body>
      </Card>

      {dashboard && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Card>
            <Card.Body className="flex items-center justify-between">
              <Typography variant="bodySmall" color="muted">
                Receita estimada
              </Typography>
              <Typography variant="subtitle">
                {centsToBRL(dashboard.receitaEstimadaCentavos)}
              </Typography>
            </Card.Body>
          </Card>
          <Card>
            <Card.Body className="flex items-center justify-between">
              <Typography variant="bodySmall" color="muted">
                Documentos vencendo (7 dias)
              </Typography>
              <Typography
                variant="subtitle"
                color={dashboard.documentosVencendo > 0 ? "danger" : undefined}
              >
                {dashboard.documentosVencendo}
              </Typography>
            </Card.Body>
          </Card>
        </div>
      )}

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
  );
}
