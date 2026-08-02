import { z } from "zod";

/**
 * Placa de veículo brasileira (Dossiê 13, Seção 9, `VEI-01`) — aceita
 * tanto o formato antigo (3 letras + 4 dígitos, ex. `ABC1234`) quanto o
 * padrão Mercosul (3 letras + 1 dígito + 1 letra + 2 dígitos, ex.
 * `ABC1D23`), normalizando para maiúsculas sem separadores antes de
 * validar — o mesmo texto pode chegar como "ABC-1234" ou "abc1234".
 */
const OLD_FORMAT_REGEX = /^[A-Z]{3}[0-9]{4}$/;
const MERCOSUL_FORMAT_REGEX = /^[A-Z]{3}[0-9][A-Z][0-9]{2}$/;

export function normalizePlate(value: string): string {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

export function isValidPlate(value: string): boolean {
  const normalized = normalizePlate(value);
  return OLD_FORMAT_REGEX.test(normalized) || MERCOSUL_FORMAT_REGEX.test(normalized);
}

export const plateSchema = z
  .string()
  .transform(normalizePlate)
  .refine(isValidPlate, { message: "Placa inválida" });
