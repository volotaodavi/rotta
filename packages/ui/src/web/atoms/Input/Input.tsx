import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "../../utils/cn";

/** Input — Dossiê 25 §2.4. Nunca usado isolado em produto sem rótulo — ver `FormField`. */
export type InputSize = "sm" | "md" | "lg";

export interface InputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, "size"> {
  size?: InputSize;
  hasError?: boolean;
}

const SIZE_CLASSES: Record<InputSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-[52px] px-4 text-base",
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { size = "md", hasError = false, className, disabled, ...rest },
  ref,
) {
  return (
    <input
      ref={ref}
      disabled={disabled}
      aria-invalid={hasError}
      className={cn(
        "w-full rounded-md border bg-surface text-text placeholder:text-placeholder",
        "outline-none transition-colors duration-150",
        "focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/30",
        hasError ? "border-danger" : "border-border",
        "disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:text-disabled-text",
        SIZE_CLASSES[size],
        className,
      )}
      {...rest}
    />
  );
});
