"use client";

import { Card, Select, Spinner, Typography } from "@rotta/ui/web";
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
  const { data, isLoading, isError } = useSupportTickets({
    page: 1,
    pageSize: 50,
    status: status || undefined,
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Typography variant="title">Central de Atendimento</Typography>
      </div>

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

      <Card>
        {isLoading ? (
          <Card.Body className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </Card.Body>
        ) : isError ? (
          <Card.Body>
            <Typography variant="body" color="danger">
              Não foi possível carregar os chamados. Tente novamente.
            </Typography>
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
                  <Typography variant="body" className="font-semibold">
                    {ticket.assunto}
                  </Typography>
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
