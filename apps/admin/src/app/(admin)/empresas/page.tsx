"use client";

import { Building2 } from "@rotta/icons";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  ErrorState,
  TableSkeleton,
  Typography,
  buttonVariants,
} from "@rotta/ui/web";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

import { CompanyStatusBadge } from "@/features/companies/components/company-status-badge";
import { useCompaniesList } from "@/features/companies/hooks/use-companies";

/**
 * Listagem de empresas (tenants) — visão exclusiva do Admin Rotta
 * (Dossiê 16, Seção 5.1). Diferente de `apps/web`, aqui o Admin enxerga
 * TODAS as empresas cadastradas na plataforma, não apenas a própria.
 *
 * `?search=` na URL (lido só na primeira renderização, via
 * `useState(() => ...)`) — chega aqui pela busca do cabeçalho
 * (`(admin)/layout.tsx#TopbarSearch`): sem isso, aquela busca navegaria
 * pra cá mas o campo apareceria vazio, obrigando a digitar de novo.
 */
export default function EmpresasListPage(): JSX.Element {
  const searchParams = useSearchParams();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState(() => searchParams.get("search") ?? "");
  const { data, isLoading, isError, refetch, isFetching } = useCompaniesList({
    page,
    pageSize: 20,
    search: search || undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Typography variant="title">Empresas</Typography>
        <Link href="/empresas/nova" className={buttonVariants({ variant: "primary" })}>
          Nova empresa
        </Link>
      </div>

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

      <Card>
        {isLoading ? (
          <Card.Body>
            <TableSkeleton columns={3} className="border-none" />
          </Card.Body>
        ) : isError ? (
          <Card.Body>
            <ErrorState
              message="Não foi possível carregar as empresas."
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          </Card.Body>
        ) : data && data.items.length === 0 ? (
          <Card.Body>
            <EmptyState
              icon={Building2}
              title="Nenhuma empresa encontrada."
              description="Ajuste a busca acima ou cadastre uma nova empresa."
            />
          </Card.Body>
        ) : (
          <div className="divide-y divide-border">
            {data?.items.map((company) => (
              <Link
                key={company.id}
                href={`/empresas/${company.id}`}
                className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-muted"
              >
                <div className="flex flex-col gap-0.5">
                  <Typography variant="body" className="font-semibold">
                    {company.nomeFantasia}
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {company.cpfCnpj} · {company.cidade}/{company.estado}
                  </Typography>
                </div>
                <div className="flex items-center gap-3">
                  <Badge variant="neutral">{company.plan.name}</Badge>
                  <CompanyStatusBadge status={company.status} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between">
          <Typography variant="caption" color="muted">
            Página {data.page} de {Math.ceil(data.total / data.pageSize)}, {data.total} empresas
          </Typography>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              isDisabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              isDisabled={page >= Math.ceil(data.total / data.pageSize)}
              onClick={() => setPage((current) => current + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
