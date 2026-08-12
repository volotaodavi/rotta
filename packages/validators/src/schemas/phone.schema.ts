import { z } from "zod";

/** Telefone brasileiro (fixo ou celular), com DDD — Dossiê 15 `AUTH-01`. */
export function isValidBrazilianPhone(value: string): boolean {
  let digits = value.replace(/\D/g, "");

  // Código do país (+55) opcional na frente — muito comum quando o
  // número é copiado do WhatsApp/agenda em formato internacional
  // ("+55 11 98765-4321"). Sem isso, todo número colado assim batia
  // "Telefone inválido" (13/12 dígitos nunca bate os tamanhos abaixo).
  // Sem ambiguidade com DDD 55 (Rio Grande do Sul): um número de 11
  // dígitos começando em "55" já é aceito direto pelo bloco abaixo —
  // esta remoção só entra em 12/13 dígitos, tamanho que nunca é válido
  // sem o código do país.
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith("55")) {
    digits = digits.slice(2);
  }

  // Prefixo de tronco "0" opcional antes do DDD — formato antigo
  // ("0xx" + DDD, ex. discagem interurbana) que muita gente ainda
  // digita por hábito: "(011) 98765-4321"/"011991234567". Sem
  // ambiguidade: nenhum DDD real começa em "0", então um número de
  // 11/12 dígitos começando em "0" nunca seria válido sem remover esse
  // prefixo primeiro.
  if ((digits.length === 11 || digits.length === 12) && digits.startsWith("0")) {
    digits = digits.slice(1);
  }

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
