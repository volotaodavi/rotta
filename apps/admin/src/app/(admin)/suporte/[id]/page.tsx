"use client";

import { Button, Card, Spinner, Typography } from "@rotta/ui/web";
import { useParams, useSearchParams } from "next/navigation";
import { useState } from "react";

import { SupportTicketStatusBadge } from "@/features/support/components/support-ticket-status-badge";
import {
  useAddSupportMessage,
  useCloseSupportTicket,
  useSupportTicketDetail,
} from "@/features/support/hooks/use-support";

/**
 * Detalhe/chat de um chamado (`SUP-02`) — visão Admin Rotta. `companyId`
 * vem da query string (setado pela listagem) porque Admin Rotta não tem
 * tenant próprio no token — a rota precisa saber a qual empresa este
 * chamado pertence para escopar a resposta.
 */
export default function SuporteDetalhePage(): JSX.Element {
  const { id } = useParams<{ id: string }>();
  const companyId = useSearchParams().get("companyId") ?? undefined;
  const [mensagem, setMensagem] = useState("");

  const { data: ticket, isLoading, isError } = useSupportTicketDetail(id, companyId);
  const addMessage = useAddSupportMessage(id, companyId);
  const closeTicket = useCloseSupportTicket(id, companyId);

  if (isLoading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError || !ticket) {
    return (
      <Card>
        <Card.Body>
          <Typography variant="body" color="danger">
            Chamado não encontrado.
          </Typography>
        </Card.Body>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <Typography variant="title">{ticket.assunto}</Typography>
          <Typography variant="caption" color="muted">
            {ticket.companyNome} · {ticket.abertoPorNome} ({ticket.abertoPorEmail})
          </Typography>
        </div>
        <div className="flex items-center gap-3">
          <SupportTicketStatusBadge status={ticket.status} />
          {ticket.status !== "ENCERRADO" && (
            <Button
              variant="secondary"
              size="sm"
              isLoading={closeTicket.isPending}
              onClick={() => closeTicket.mutate()}
            >
              Encerrar chamado
            </Button>
          )}
        </div>
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-1">
          <Typography variant="caption" color="muted">
            Descrição original
          </Typography>
          <Typography variant="body">{ticket.descricao}</Typography>
        </Card.Body>
      </Card>

      <Card>
        <Card.Header title="Conversa" />
        <Card.Body className="flex flex-col gap-4">
          {ticket.mensagens.length === 0 ? (
            <Typography variant="body" color="muted">
              Nenhuma mensagem ainda — responda abaixo.
            </Typography>
          ) : (
            ticket.mensagens.map((message) => (
              <div
                key={message.id}
                className={
                  message.autorIsAdminRotta
                    ? "ml-auto max-w-[80%] rounded-lg bg-primary/10 px-4 py-3"
                    : "mr-auto max-w-[80%] rounded-lg bg-muted px-4 py-3"
                }
              >
                <Typography variant="caption" color="muted">
                  {message.autorNome} · {new Date(message.createdAt).toLocaleString("pt-BR")}
                </Typography>
                <Typography variant="body">{message.mensagem}</Typography>
              </div>
            ))
          )}
        </Card.Body>
        <Card.Footer className="flex-col items-stretch gap-3">
          <textarea
            value={mensagem}
            onChange={(event) => setMensagem(event.target.value)}
            placeholder="Escreva uma resposta..."
            rows={3}
            className="w-full rounded-md border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-placeholder outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
          />
          <Button
            variant="primary"
            className="self-end"
            isDisabled={mensagem.trim().length === 0}
            isLoading={addMessage.isPending}
            onClick={() => {
              addMessage.mutate(mensagem, { onSuccess: () => setMensagem("") });
            }}
          >
            Enviar resposta
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}
