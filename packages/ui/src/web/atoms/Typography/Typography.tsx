import { createElement, type ElementType, type ReactNode } from "react";

import { cn } from "../../utils/cn";

/** Typography — Dossiê 25 §2.14. Nenhuma tela usa `font-size`/`font-weight` inline; sempre este componente. */
export type TypographyVariant =
  | "display"
  | "headline"
  | "title"
  | "subtitle"
  | "body"
  | "bodySmall"
  | "caption"
  | "overline"
  | "button";

export interface TypographyProps {
  variant: TypographyVariant;
  as?: ElementType;
  color?: "default" | "muted" | "disabled" | "danger" | "success" | "primary";
  children: ReactNode;
  className?: string;
}

const VARIANT_CLASSES: Record<TypographyVariant, string> = {
  display: "text-[40px] leading-[48px] font-bold",
  headline: "text-[32px] leading-[40px] font-bold",
  title: "text-2xl leading-8 font-semibold",
  subtitle: "text-xl leading-7 font-semibold",
  body: "text-base leading-6 font-normal",
  bodySmall: "text-sm leading-5 font-normal",
  caption: "text-xs leading-4 font-normal",
  overline: "text-[11px] leading-4 font-semibold uppercase tracking-[0.6px]",
  button: "text-sm leading-5 font-semibold tracking-[0.2px]",
};

const DEFAULT_ELEMENT: Record<TypographyVariant, ElementType> = {
  display: "h1",
  headline: "h1",
  title: "h2",
  subtitle: "h3",
  body: "p",
  bodySmall: "p",
  caption: "span",
  overline: "span",
  button: "span",
};

const COLOR_CLASSES: Record<NonNullable<TypographyProps["color"]>, string> = {
  default: "text-text",
  muted: "text-text-muted",
  disabled: "text-disabled-text",
  danger: "text-danger",
  success: "text-success",
  primary: "text-primary",
};

export function Typography({
  variant,
  as,
  color = "default",
  children,
  className,
}: TypographyProps) {
  return createElement(
    as ?? DEFAULT_ELEMENT[variant],
    { className: cn(VARIANT_CLASSES[variant], COLOR_CLASSES[color], className) },
    children,
  );
}
