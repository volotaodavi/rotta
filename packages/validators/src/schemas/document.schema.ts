import { z } from "zod";

/**
 * Validação de CPF/CNPJ (Dossiê 15 `AUTH-01`, Dossiê 16 `EMP-01`) — dígito
 * verificador real, não apenas formato/tamanho. A mesma implementação é
 * usada pelo backend (`apps/api`, DTOs de cadastro) e pelo frontend
 * (`@rotta/forms`), eliminando o risco de validação divergente entre os
 * dois lados (Dossiê 22, Seção 5.5).
 */

function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

function computeCpfCheckDigit(base: string): number {
  let sum = 0;
  for (let i = 0; i < base.length; i += 1) {
    sum += Number(base[i]) * (base.length + 1 - i);
  }
  const rest = (sum * 10) % 11;
  return rest === 10 ? 0 : rest;
}

/** Valida um CPF por dígito verificador (algoritmo oficial da Receita Federal). */
export function isValidCPF(value: string): boolean {
  const cpf = onlyDigits(value);
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) {
    return false;
  }

  const base = cpf.slice(0, 9);
  const d1 = computeCpfCheckDigit(base);
  const d2 = computeCpfCheckDigit(base + String(d1));

  return cpf === `${base}${d1}${d2}`;
}

function computeCnpjCheckDigit(base: string): number {
  const weights =
    base.length === 12
      ? [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
      : [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  let sum = 0;
  for (let i = 0; i < base.length; i += 1) {
    sum += Number(base[i]) * (weights[i] ?? 0);
  }
  const rest = sum % 11;
  return rest < 2 ? 0 : 11 - rest;
}

/** Valida um CNPJ por dígito verificador (algoritmo oficial da Receita Federal). */
export function isValidCNPJ(value: string): boolean {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) {
    return false;
  }

  const base = cnpj.slice(0, 12);
  const d1 = computeCnpjCheckDigit(base);
  const d2 = computeCnpjCheckDigit(base + String(d1));

  return cnpj === `${base}${d1}${d2}`;
}

/** Valida um CPF **ou** CNPJ (campo `cpfCnpj` de `Company`, Dossiê 16). */
export function isValidCpfOrCnpj(value: string): boolean {
  const digits = onlyDigits(value);
  return digits.length === 11 ? isValidCPF(digits) : isValidCNPJ(digits);
}

export const cpfSchema = z
  .string()
  .transform(onlyDigits)
  .refine(isValidCPF, { message: "CPF inválido" });

export const cnpjSchema = z
  .string()
  .transform(onlyDigits)
  .refine(isValidCNPJ, { message: "CNPJ inválido" });

export const cpfOrCnpjSchema = z
  .string()
  .transform(onlyDigits)
  .refine(isValidCpfOrCnpj, { message: "CPF/CNPJ inválido" });
