import { isValidCpfOrCnpj } from "@rotta/validators";
import { registerDecorator, type ValidationOptions } from "class-validator";

/** Valida CPF (11 dígitos) ou CNPJ (14 dígitos) por dígito verificador — campo `cpfCnpj` de `Company`. */
export function IsCpfOrCnpj(validationOptions?: ValidationOptions) {
  return function decorate(object: object, propertyName: string): void {
    registerDecorator({
      name: "isCpfOrCnpj",
      target: object.constructor,
      propertyName,
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
  };
}
