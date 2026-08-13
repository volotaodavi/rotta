"use client";

import { Badge, Button, Card, Spinner, Typography, buttonVariants } from "@rotta/ui/web";
import Link from "next/link";
import { useState } from "react";

import { CompanyStatusBadge } from "@/features/companies/components/company-status-badge";
import { useCompaniesList } from "@/features/companies/hooks/use-companies";

/**
 * Listagem de empresas (tenants) — visão exclusiva do Admin Rotta
 * (Dossiê 16, Seção 5.1). Diferente de `apps/web`, aqui o Admin enxerga
 * TODAS as empresas cadastradas na plataforma, não apenas a própria.
 */
export default function EmpresasListPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const { data, isLoading, isError } = useCompaniesList({
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
          <Card.Body className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </Card.Body>
        ) : isError ? (
          <Card.Body>
            <Typography variant="body" color="danger">
              Não foi possível carregar as empresas. Tente novamente.
            </Typography>
          </Card.Body>
        ) : data && data.items.length === 0 ? (
          <Card.Body>
            <Typography variant="body" color="muted">
              Nenhuma empresa encontrada.
            </Typography>
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
            Página {data.page} de {Math.ceil(data.total / data.pageSize)} — {data.total} empresas
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
