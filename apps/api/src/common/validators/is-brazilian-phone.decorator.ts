import { isValidBrazilianPhone } from "@rotta/validators";
import { registerDecorator, type ValidationOptions } from "class-validator";

/** Valida telefone brasileiro (fixo ou celular, com DDD) — `@rotta/validators`. */
export function IsBrazilianPhone(validationOptions?: ValidationOptions) {
  return function decorate(object: object, propertyName: string): void {
    registerDecorator({
      name: "isBrazilianPhone",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === "string" && isValidBrazilianPhone(value);
        },
        defaultMessage(): string {
          return "Telefone inválido";
        },
      },
    });
  };
}
