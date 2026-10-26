"use client";

import { Card, EmptyState, Typography } from "@rotta/ui/web";

import type { EventoRecenteDoPainel } from "@rotta/api-client";

import { horaDe } from "@/features/dispatch/labels";

/**
 * A linha do tempo do dia.
 *
 * Só coisa que aconteceu e ficou gravada: viagem aberta, viagem
 * encerrada, viagem cancelada, ocorrência registrada, embarque e
 * desembarque de aluno. Nenhum evento sintético do tipo "tudo certo às
 * 07:50", que enche a lista e some com o que importa.
 *
 * Serve a uma pergunta concreta que o painel sozinho não responde: "o
 * que mudou desde a última vez que olhei".
 */
export function EventosRecentes({ eventos }: { eventos: EventoRecenteDoPainel[] }): JSX.Element {
  return (
    <Card className="flex h-full flex-col">
      <Card.Body className="flex flex-1 flex-col gap-3 p-0">
        <div className="px-5 pt-5">
          <Typography variant="subtitle">Eventos recentes</Typography>
          <Typography variant="caption" color="muted">
            O que mudou hoje, do mais novo para o mais antigo.
          </Typography>
        </div>

        {eventos.length === 0 ? (
          <div className="p-5">
            <EmptyState
              title="Nada registrado hoje ainda"
              description="A primeira viagem aberta do dia aparece aqui assim que a ignição ligar."
            />
          </div>
        ) : (
          <ol className="flex-1 overflow-y-auto border-t border-border">
            {eventos.map((evento) => (
              <li
                key={evento.id}
                className="flex items-baseline gap-3 border-b border-border px-5 py-3 last:border-b-0"
              >
                <span className="shrink-0 text-xs font-semibold tabular-nums text-text-muted">
                  {horaDe(evento.em)}
                </span>
                <span className="flex min-w-0 flex-col">
                  <span className="text-sm font-medium text-text">{evento.titulo}</span>
                  <span className="text-sm text-text-muted">{evento.detalhe}</span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card.Body>
    </Card>
  );
}
