import { isValidPlate } from "@rotta/validators";
import { registerDecorator, type ValidationOptions } from "class-validator";

/** Valida placa de veículo (formato antigo ou Mercosul) — campo `placa` de `Vehicle`. */
export function IsPlate(validationOptions?: ValidationOptions) {
  return function decorate(object: object, propertyName: string): void {
    registerDecorator({
      name: "isPlate",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === "string" && isValidPlate(value);
        },
        defaultMessage(): string {
          return "Placa inválida";
        },
      },
    });
  };
}
