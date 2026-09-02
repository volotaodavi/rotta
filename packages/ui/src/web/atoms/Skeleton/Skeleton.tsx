import { cn } from "../../utils/cn";

export type SkeletonVariant = "text" | "circle" | "rect";

export interface SkeletonProps {
  variant?: SkeletonVariant;
  width?: number | string;
  height?: number | string;
  className?: string;
}

const VARIANT_CLASSES: Record<SkeletonVariant, string> = {
  text: "rounded",
  circle: "rounded-full",
  rect: "rounded-md",
};

/**
 * Bloco de carregamento — substitui o `Spinner` de página inteira nas
 * telas que hoje bloqueiam tudo atrás de um giro central (menos
 * abrupto, deixa a estrutura da tela visível enquanto carrega, mesmo
 * princípio de qualquer painel "moderno" de verdade). `motion-reduce`
 * do próprio Tailwind — sem depender da regra ampla de
 * `prefers-reduced-motion` que só existe em `apps/web/globals.css`,
 * pra funcionar igual em qualquer app que use `@rotta/ui`, admin
 * incluso.
 */
export function Skeleton({ variant = "rect", width, height, className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "animate-pulse bg-muted motion-reduce:animate-none",
        VARIANT_CLASSES[variant],
        className,
      )}
      style={{ width, height }}
    />
  );
}
