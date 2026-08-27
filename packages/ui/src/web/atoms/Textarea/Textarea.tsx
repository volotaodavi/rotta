import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "../../utils/cn";

/**
 * Textarea — mesmo contrato visual/de acessibilidade do `Input`/`Select`
 * (Dossiê 25 §2.4/2.5), mas sem variantes de altura fixa por linha: quem usa
 * controla via `rows`/`className`. Nunca usado isolado sem rótulo — ver
 * `FormField`. Primeiro uso: observações de aprovação de veículo (Epic A,
 * Admin Rotta).
 */
export interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { hasError = false, className, disabled, rows = 4, ...rest },
  ref,
) {
  return (
    <textarea
      ref={ref}
      disabled={disabled}
      aria-invalid={hasError}
      rows={rows}
      className={cn(
        "w-full resize-y rounded-md border bg-surface px-4 py-3 text-sm text-text placeholder:text-placeholder",
        "outline-none transition-colors duration-150",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
        hasError ? "border-danger" : "border-border",
        "disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-text",
        className,
      )}
      {...rest}
    />
  );
});
