import { forwardRef, type ChangeEvent, type InputHTMLAttributes } from "react";

import { cn } from "../../utils/cn";

import type { InputSize } from "../Input/Input";

/** Mesmas classes de tamanho de `Input` — mantidas em paralelo porque `InputSize` não exporta o mapa em si, só o tipo. */
const SIZE_CLASSES: Record<InputSize, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-[52px] px-4 text-base",
};

/** Máximo de dígitos aceitos: DDD (2) + celular com nono dígito (9). Nunca fixo, nunca código do país — só o que a pessoa precisa saber de cor. */
const MAX_DIGITS = 11;

/** `"1198765-4321"` digitado → `"(11) 98765-4321"` exibido, sempre parando em 11 dígitos. */
export function formatBrazilianPhoneDigits(digits: string): string {
  const ddd = digits.slice(0, 2);
  const local = digits.slice(2);
  if (!ddd) return "";
  if (digits.length <= 2) return `(${ddd}`;
  if (local.length <= 5) return `(${ddd}) ${local}`;
  return `(${ddd}) ${local.slice(0, 5)}-${local.slice(5)}`;
}

export interface PhoneInputProps extends Omit<
  InputHTMLAttributes<HTMLInputElement>,
  "size" | "value" | "onChange" | "type"
> {
  size?: InputSize;
  hasError?: boolean;
  /** Sempre em dígitos puros — DDD + celular, ex. `"11987654321"` — nunca a máscara exibida. */
  value: string;
  /** Recebe só os dígitos já filtrados/limitados (máx. 11) — o mesmo formato que a API espera, sem transformação extra em quem usa este componente. */
  onValueChange: (digits: string) => void;
}

/**
 * Campo de telefone que só aceita DDD + celular (11 dígitos, nono
 * dígito incluído) — pedido explícito do usuário depois de vários
 * cadastros falhando com "Telefone inválido" por formato (código do
 * país, prefixo de tronco "0", etc.): em vez de tentar adivinhar/
 * aceitar cada variação que alguém possa digitar ou colar, a pessoa só
 * consegue digitar dígitos, e o campo já para sozinho nos 11 (o campo
 * formata visualmente "(11) 98765-4321" enquanto isso, mas o que sai
 * em `onValueChange` são sempre os dígitos puros, prontos pra API).
 */
export const PhoneInput = forwardRef<HTMLInputElement, PhoneInputProps>(function PhoneInput(
  { size = "md", hasError = false, className, value, onValueChange, disabled, ...rest },
  ref,
) {
  function handleChange(event: ChangeEvent<HTMLInputElement>): void {
    onValueChange(event.target.value.replace(/\D/g, "").slice(0, MAX_DIGITS));
  }

  return (
    <input
      ref={ref}
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      placeholder="(11) 98765-4321"
      value={formatBrazilianPhoneDigits(value)}
      onChange={handleChange}
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

/** DDD (11-99) + celular com nono dígito — mesma regra de `isValidBrazilianPhone` (`@rotta/validators`), sem código do país/tronco: o `PhoneInput` já impede digitar isso. */
export function isCompleteBrazilianCellphone(digits: string): boolean {
  return /^[1-9]{2}9\d{8}$/.test(digits);
}
