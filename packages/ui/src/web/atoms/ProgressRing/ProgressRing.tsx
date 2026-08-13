import { cn } from "../../utils/cn";

import type { ReactNode } from "react";

/**
 * ProgressRing — anel de progresso circular (SVG puro, sem biblioteca de
 * gráficos). Adicionado pra dar harmonia visual entre os painéis "ERP"
 * de `apps/web` (Minha Empresa) e `apps/admin` (Painel Rotta) — pedido
 * do usuário ("Adapte para a realidade da Rotta, para poder trazer
 * harmonia"), inspirado nos anéis de "My Attendance"/"My Leaves" de uma
 * imagem de referência de um ERP de RH. Só desenha proporção real
 * recebida via `value` — nunca inventa um número.
 */
export interface ProgressRingProps {
  /** Fração já concluída, de 0 a 1 — valores fora da faixa são recortados (nunca ultrapassam o anel). */
  value: number;
  size?: number;
  strokeWidth?: number;
  /** Classe Tailwind `stroke-*` da trilha de fundo. */
  trackClassName?: string;
  /** Classe Tailwind `stroke-*` do progresso em si. */
  progressClassName?: string;
  /** Conteúdo centralizado (normalmente o percentual em texto). */
  children?: ReactNode;
  className?: string;
}

export function ProgressRing({
  value,
  size = 96,
  strokeWidth = 8,
  trackClassName = "stroke-border",
  progressClassName = "stroke-primary",
  children,
  className,
}: ProgressRingProps) {
  const fracao = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
  const raio = (size - strokeWidth) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const offset = circunferencia * (1 - fracao);
  const centro = size / 2;

  return (
    <div
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg width={size} height={size} className="-rotate-90" role="presentation">
        <circle
          cx={centro}
          cy={centro}
          r={raio}
          strokeWidth={strokeWidth}
          fill="none"
          className={trackClassName}
        />
        <circle
          cx={centro}
          cy={centro}
          r={raio}
          strokeWidth={strokeWidth}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={offset}
          className={cn(progressClassName, "transition-[stroke-dashoffset] duration-500")}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      ) : null}
    </div>
  );
}
