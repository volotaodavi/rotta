import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "../../utils/cn";

/** Select — Dossiê 25 §2.5. Mesmo contrato visual/de acessibilidade do `Input`; nunca usado isolado sem rótulo — ver `FormField`. */
export type SelectSize = "sm" | "md" | "lg";

export interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, "size"> {
  size?: SelectSize;
  hasError?: boolean;
}

const SIZE_CLASSES: Record<SelectSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-[52px] px-4 text-base",
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { size = "md", hasError = false, className, disabled, children, ...rest },
  ref,
) {
  return (
    <select
      ref={ref}
      disabled={disabled}
      aria-invalid={hasError}
      className={cn(
        "w-full rounded-md border bg-surface text-text",
        "outline-none transition-colors duration-150",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
        hasError ? "border-danger" : "border-border",
        "disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-text",
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
});
