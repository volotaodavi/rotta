import { cn } from "../../utils/cn";

import type { HTMLAttributes, ReactNode } from "react";

/**
 * Card — Dossiê 25 §4.13. Compound Component, base estrutural de todos
 * os `*Card` especializados do catálogo (Dossiê 24 §12.2 — múltiplas
 * partes relacionadas compartilhando o mesmo contêiner visual).
 */
export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  /**
   * `"driver"` (spec de identidade do Motorista/Monitor, 31/08/2026:
   * "sombras discretas em vez de bordas") troca a base inteira —
   * cantos de 24px, sem borda, sombra `shadow-driver` — em vez de só
   * anexar classes via `className` (sem `tailwind-merge` neste `cn`,
   * misturar `border`/`rounded-lg` com um override por `className`
   * dependeria da ordem não determinística das classes no CSS
   * compilado). Omitido: comportamento padrão de sempre, para todo
   * outro consumidor do componente.
   */
  variant?: "default" | "driver";
}

const BASE_CLASSES: Record<NonNullable<CardProps["variant"]>, string> = {
  default: "rounded-lg border border-border bg-card",
  driver: "rounded-3xl border-none bg-card shadow-driver",
};

function CardRoot({
  interactive = false,
  variant = "default",
  className,
  children,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        BASE_CLASSES[variant],
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
  as: Heading = "h3",
}: {
  title: ReactNode;
  action?: ReactNode;
  className?: string;
  /**
   * Nível do título do cartão. Padrão `h3`, que é o certo dentro de uma
   * seção com título próprio — e errado quando o cartão vem logo
   * debaixo do `h1` da página, porque aí o leitor de tela anuncia um
   * nível que não existe (`A11Y-10`,
   * `docs/53-acessibilidade-do-site.md`; WCAG 1.3.1).
   *
   * Só o nível muda: o tamanho e o peso continuam fixos no `className`
   * abaixo, de propósito — o lugar do cartão na hierarquia do documento
   * não é a mesma pergunta que o tamanho da letra dele.
   */
  as?: "h2" | "h3" | "h4";
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-border px-6 py-4",
        className,
      )}
    >
      <Heading className="text-xl font-semibold leading-7 text-text">{title}</Heading>
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
