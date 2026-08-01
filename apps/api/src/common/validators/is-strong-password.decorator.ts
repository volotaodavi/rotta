import { isStrongPassword } from "@rotta/validators";
import { registerDecorator, type ValidationOptions } from "class-validator";

/**
 * Formato de senha forte (Dossiê 15 `AUTH-01`): mínimo 8 caracteres, ao
 * menos 1 letra e 1 número. A regra "nunca igual ao identificador de
 * login" precisa dos outros campos do formulário e é checada à parte,
 * no service (`passwordEqualsIdentifier`, `@rotta/validators`).
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function decorate(object: object, propertyName: string): void {
    registerDecorator({
      name: "isStrongPassword",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === "string" && isStrongPassword(value);
        },
        defaultMessage(): string {
          return "A senha deve ter no mínimo 8 caracteres, com ao menos 1 letra e 1 número";
        },
      },
    });
  };
}
