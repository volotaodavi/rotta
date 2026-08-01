import { cn } from "../../utils/cn";

/** Spinner — Dossiê 25 §2.12. Rotação linear contínua, nunca acelera/desacelera. */
export type SpinnerSize = "sm" | "md" | "lg";

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const SIZE_PX: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-10 w-10 border-[3px]",
};

export function Spinner({ size = "md", className }: SpinnerProps) {
  return (
    <span
      role="status"
      aria-label="Carregando"
      className={cn(
        "inline-block animate-spin rounded-full border-current border-t-transparent",
        SIZE_PX[size],
        className,
      )}
    />
  );
}
