import {
  registerDecorator,
  type ValidationArguments,
  type ValidationOptions,
} from "class-validator";

/**
 * Validador cruzado (lê o objeto inteiro, não só o campo decorado) —
 * exige que PELO MENOS UM entre `email`/`cpfCnpj`/`telefone` esteja
 * preenchido no DTO. Pré-cadastro/pagamento antes da conta existir
 * (Dossiê 26, pedido do usuário 31/08/2026): "poder ser... e-mail,
 * CPF/CNPJ ou número de celular... se digitar qualquer um desses, ele
 * poderá conferir se bate com um pagamento" — nunca os 3 obrigatórios
 * juntos, mas também nunca os 3 ausentes. Mesmo padrão de decorator de
 * `IsCpfOrCnpj` (registerDecorator ancorado num campo qualquer do DTO),
 * só que aqui a validação em si olha `args.object` inteiro em vez de só
 * o `value` do campo decorado.
 */
export function AtLeastOneContato(validationOptions?: ValidationOptions) {
  return function decorate(object: object, propertyName: string): void {
    registerDecorator({
      name: "atLeastOneContato",
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(_value: unknown, args: ValidationArguments): boolean {
          const dto = args.object as Record<string, unknown>;
          return Boolean(
            (dto.email as string | undefined)?.trim() ||
            (dto.cpfCnpj as string | undefined)?.trim() ||
            (dto.telefone as string | undefined)?.trim(),
          );
        },
        defaultMessage(): string {
          return "Informe pelo menos um: e-mail, CPF/CNPJ ou telefone.";
        },
      },
    });
  };
}
