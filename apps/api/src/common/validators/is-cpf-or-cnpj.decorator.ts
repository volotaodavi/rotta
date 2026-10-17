import { applyDecorators } from "@nestjs/common";
import { isValidCpfOrCnpj } from "@rotta/validators";
import { registerDecorator, type ValidationOptions } from "class-validator";

import { NormalizaDocumento } from "./is-cpf.decorator";

/**
 * Valida CPF (11 dígitos) ou CNPJ (14 dígitos) por dígito verificador,
 * depois de deixar só os dígitos (`NormalizaDocumento`) — campo
 * `cpfCnpj` de `Company`.
 *
 * O CNPJ não é login, mas é a chave pela qual a Rotta e o Asaas
 * reconhecem a mesma transportadora. Gravado "12.345.678/0001-90" num
 * cadastro e "12345678000190" no outro, viram duas empresas.
 */
export function IsCpfOrCnpj(validationOptions?: ValidationOptions) {
  return applyDecorators(NormalizaDocumento(), ((object, propertyName) => {
    registerDecorator({
      name: "isCpfOrCnpj",
      target: object.constructor,
      propertyName: String(propertyName),
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === "string" && isValidCpfOrCnpj(value);
        },
        defaultMessage(): string {
          return "CPF/CNPJ inválido";
        },
      },
    });
  }) satisfies PropertyDecorator);
}
