import { TrendingDown, TrendingUp } from "@rotta/icons";

import { Typography } from "../../atoms/Typography/Typography";
import { cn } from "../../utils/cn";

import type { ComponentType, ReactNode } from "react";

export interface StatTileTrend {
  /** Variação em relação ao período anterior, já calculada pelo consumidor — nunca inventado aqui. */
  direction: "up" | "down" | "flat";
  /** Texto já formatado (ex. "+12% vs. período anterior") — o componente nunca formata número sozinho. */
  label: string;
}

export interface StatTileProps {
  icon?: ComponentType<{ className?: string }>;
  /** Cor de fundo do círculo do ícone — um dos tokens semânticos (`primary`, `success`, `warning`, `danger`, `info`). */
  tone?: "primary" | "success" | "warning" | "danger" | "info";
  label: string;
  /** Valor já formatado pelo consumidor (moeda, percentual, separador de milhar) — nunca formatado aqui. */
  value: ReactNode;
  trend?: StatTileTrend;
  onClick?: () => void;
  /**
   * Mostra a mesma sinalização visual de "isso é clicável" (cursor,
   * destaque de borda no hover) mesmo sem `onClick` — para quando o
   * próprio consumidor envolve o tile num `<Link>` de verdade (âncora
   * real, funciona com botão direito/abrir em nova aba), em vez de
   * depender do `onClick` sintético daqui. Default: só quando `onClick`
   * é passado.
   */
  interactive?: boolean;
  className?: string;
}

const TONE_CLASSES: Record<NonNullable<StatTileProps["tone"]>, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  info: "bg-info/15 text-info",
};

const TREND_CLASSES: Record<StatTileTrend["direction"], string> = {
  up: "text-success",
  down: "text-danger",
  flat: "text-text-muted",
};

/**
 * Número + rótulo + ícone padronizados — substitui os números soltos
 * em `Typography` espalhados pelas telas de dashboard do Admin
 * (Home, Inteligência, Financeiro), mesmo padrão de ícone-em-círculo
 * (círculo `h-9 w-9` com fundo translúcido do tom semântico) que as
 * telas já usavam cada uma à sua maneira.
 */
export function StatTile({
  icon: Icon,
  tone = "primary",
  label,
  value,
  trend,
  onClick,
  interactive = Boolean(onClick),
  className,
}: StatTileProps) {
  const TrendIcon = trend?.direction === "down" ? TrendingDown : TrendingUp;

  return (
    <div
      role={onClick ? "button" : undefined}
      tabIndex={onClick ? 0 : undefined}
      onClick={onClick}
      onKeyDown={
        onClick
          ? (event) => {
              if (event.key === "Enter" || event.key === " ") onClick();
            }
          : undefined
      }
      className={cn(
        "flex flex-col gap-3 rounded-lg border border-border bg-card p-4",
        interactive &&
          "cursor-pointer text-left transition-colors duration-150 hover:border-border-strong",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        {Icon ? (
          <div
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-full",
              TONE_CLASSES[tone],
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
        ) : null}
        {trend ? (
          <span
            className={cn(
              "inline-flex items-center gap-1 text-xs font-semibold",
              TREND_CLASSES[trend.direction],
            )}
          >
            {trend.direction !== "flat" ? <TrendIcon className="h-3.5 w-3.5" /> : null}
            {trend.label}
          </span>
        ) : null}
      </div>
      <div className="flex flex-col gap-0.5">
        <Typography variant="title">{value}</Typography>
        <Typography variant="caption" color="muted">
          {label}
        </Typography>
      </div>
    </div>
  );
}
