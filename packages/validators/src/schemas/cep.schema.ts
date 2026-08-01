import { z } from "zod";

/** CEP brasileiro — 8 dígitos, sem dígito verificador (Correios não usa um). */
export function isValidCep(value: string): boolean {
  return /^\d{8}$/.test(value.replace(/\D/g, ""));
}

export const cepSchema = z
  .string()
  .transform((value) => value.replace(/\D/g, ""))
  .refine(isValidCep, { message: "CEP inválido" });
