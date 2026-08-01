import { isValidCep } from "@rotta/validators";
import { registerDecorator, type ValidationOptions } from "class-validator";

/** Valida CEP brasileiro (8 dígitos) — `@rotta/validators`. */
export function IsCep(validationOptions?: ValidationOptions) {
  return function decorate(object: object, propertyName: string): void {
    registerDecorator({
      name: "isCep",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === "string" && isValidCep(value);
        },
        defaultMessage(): string {
          return "CEP inválido";
        },
      },
    });
  };
}
