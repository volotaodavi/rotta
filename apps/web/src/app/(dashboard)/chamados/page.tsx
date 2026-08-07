"use client";

import { Button, Card, Spinner, Typography } from "@rotta/ui/web";
import Link from "next/link";

import { SupportTicketStatusBadge } from "@/features/support/components/support-ticket-status-badge";
import { useSupportTickets } from "@/features/support/hooks/use-support";

/**
 * Histórico de chamados (`SUP-01`/`SUP-03`) — "um tenant só visualiza
 * seus próprios tickets" (escopado no backend via `SupportService`,
 * nunca reforçado apenas aqui).
 */
export default function SuportePage(): JSX.Element {
  const { data, isLoading, isError } = useSupportTickets({ page: 1, pageSize: 50 });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <Typography variant="title">Suporte</Typography>
        <Link href="/chamados/novo">
          <Button variant="primary">+ Novo chamado</Button>
        </Link>
      </div>

      <Card>
        {isLoading ? (
          <Card.Body className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </Card.Body>
        ) : isError ? (
          <Card.Body>
            <Typography variant="body" color="danger">
              Não foi possível carregar seus chamados. Tente novamente.
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
                href={`/chamados/${ticket.id}`}
                className="flex items-center justify-between gap-4 px-6 py-4 transition-colors hover:bg-muted"
              >
                <div className="flex flex-col gap-0.5">
                  <Typography variant="body" className="font-semibold">
                    {ticket.assunto}
                  </Typography>
                  <Typography variant="caption" color="muted">
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
