"use client";

import { Button, Card, Select, Typography } from "@rotta/ui/web";
import { useRouter } from "next/navigation";
import { useState } from "react";

import type { SupportTicketCategoria } from "@rotta/api-client";

import { useCreateSupportTicket } from "@/features/support/hooks/use-support";
import { SUPPORT_QUICK_REPLIES } from "@/features/support/quick-replies";

/** Abertura de chamado (`SUP-01`) — "assunto e descrição obrigatórios". */
export default function NovoChamadoPage(): JSX.Element {
  const router = useRouter();
  const createTicket = useCreateSupportTicket();
  const [assunto, setAssunto] = useState("");
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState<SupportTicketCategoria>("DUVIDA");
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Typography variant="title">Novo chamado</Typography>

      <div className="flex flex-col gap-2">
        <Typography variant="caption" color="muted">
          Alguma dessas é a sua dúvida? Toque pra preencher — ainda dá pra editar tudo antes de
          enviar.
        </Typography>
        <div className="flex flex-wrap gap-2">
          {SUPPORT_QUICK_REPLIES.map((quickReply) => (
            <button
              key={quickReply.label}
              type="button"
              onClick={() => {
                setAssunto(quickReply.assunto);
                setDescricao(quickReply.descricao);
                setCategoria(quickReply.categoria);
              }}
              className="rounded-full border border-border px-3 py-1.5 text-sm text-text transition-colors hover:border-primary hover:text-primary"
            >
              {quickReply.label}
            </button>
          ))}
        </div>
      </div>

      <Card>
        <Card.Body className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text" htmlFor="assunto">
              Assunto
            </label>
            <input
              id="assunto"
              value={assunto}
              onChange={(event) => setAssunto(event.target.value)}
              placeholder="Resuma o problema em poucas palavras"
              className="h-11 w-full rounded-md border border-border bg-surface px-4 text-sm text-text placeholder:text-placeholder outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text" htmlFor="categoria">
              Categoria
            </label>
            <Select
              id="categoria"
              value={categoria}
              onChange={(event) => setCategoria(event.target.value as SupportTicketCategoria)}
            >
              <option value="DUVIDA">Dúvida</option>
              <option value="PROBLEMA_TECNICO">Problema técnico</option>
              <option value="COBRANCA">Cobrança</option>
              <option value="OUTRO">Outro</option>
            </Select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-text" htmlFor="descricao">
              Descrição
            </label>
            <textarea
              id="descricao"
              value={descricao}
              onChange={(event) => setDescricao(event.target.value)}
              placeholder="Descreva o problema ou dúvida com o máximo de detalhes possível"
              rows={6}
              className="w-full rounded-md border border-border bg-surface px-4 py-3 text-sm text-text placeholder:text-placeholder outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30"
            />
          </div>

          {error && (
            <Typography variant="bodySmall" color="danger">
              {error}
            </Typography>
          )}
        </Card.Body>
        <Card.Footer>
          <Button
            variant="primary"
            isLoading={createTicket.isPending}
            onClick={() => {
              if (assunto.trim().length < 3 || descricao.trim().length < 10) {
                setError("Informe um assunto e uma descrição com mais detalhes.");
                return;
              }
              setError(null);
              createTicket.mutate(
                { assunto, descricao, categoria },
                {
                  onSuccess: (ticket) => {
                    router.push(`/chamados/${ticket.id}`);
                  },
                  onError: () => {
                    setError("Não foi possível abrir o chamado. Tente novamente.");
                  },
                },
              );
            }}
          >
            Abrir chamado
          </Button>
        </Card.Footer>
      </Card>
    </div>
  );
}
