import { z } from "zod";

/**
 * Política de senha forte — Dossiê 15 `AUTH-01`, Seção "Validações":
 * "mínimo 8 caracteres, ao menos 1 número e 1 letra, nunca igual ao
 * identificador de login". A primeira parte (formato) é validável sem
 * contexto adicional (`isStrongPassword`/`strongPasswordSchema`); a
 * segunda ("nunca igual ao identificador") depende de valores só
 * conhecidos em tempo de execução (e-mail/telefone/CPF informados no
 * mesmo formulário) e por isso é uma função à parte
 * (`passwordEqualsIdentifier`), aplicada pelo service/DTO que tem os
 * dois valores em mãos — nunca inventamos uma regra mais rígida do que a
 * especificada.
 */
export function isStrongPassword(value: string): boolean {
  return value.length >= 8 && /[a-zA-Z]/.test(value) && /\d/.test(value);
}

/** Verdadeiro se a senha for igual (case-insensitive) a algum identificador de login. */
export function passwordEqualsIdentifier(
  password: string,
  identifiers: (string | undefined)[],
): boolean {
  const normalizedPassword = password.trim().toLowerCase();
  return identifiers
    .filter((identifier): identifier is string => Boolean(identifier))
    .some((identifier) => identifier.trim().toLowerCase() === normalizedPassword);
}

export const strongPasswordSchema = z
  .string()
  .min(8, { message: "A senha deve ter no mínimo 8 caracteres" })
  .refine((value) => /[a-zA-Z]/.test(value), { message: "A senha deve conter ao menos 1 letra" })
  .refine((value) => /\d/.test(value), { message: "A senha deve conter ao menos 1 número" });
