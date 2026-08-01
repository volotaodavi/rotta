import { cn } from "../../utils/cn";

import type { ReactNode } from "react";

/** Badge — Dossiê 25 §2.9. Nunca clicável (ver `Chip` para esse caso) e nunca o único portador de um estado (sempre texto). */
export type BadgeVariant = "neutral" | "success" | "danger" | "warning" | "info";

export interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<BadgeVariant, string> = {
  neutral: "bg-secondary/20 text-text-muted",
  success: "bg-success/15 text-success",
  danger: "bg-danger/15 text-danger",
  warning: "bg-warning/15 text-warning",
  info: "bg-info/15 text-info",
};

export function Badge({ variant = "neutral", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-semibold",
        VARIANT_CLASSES[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
