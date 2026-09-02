import { Typography } from "../../atoms/Typography/Typography";
import { cn } from "../../utils/cn";

import type { ComponentType, ReactNode } from "react";

export interface EmptyStateProps {
  icon?: ComponentType<{ className?: string }>;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

/**
 * Substitui o texto solto (`<Typography color="muted">Nenhum registro
 * encontrado.</Typography>`) repetido em toda tela de lista do painel
 * — mesmo espírito de `ErrorState` (que já existe), só para o caso
 * "carregou certo, só que está vazio" em vez de "falhou".
 */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 px-6 py-12 text-center",
        className,
      )}
    >
      {Icon ? (
        <div className="mb-1 flex h-11 w-11 items-center justify-center rounded-full bg-muted text-text-muted">
          <Icon className="h-5 w-5" />
        </div>
      ) : null}
      <Typography variant="body" className="font-semibold">
        {title}
      </Typography>
      {description ? (
        <Typography variant="bodySmall" color="muted" className="max-w-sm">
          {description}
        </Typography>
      ) : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
}
