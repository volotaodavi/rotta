"use client";

import { Card, ErrorState, Select, Spinner, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useState } from "react";

import type { SupportTicketStatus } from "@rotta/api-client";

import { SupportTicketStatusBadge } from "@/features/support/components/support-ticket-status-badge";
import { useSupportTickets } from "@/features/support/hooks/use-support";


/**
 * Central de Atendimento — visão Admin Rotta (`ADM-04`/Dossiê 20 —
 * "é a visão administrativa de SUP-01/SUP-02... Admin Rotta visualiza
 * todos"). Sem filtro de `companyId`: lista os chamados de TODOS os
 * tenants.
 */
export default function SuportePage(): JSX.Element {
  const [status, setStatus] = useState<SupportTicketStatus | "">("");
  const [arquivado, setArquivado] = useState(false);
  const { data, isLoading, isError, refetch, isFetching } = useSupportTickets({
    page: 1,
    pageSize: 50,
    status: status || undefined,
    arquivado,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Typography variant="title">Central de Atendimento</Typography>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select
          value={status}
          onChange={(event) => setStatus(event.target.value as SupportTicketStatus | "")}
          className="max-w-xs"
        >
          <option value="">Todos os status</option>
          <option value="ABERTO">Aberto</option>
          <option value="EM_ANDAMENTO">Em andamento</option>
          <option value="ENCERRADO">Encerrado</option>
        </Select>

        {/* Arquivados ficam fora do caminho padrão (pedido do usuário 02/09/2026) — só aparecem aqui. */}
        <div className="flex gap-1 rounded-lg border border-border p-1">
          <button
            type="button"
            onClick={() => setArquivado(false)}
            className={`rounded-md px-3 py-1.5 text-sm ${!arquivado ? "bg-primary text-white" : "text-text-muted"}`}
          >
            Ativos
          </button>
          <button
            type="button"
            onClick={() => setArquivado(true)}
            className={`rounded-md px-3 py-1.5 text-sm ${arquivado ? "bg-primary text-white" : "text-text-muted"}`}
          >
            Arquivados
          </button>
        </div>
      </div>

      <Card>
        {isLoading ? (
          <Card.Body className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </Card.Body>
        ) : isError ? (
          <Card.Body>
            <ErrorState
              message="Não foi possível carregar os chamados."
              onRetry={() => void refetch()}
              isRetrying={isFetching}
            />
          </Card.Body>
        ) : data && data.items.length === 0 ? (
          <Card.Body>
            <Typography variant="body" color="muted">
              Nenhum chamado registrado ainda.
            </Typography>
          </Card.Body>
        ) : (
          <div className="divide-y divide-border">
            {data?.items.map((ticket) => (
              <Link
                key={ticket.id}
                href={`/suporte/${ticket.id}?companyId=${ticket.companyId}`}
                className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-muted"
              >
                <div className="flex flex-col gap-0.5">
                  <div className="flex items-center gap-2">
                    <Typography variant="body" className="font-semibold">
                      {ticket.assunto}
                    </Typography>
                    {ticket.protocolo && (
                      <Typography variant="caption" color="muted" className="font-mono">
                        {ticket.protocolo}
                      </Typography>
                    )}
                  </div>
                  <Typography variant="caption" color="muted">
                    {ticket.companyNome} · {ticket.abertoPorNome} ·{" "}
                    {new Date(ticket.createdAt).toLocaleDateString("pt-BR")}
                  </Typography>
                </div>
                <SupportTicketStatusBadge status={ticket.status} />
              </Link>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
