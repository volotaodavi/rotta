import { cn } from "../../utils/cn";

import type { HTMLAttributes, ReactNode } from "react";

/**
 * Card — Dossiê 25 §4.13. Compound Component, base estrutural de todos
 * os `*Card` especializados do catálogo (Dossiê 24 §12.2 — múltiplas
 * partes relacionadas compartilhando o mesmo contêiner visual).
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

function CardRoot({ interactive = false, className, children, ...rest }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card",
        interactive && "cursor-pointer transition-colors duration-150 hover:border-border-strong",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

function CardHeader({
  title,
  action,
  className,
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-border px-6 py-4",
        className,
      )}
    >
      <h3 className="text-xl font-semibold leading-7 text-text">{title}</h3>
      {action}
    </div>
  );
}

function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-6", className)}>{children}</div>;
}

function CardFooter({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-3 border-t border-border px-6 py-4",
        className,
      )}
    >
      {children}
    </div>
  );
}

export const Card = Object.assign(CardRoot, {
  Header: CardHeader,
  Body: CardBody,
  Footer: CardFooter,
});
