import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";

import { cn } from "../../utils/cn";
import { Spinner } from "../Spinner/Spinner";

/**
 * Button — Dossiê 25 §2.1. Ação principal (`primary`) nunca mais de uma
 * por tela (Dossiê 24 §2). Foco visível obrigatório (Dossiê 24 §9).
 */
export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  isLoading?: boolean;
  isDisabled?: boolean;
  fullWidth?: boolean;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  children?: ReactNode;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: "bg-primary text-white hover:bg-primary-hover",
  secondary: "bg-secondary text-background hover:opacity-90",
  ghost: "bg-transparent text-primary hover:bg-muted",
  danger: "bg-danger text-white hover:opacity-90",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-10 px-4 text-sm gap-2",
  lg: "h-12 px-6 text-base gap-2",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    variant = "primary",
    size = "md",
    isLoading = false,
    isDisabled = false,
    fullWidth = false,
    iconLeft,
    iconRight,
    className,
    children,
    disabled,
    ...rest
  },
  ref,
) {
  const isActuallyDisabled = isDisabled || disabled || isLoading;

  return (
    <button
      ref={ref}
      disabled={isActuallyDisabled}
      aria-busy={isLoading}
      className={cn(
        "inline-flex items-center justify-center rounded-md font-semibold tracking-[0.2px]",
        "transition-colors duration-150 active:scale-[0.98]",
        "outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:cursor-not-allowed disabled:opacity-40 disabled:active:scale-100",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth && "w-full",
        className,
      )}
      {...rest}
    >
      {isLoading ? (
        <Spinner size="sm" />
      ) : (
        <>
          {iconLeft}
          {children}
          {iconRight}
        </>
      )}
    </button>
  );
});
