import { isValidCPF } from "@rotta/validators";
import { registerDecorator, type ValidationOptions } from "class-validator";

/** Valida CPF por digito verificador (nao apenas formato) — `@rotta/validators`. */
export function IsCpf(validationOptions?: ValidationOptions) {
  return function decorate(object: object, propertyName: string): void {
    registerDecorator({
      name: "isCpf",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === "string" && isValidCPF(value);
        },
        defaultMessage(): string {
          return "CPF inválido";
        },
      },
    });
  };
}
