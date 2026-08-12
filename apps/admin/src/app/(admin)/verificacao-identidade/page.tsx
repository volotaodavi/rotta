"use client";

import { Button, Card, Select, Spinner, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useState } from "react";

import type { IdentityVerificationStatus } from "@rotta/api-client";

import { IdentityVerificationStatusBadge } from "@/features/identity-verification/components/identity-verification-status-badge";
import { useIdentityVerificationsList } from "@/features/identity-verification/hooks/use-identity-verification-admin";


const STATUS_OPTIONS: Array<{ value: IdentityVerificationStatus | ""; label: string }> = [
  { value: "", label: "Todos os status" },
  { value: "EM_ANDAMENTO", label: "Em andamento" },
  { value: "EM_ANALISE", label: "Em análise" },
  { value: "APROVADA", label: "Aprovada" },
  { value: "REPROVADA", label: "Reprovada" },
  { value: "EXPIRADA", label: "Expirada" },
];

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("pt-BR");
}

/**
 * Verificação de Identidade (Admin Rotta) — todos os usuários (Motorista/
 * Empresa-Gestor) que já iniciaram ao menos uma sessão Didit, com o
 * status/motivo já persistidos na Rotta. A tela de detalhe é onde o
 * admin sincroniza (pull) com a Didit e decide manualmente (aprovar/
 * recusar) sem precisar abrir o Business Console dela.
 */
export default function VerificacaoIdentidadeListPage(): JSX.Element {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<IdentityVerificationStatus | "">("");

  const { data, isLoading, isError } = useIdentityVerificationsList({
    page,
    pageSize: 20,
    search: search || undefined,
    status: status || undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <Typography variant="title">Verificação de Identidade</Typography>
        <Typography variant="bodySmall" color="muted">
          Motorista e Empresa/Gestor verificando a própria identidade via Didit — sincronize com a
          Didit ou decida (aprove/recuse) direto por aqui, sem abrir o Business Console dela.
        </Typography>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <input
          type="search"
          value={search}
          onChange={(event) => {
            setPage(1);
            setSearch(event.target.value);
          }}
          placeholder="Buscar por nome, e-mail ou CPF..."
          className="h-11 w-full max-w-md rounded-md border border-border bg-surface px-4 text-sm text-text placeholder:text-placeholder outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
        />
        <Select
          className="w-full max-w-[220px]"
          value={status}
          onChange={(event) => {
            setPage(1);
            setStatus(event.target.value as IdentityVerificationStatus | "");
          }}
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        {isLoading ? (
          <Card.Body className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </Card.Body>
        ) : isError ? (
          <Card.Body>
            <Typography variant="body" color="danger">
              Não foi possível carregar as verificações de identidade. Tente novamente.
            </Typography>
          </Card.Body>
        ) : data && data.items.length === 0 ? (
          <Card.Body>
            <Typography variant="body" color="muted">
              Nenhuma verificação de identidade encontrada.
            </Typography>
          </Card.Body>
        ) : (
          <div className="divide-y divide-border">
            {data?.items.map((item) => (
              <Link
                key={item.userId}
                href={`/verificacao-identidade/${item.userId}`}
                className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-muted"
              >
                <div className="flex flex-col gap-0.5">
                  <Typography variant="body" className="font-semibold">
                    {item.nome}
                  </Typography>
                  <Typography variant="caption" color="muted">
                    {item.email}
                    {item.companyName ? ` · ${item.companyName}` : ""}
                  </Typography>
                  {item.status === "REPROVADA" && item.motivo && (
                    <Typography
                      variant="caption"
                      color="danger"
                      className="mt-0.5 max-w-md truncate"
                    >
                      {item.motivo}
                    </Typography>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1">
                  <IdentityVerificationStatusBadge status={item.status} />
                  <Typography variant="caption" color="muted">
                    Atualizado {formatDate(item.updatedAt)}
                  </Typography>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {data && data.total > data.pageSize && (
        <div className="flex items-center justify-between">
          <Typography variant="caption" color="muted">
            Página {data.page} de {Math.ceil(data.total / data.pageSize)} — {data.total}{" "}
            verificações
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
