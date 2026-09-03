"use client";

import { ChevronLeft, ChevronRight } from "@rotta/icons";
import { useMemo, useState } from "react";

import { Typography } from "../../atoms/Typography/Typography";
import { cn } from "../../utils/cn";

/** Um dia com pelo menos 1 evento — o consumidor já agrega tudo por dia antes de passar (o `Calendar` nunca soma/agrupa sozinho). */
export interface CalendarDayEvent {
  /** "AAAA-MM-DD", sempre no fuso local (mesma convenção de `Date#toISOString().slice(0, 10)` já usada no resto do Admin). */
  date: string;
  count: number;
  /** Cor do marcador — um dos tons semânticos, igual `StatTile`. */
  tone?: "primary" | "success" | "warning" | "danger" | "info";
}

export interface CalendarProps {
  events?: CalendarDayEvent[];
  selectedDate?: string | null;
  onSelectDate?: (date: string) => void;
  className?: string;
}

const DOT_TONE_CLASSES: Record<NonNullable<CalendarDayEvent["tone"]>, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
};

const WEEKDAY_LABELS = ["Seg", "Ter", "Qua", "Qui", "Sex", "Sáb", "Dom"];

function toDateKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/** Segunda = 0 ... Domingo = 6 (convenção pt-BR, diferente do `Date#getDay()` nativo que começa no Domingo). */
function mondayFirstWeekday(date: Date): number {
  return (date.getDay() + 6) % 7;
}

interface CalendarCell {
  date: Date;
  key: string;
  isCurrentMonth: boolean;
}

function buildMonthGrid(viewMonth: Date): CalendarCell[] {
  const firstOfMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth(), 1);
  const leadingBlanks = mondayFirstWeekday(firstOfMonth);
  const gridStart = new Date(firstOfMonth);
  gridStart.setDate(gridStart.getDate() - leadingBlanks);

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(gridStart);
    date.setDate(date.getDate() + index);
    return {
      date,
      key: toDateKey(date),
      isCurrentMonth: date.getMonth() === viewMonth.getMonth(),
    };
  });
}

/**
 * Calendário mensal navegável (pedido do usuário 03/09/2026:
 * "inclua um calendário utilizável no painel") — dias com evento levam
 * um marcador colorido (tom vem do consumidor, ex. `warning` pra
 * aprovações pendentes, `danger` pra chamados abertos); clicar num dia
 * chama `onSelectDate`, o consumidor decide o que mostrar (mesma
 * divisão de responsabilidade de `Pagination`: este componente só
 * desenha a grade, nunca decide o que um clique "significa").
 */
export function Calendar({ events = [], selectedDate, onSelectDate, className }: CalendarProps) {
  const [viewMonth, setViewMonth] = useState(() => {
    const base = selectedDate ? new Date(`${selectedDate}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarDayEvent>();
    for (const event of events) map.set(event.date, event);
    return map;
  }, [events]);

  const cells = useMemo(() => buildMonthGrid(viewMonth), [viewMonth]);
  const todayKey = toDateKey(new Date());
  const monthLabel = viewMonth.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex items-center justify-between">
        <Typography variant="bodySmall" className="font-semibold capitalize">
          {monthLabel}
        </Typography>
        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Mês anterior"
            onClick={() =>
              setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() - 1, 1))
            }
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-muted hover:text-text"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            aria-label="Próximo mês"
            onClick={() =>
              setViewMonth((current) => new Date(current.getFullYear(), current.getMonth() + 1, 1))
            }
            className="flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-muted hover:text-text"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAY_LABELS.map((label) => (
          <Typography
            key={label}
            variant="caption"
            color="muted"
            className="py-1 text-center font-medium"
          >
            {label}
          </Typography>
        ))}

        {cells.map((cell) => {
          const event = eventsByDate.get(cell.key);
          const isToday = cell.key === todayKey;
          const isSelected = cell.key === selectedDate;

          return (
            <button
              key={cell.key}
              type="button"
              onClick={() => onSelectDate?.(cell.key)}
              disabled={!onSelectDate}
              className={cn(
                "relative flex h-9 flex-col items-center justify-center gap-0.5 rounded-md text-sm transition-colors",
                cell.isCurrentMonth ? "text-text" : "text-text-muted/40",
                isSelected
                  ? "bg-primary font-semibold text-white"
                  : isToday
                    ? "border border-primary font-semibold text-primary"
                    : onSelectDate && "hover:bg-muted",
              )}
            >
              {cell.date.getDate()}
              {event && (
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    isSelected ? "bg-white" : DOT_TONE_CLASSES[event.tone ?? "primary"],
                  )}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
