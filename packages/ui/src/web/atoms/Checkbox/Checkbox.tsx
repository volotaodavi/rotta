import { Check, Minus } from "@rotta/icons";
import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "../../utils/cn";

/**
 * Checkbox — Dossiê 25 §2.5. Especificado no catálogo desde a primeira
 * versão do design system mas nunca implementado até agora (Dossiê 34
 * — construído sob demanda real: o aceite obrigatório de Termos/
 * Política de Privacidade no cadastro precisava de um checkbox de
 * verdade, não de um valor fixo `true` nunca confirmado pelo usuário).
 *
 * 20×20px fixo (área de toque estendida até 44×44 fica a cargo do
 * `<label>`/wrapper que envolve o componente, nunca do próprio
 * quadrado — mesmo princípio de `FormField` associando rótulo a
 * input). `indeterminate` é só visual (traço `Minus`) — o valor
 * semântico de `aria-checked="mixed"` não é um booleano de `checked`,
 * então HTML puro não modela isso via `checked` do input nativo;
 * resolvido via `aria-checked` explícito quando `indeterminate=true`.
 */
export interface CheckboxProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "type" | "size"
> {
  indeterminate?: boolean;
  hasError?: boolean;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { indeterminate = false, hasError = false, className, disabled, checked, ...rest },
  ref,
) {
  return (
    <span className="relative inline-flex h-5 w-5 shrink-0">
      <input
        ref={ref}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        aria-checked={indeterminate ? "mixed" : checked}
        aria-invalid={hasError}
        className={cn(
          "peer h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-sm border bg-surface",
          "outline-none transition-colors duration-150",
          "checked:border-primary checked:bg-primary",
          "focus-visible:ring-2 focus-visible:ring-primary/30",
          hasError ? "border-danger" : "border-border",
          "disabled:cursor-not-allowed disabled:bg-disabled-bg disabled:checked:bg-disabled-bg",
          className,
        )}
        {...rest}
      />
      {(checked || indeterminate) && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-white">
          {indeterminate ? <Minus size={14} /> : <Check size={14} />}
        </span>
      )}
    </span>
  );
});
