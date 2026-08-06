"use client";

import { ApiError } from "@rotta/api-client";
import { useAuth } from "@rotta/auth/web";
import { Sparkles } from "@rotta/icons";
import { Badge, Button, Card, FormField, Input, Select, Spinner, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";

import type { Company, UpdateCompanyInput } from "@rotta/api-client";

import {
  useMyCompany,
  useMyCompanyDashboard,
  useMyCompanySettings,
  useUpdateMyCompany,
  useUpdateMyCompanySettings,
} from "@/features/company/hooks/use-company";


/**
 * Banner de assinatura (briefing "PLANO" — Dossiê 26: cadastro
 * self-service SEMPRE é permitido; a cobrança acontece depois, aqui,
 * nunca bloqueando a criação da conta). Mostrado enquanto
 * `company.status === "TRIAL"` — nunca finge uma data de expiração
 * (não existe nenhum campo de prazo de trial no schema hoje, ver
 * `Company` no Prisma) nem um botão de "assinar agora" que cobraria de
 * verdade (a Rotta Pay/Lytex ainda não processa esta cobrança
 * recorrente) — só direciona para `/planos`, a mesma página pública
 * que já mostra o valor real (R$ 39,90/mês).
 */
function TrialBanner({ status }: { status: Company["status"] }): JSX.Element | null {
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
        <Link href="/planos" target="_blank" className="shrink-0">
          <Button variant="primary">Ver plano</Button>
        </Link>
      </Card.Body>
    </Card>
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
  const updateCompany = useUpdateMyCompany(companyId);
  const updateSettings = useUpdateMyCompanySettings(companyId);

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

      <TrialBanner status={company.status} />

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

      {dashboard && (
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
