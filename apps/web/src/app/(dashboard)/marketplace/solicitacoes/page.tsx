"use client";

import { Card, ErrorState, Pagination, Select, Spinner, Table, Typography } from "@rotta/ui/web";
import { useState } from "react";

import type { TransportRequest, TransportRequestStatus } from "@rotta/api-client";

import { TransportRequestStatusBadge } from "@/features/marketplace/components/transport-request-status-badge";
import { useTransportRequestsList } from "@/features/marketplace/hooks/use-marketplace";

const STATUS_OPTIONS: TransportRequestStatus[] = ["RECEBIDA", "EM_ANALISE", "APROVADA", "RECUSADA"];

/**
 * Listagem de solicitações de transporte recebidas (briefing
 * "Marketplace" §"SOLICITAR TRANSPORTE") — visão da própria Empresa/
 * Gestor (RBAC do backend já restringe ao `companyId` do ator, nunca um
 * filtro aqui).
 */
export default function SolicitacoesTransportePage(): JSX.Element {
  const [status, setStatus] = useState<TransportRequestStatus | "">("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const { data, isLoading, isError, refetch, isFetching } = useTransportRequestsList({
    status: status || undefined,
    page,
    pageSize,
  });

  return (
    <div className="flex flex-col gap-6">
      <Typography variant="title">Solicitações de Transporte</Typography>
      <Typography variant="bodySmall" color="muted">
        Famílias que solicitaram transporte com a sua empresa pelo Marketplace da Rotta.
      </Typography>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <Select
              value={status}
              onChange={(event) => {
                setPage(1);
                setStatus(event.target.value as TransportRequestStatus | "");
              }}
            >
              <option value="">Todos os status</option>
              {STATUS_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {value}
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
              message="Não foi possível carregar as solicitações."
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          ) : data && data.items.length === 0 ? (
            <Typography variant="body" color="muted">
              Nenhuma solicitação de transporte recebida ainda.
            </Typography>
          ) : (
            data && (
              <>
                <Table<TransportRequest>
                  columns={[
                    {
                      key: "studentNome",
                      header: "Aluno",
                      render: (request) => request.studentNome ?? "—",
                    },
                    {
                      key: "responsavelNome",
                      header: "Responsável",
                      render: (request) => request.responsavelNome ?? "—",
                    },
                    {
                      key: "schoolNome",
                      header: "Escola",
                      render: (request) => request.schoolNome ?? "—",
                    },
                    {
                      key: "createdAt",
                      header: "Recebida em",
                      render: (request) => new Date(request.createdAt).toLocaleDateString("pt-BR"),
                    },
                    {
                      key: "status",
                      header: "Status",
                      render: (request) => <TransportRequestStatusBadge status={request.status} />,
                    },
                  ]}
                  rows={data.items}
                  keyExtractor={(request) => request.id}
                  onRowClick={(request) => {
                    window.location.href = `/marketplace/solicitacoes/${request.id}`;
                  }}
                />
                <Pagination
                  page={page}
                  pageSize={pageSize}
                  total={data.total}
                  onPageChange={setPage}
                />
              </>
            )
          )}
        </Card.Body>
      </Card>
    </div>
  );
}
