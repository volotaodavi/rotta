import { z } from "zod";

/**
 * E-mail (Dossiê 15 `AUTH-01`) — normalizado (`trim` + minúsculas) antes
 * de validar, para que duas grafias do mesmo endereço (`Fulano@X.com` vs
 * `fulano@x.com`) resolvam à mesma identidade em checagens de duplicidade.
 */
export const emailSchema = z.string().trim().toLowerCase().email({ message: "E-mail inválido" });

/**
 * E-mail do jeito que ele é gravado: sem espaço nas pontas, minúsculo.
 *
 * Existe pelo mesmo motivo de `normalizarDocumento`: o `emailSchema`
 * acima já normalizava, mas o `apps/api` valida com `@IsEmail()` do
 * class-validator, que não normaliza nada. O e-mail é o identificador
 * de login mais usado da Rotta, e o teclado do celular capitaliza a
 * primeira letra por padrão.
 */
export function normalizarEmail(value: string): string {
  return value.trim().toLowerCase();
}
