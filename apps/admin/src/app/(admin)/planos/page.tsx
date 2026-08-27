"use client";

import {
  Badge,
  Button,
  Card,
  ErrorState,
  Modal,
  Pagination,
  Select,
  Spinner,
  Textarea,
  Typography,
} from "@rotta/ui/web";
import { useState } from "react";

import type { Company, CompanyStatus } from "@rotta/api-client";
import type { BadgeVariant } from "@rotta/ui/web";

import { CompanyStatusBadge } from "@/features/companies/components/company-status-badge";
import {
  useCompaniesList,
  useReactivateCompany,
  useSuspendCompany,
} from "@/features/companies/hooks/use-companies";
import {
  useCreatePlanNotice,
  usePlanNoticesList,
  useSetPlanNoticeAtivo,
} from "@/features/plan-notices/hooks/use-plan-notices";

/**
 * Controle de Planos (Dossiê 26, painel Admin) — pedido do usuário:
 * "controle de planos para sabermos quais planos estão ativos,
 * expirados. Os admins poderão ativar planos dos usuários, desativar
 * planos, propor avisos de cada plano". Duas seções nesta página:
 *
 * 1. Empresas — status do plano + prazo do trial (contagem calculada a
 *    partir de `trialExpiraEm`), com os mesmos botões Suspender/Reativar
 *    já usados em `/empresas/[id]` (aqui, direto da lista).
 * 2. Avisos de plano — CRUD de `PlanNotice` (global ou por empresa
 *    específica), distinto de `/avisos` (`Announcement`, broadcast por
 *    papel, sem `companyId`).
 */
export default function PlanosPage(): JSX.Element {
  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-1">
        <Typography variant="title">Controle de Planos</Typography>
        <Typography variant="body" color="muted">
          Status do plano de cada empresa (trial, ativo, inadimplente, suspenso) e avisos publicados
          sobre o plano.
        </Typography>
      </div>

      <CompanyPlansSection />
      <PlanNoticesSection />
    </div>
  );
}

const STATUS_OPTIONS: { value: CompanyStatus | ""; label: string }[] = [
  { value: "", label: "Todos os status" },
  { value: "TRIAL", label: "Trial" },
  { value: "ATIVO", label: "Ativo" },
  { value: "INADIMPLENTE", label: "Inadimplente" },
  { value: "SUSPENSO", label: "Suspenso" },
  { value: "CANCELADO", label: "Cancelado" },
];

function CompanyPlansSection(): JSX.Element {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<CompanyStatus | "">("");
  const { data, isLoading, isError, refetch, isFetching } = useCompaniesList({
    page,
    pageSize: 20,
    search: search || undefined,
    status: status || undefined,
  });

  return (
    <Card>
      <Card.Header title="Empresas" />
      <Card.Body className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="search"
            value={search}
            onChange={(event) => {
              setPage(1);
              setSearch(event.target.value);
            }}
            placeholder="Buscar por razão social, nome fantasia ou CNPJ..."
            className="h-11 w-full max-w-md rounded-md border border-border bg-surface px-4 text-sm text-text placeholder:text-placeholder outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <Select
            className="w-full max-w-[220px]"
            value={status}
            onChange={(event) => {
              setPage(1);
              setStatus(event.target.value as CompanyStatus | "");
            }}
          >
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <ErrorState
            message="Não foi possível carregar as empresas."
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
        ) : data && data.items.length === 0 ? (
          <Typography variant="body" color="muted">
            Nenhuma empresa encontrada.
          </Typography>
        ) : (
          <div className="divide-y divide-border">
            {data?.items.map((company) => (
              <CompanyPlanRow key={company.id} company={company} />
            ))}
          </div>
        )}

        {data && data.total > data.pageSize && (
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={setPage}
          />
        )}
      </Card.Body>
    </Card>
  );
}

const MS_DIA = 24 * 60 * 60 * 1000;

/** Prazo do trial, calculado a partir de `trialExpiraEm` — `null` fora do trial ou sem prazo definido. */
function trialCountdown(company: Company): { texto: string; variant: BadgeVariant } | null {
  if (company.status !== "TRIAL" || !company.trialExpiraEm) return null;

  const diasRestantes = Math.ceil(
    (new Date(company.trialExpiraEm).getTime() - Date.now()) / MS_DIA,
  );

  if (diasRestantes > 0) {
    return {
      texto: `Expira em ${diasRestantes} dia${diasRestantes === 1 ? "" : "s"}`,
      variant: "info",
    };
  }
  const diasVencido = Math.abs(diasRestantes);
  return {
    texto:
      diasVencido === 0
        ? "Vence hoje"
        : `Expirado há ${diasVencido} dia${diasVencido === 1 ? "" : "s"}`,
    variant: diasVencido > 0 ? "danger" : "warning",
  };
}

