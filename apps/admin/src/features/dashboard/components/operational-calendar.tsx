"use client";

import { Badge, Calendar, Card, Typography } from "@rotta/ui/web";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { CalendarDayEvent } from "@rotta/ui/web";
import type { Route } from "next";

/** Um item agendável no calendário — hoje só aprovações pendentes e chamados abertos (os dois únicos fluxos do Admin com data real de criação já disponíveis na Home sem endpoint novo). */
export interface CalendarAgendaItem {
  id: string;
  tipo: "Aprovação" | "Chamado";
  titulo: string;
  empresa: string;
  href: Route;
  createdAt: string;
}

function dateKey(iso: string): string {
  return iso.slice(0, 10);
}

/**
 * Calendário operacional da Home (pedido do usuário 03/09/2026:
 * "inclua um calendário utilizável no painel"). "Utilizável" = clicar
 * num dia com marcador mostra o que aconteceu ali — não é decorativo.
 * Chamado (`danger`, mais urgente) sempre vence Aprovação (`warning`)
 * na cor do marcador quando os dois caem no mesmo dia; a lista abaixo
 * do calendário mostra os dois tipos separados por badge.
 */
export function OperationalCalendarCard({ itens }: { itens: CalendarAgendaItem[] }): JSX.Element {
  const [selected, setSelected] = useState<string | null>(null);

  const events = useMemo<CalendarDayEvent[]>(() => {
    const map = new Map<string, CalendarDayEvent>();
    for (const item of itens) {
      const key = dateKey(item.createdAt);
      const existing = map.get(key);
      const tone: CalendarDayEvent["tone"] =
        existing?.tone === "danger" || item.tipo === "Chamado" ? "danger" : "warning";
      map.set(key, { date: key, count: (existing?.count ?? 0) + 1, tone });
    }
    return [...map.values()];
  }, [itens]);

  const itensDoDia = useMemo(
    () => (selected ? itens.filter((item) => dateKey(item.createdAt) === selected) : []),
    [itens, selected],
  );

  return (
    <Card>
      <Card.Header title="Calendário operacional" />
      <Card.Body className="flex flex-col gap-4 sm:flex-row sm:gap-6">
        <Calendar
          events={events}
          selectedDate={selected}
          onSelectDate={(date) => setSelected((current) => (current === date ? null : date))}
          className="sm:w-72 sm:shrink-0"
        />
        <div className="flex flex-1 flex-col gap-1 border-t border-border pt-4 sm:border-l sm:border-t-0 sm:pl-6 sm:pt-0">
          {!selected ? (
            <Typography variant="bodySmall" color="muted">
              Selecione um dia com marcador pra ver as aprovações e os chamados abertos naquele dia.
            </Typography>
          ) : itensDoDia.length === 0 ? (
            <Typography variant="bodySmall" color="muted">
              Nenhuma aprovação ou chamado aberto em{" "}
              {new Date(`${selected}T00:00:00`).toLocaleDateString("pt-BR")}.
            </Typography>
          ) : (
            itensDoDia.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="flex items-center justify-between gap-3 rounded-md px-2 py-2 transition-colors hover:bg-muted"
              >
                <div className="min-w-0">
                  <Typography variant="bodySmall" className="truncate font-medium">
                    {item.titulo}
                  </Typography>
                  <Typography variant="caption" color="muted" className="truncate">
                    {item.empresa}
                  </Typography>
                </div>
                <Badge variant={item.tipo === "Chamado" ? "danger" : "warning"}>{item.tipo}</Badge>
              </Link>
            ))
          )}
        </div>
      </Card.Body>
    </Card>
  );
}
