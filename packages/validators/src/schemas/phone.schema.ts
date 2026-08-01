import { z } from "zod";

/** Telefone brasileiro (fixo ou celular), com DDD — Dossiê 15 `AUTH-01`. */
export function isValidBrazilianPhone(value: string): boolean {
  const digits = value.replace(/\D/g, "");

  if (digits.length === 11) {
    // Celular: DDD (11-99) + 9 (nono dígito) + 8 dígitos.
    return /^[1-9]{2}9\d{8}$/.test(digits);
  }

  if (digits.length === 10) {
    // Fixo: DDD (11-99) + dígito inicial 2-8 + 7 dígitos.
    return /^[1-9]{2}[2-8]\d{7}$/.test(digits);
  }

  return false;
}

export const phoneSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ""))
  .refine(isValidBrazilianPhone, { message: "Telefone inválido" });