function CompanyPlanRow({ company }: { company: Company }): JSX.Element {
  const suspend = useSuspendCompany(company.id);
  const reactivate = useReactivateCompany(company.id);
  const [suspendModalOpen, setSuspendModalOpen] = useState(false);
  const [motivo, setMotivo] = useState("");
  const countdown = trialCountdown(company);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div className="flex flex-col gap-0.5">
        <Typography variant="body" className="font-semibold">
          {company.nomeFantasia}
        </Typography>
        <Typography variant="caption" color="muted">
          {company.cpfCnpj} · {company.plan.name}
        </Typography>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <CompanyStatusBadge status={company.status} />
        {countdown && <Badge variant={countdown.variant}>{countdown.texto}</Badge>}
        {company.status === "SUSPENSO" ? (
          <Button
            variant="primary"
            size="sm"
            isLoading={reactivate.isPending}
            onClick={() => reactivate.mutate()}
          >
            Reativar
          </Button>
        ) : (
          <Button variant="danger" size="sm" onClick={() => setSuspendModalOpen(true)}>
            Suspender
          </Button>
        )}
      </div>

      <Modal isOpen={suspendModalOpen} onClose={() => setSuspendModalOpen(false)}>
        <Modal.Header onClose={() => setSuspendModalOpen(false)}>
          Suspender {company.nomeFantasia}
        </Modal.Header>
        <Modal.Body>
          <Textarea
            placeholder="Motivo da suspensão"
            value={motivo}
            onChange={(event) => setMotivo(event.target.value)}
            rows={3}
          />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="ghost" onClick={() => setSuspendModalOpen(false)}>
            Cancelar
          </Button>
          <Button
            variant="danger"
            isLoading={suspend.isPending}
            onClick={() => {
              if (!motivo.trim()) return;
              suspend.mutate(motivo);
              setSuspendModalOpen(false);
              setMotivo("");
            }}
          >
            Suspender
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

function PlanNoticesSection(): JSX.Element {
  const [page, setPage] = useState(1);
  const { data, isLoading, isError, refetch, isFetching } = usePlanNoticesList({
    page,
    pageSize: 10,
  });
  const setAtivo = useSetPlanNoticeAtivo();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  return (
    <Card>
      <Card.Header
        title="Avisos de plano"
        action={<Button onClick={() => setCreateModalOpen(true)}>Novo aviso</Button>}
      />
      <Card.Body className="flex flex-col gap-4">
        <Typography variant="caption" color="muted">
          Avisos escritos pelo Admin Rotta sobre o plano de uma empresa — promoções ou qualquer
          outro assunto. Podem ser globais (todas as empresas veem) ou de uma empresa específica.
        </Typography>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : isError ? (
          <ErrorState
            message="Não foi possível carregar os avisos."
            onRetry={() => void refetch()}
            isRetrying={isFetching}
          />
        ) : data && data.items.length === 0 ? (
          <Typography variant="body" color="muted">
            Nenhum aviso criado ainda.
          </Typography>
        ) : (
          <div className="divide-y divide-border">
            {data?.items.map((notice) => (
              <div
                key={notice.id}
                className="flex flex-wrap items-start justify-between gap-3 py-4"
              >
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <Typography variant="body" className="font-semibold">
                      {notice.titulo}
                    </Typography>
                    <Badge variant={notice.companyId ? "neutral" : "info"}>
                      {notice.companyId ? (notice.companyNomeFantasia ?? "Empresa") : "Global"}
                    </Badge>
                    <Badge variant={notice.ativo ? "success" : "neutral"}>
                      {notice.ativo ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                  <Typography variant="bodySmall" color="muted">
                    {notice.corpo}
                  </Typography>
                  <Typography variant="caption" color="muted">
                    Por {notice.criadoPorNome} em{" "}
                    {new Date(notice.createdAt).toLocaleDateString("pt-BR")}
                  </Typography>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  isLoading={setAtivo.isPending}
                  onClick={() => setAtivo.mutate({ id: notice.id, ativo: !notice.ativo })}
                >
                  {notice.ativo ? "Desativar" : "Ativar"}
                </Button>
              </div>
            ))}
          </div>
        )}

        {data && data.total > data.pageSize && (
          <Pagination
            page={data.page}
            pageSize={data.pageSize}
            total={data.total}
            onPageChange={setPage}
          />
        )}
      </Card.Body>

      <CreatePlanNoticeModal isOpen={createModalOpen} onClose={() => setCreateModalOpen(false)} />
    </Card>
  );
}

function CreatePlanNoticeModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}): JSX.Element {
  const { data: companies } = useCompaniesList({ page: 1, pageSize: 200 });
  const create = useCreatePlanNotice();
  const [titulo, setTitulo] = useState("");
  const [corpo, setCorpo] = useState("");
  const [companyId, setCompanyId] = useState("");

  function handleClose(): void {
    setTitulo("");
    setCorpo("");
    setCompanyId("");
    onClose();
  }

  function handleCreate(): void {
    if (!titulo.trim() || !corpo.trim()) return;
    create.mutate({ titulo, corpo, companyId: companyId || undefined }, { onSuccess: handleClose });
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
      <Modal.Header onClose={handleClose}>Novo aviso de plano</Modal.Header>
      <Modal.Body className="flex flex-col gap-3">
        <input
          value={titulo}
          onChange={(event) => setTitulo(event.target.value)}
          placeholder="Título"
          className="h-11 w-full rounded-md border border-border bg-surface px-4 text-sm text-text placeholder:text-placeholder outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
        />
        <Textarea
          value={corpo}
          onChange={(event) => setCorpo(event.target.value)}
          placeholder="Mensagem do aviso"
          rows={4}
        />
        <Select value={companyId} onChange={(event) => setCompanyId(event.target.value)}>
          <option value="">Global (todas as empresas)</option>
          {companies?.items.map((company) => (
            <option key={company.id} value={company.id}>
              {company.nomeFantasia}
            </option>
          ))}
        </Select>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="ghost" onClick={handleClose}>
          Cancelar
        </Button>
        <Button isLoading={create.isPending} onClick={handleCreate}>
          Publicar
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
