import { cloneElement, isValidElement, useId, type ReactElement } from "react";

import { cn } from "../../utils/cn";

/**
 * FormField — Dossiê 25 §3.5. Compõe qualquer átomo de input com rótulo,
 * texto de ajuda e mensagem de erro (nunca os dois simultâneos) — o
 * único jeito de um `Input`/`Select`/etc. aparecer em uma tela real
 * (Dossiê 24 §9, acessibilidade de formulário).
 */
export interface FormFieldProps {
  label: string;
  helperText?: string;
  errorText?: string;
  isRequired?: boolean;
  children: ReactElement<{ id?: string; "aria-describedby"?: string; hasError?: boolean }>;
}

export function FormField({ label, helperText, errorText, isRequired, children }: FormFieldProps) {
  const generatedId = useId();
  const fieldId = children.props.id ?? generatedId;
  const describedById = errorText || helperText ? `${fieldId}-description` : undefined;

  const field = isValidElement(children)
    ? cloneElement(children, {
        id: fieldId,
        "aria-describedby": describedById,
        hasError: Boolean(errorText),
      })
    : children;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={fieldId} className="text-sm font-semibold text-text">
        {label}
        {isRequired && <span className="ml-0.5 text-danger">*</span>}
      </label>
      {field}
      {(errorText || helperText) && (
        <p
          id={describedById}
          className={cn("text-xs", errorText ? "text-danger" : "text-text-muted")}
        >
          {errorText ?? helperText}
        </p>
      )}
    </div>
  );
}
