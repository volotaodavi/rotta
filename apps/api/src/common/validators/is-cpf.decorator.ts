import { applyDecorators } from "@nestjs/common";
import { isValidCPF, normalizarDocumento } from "@rotta/validators";
import { Transform } from "class-transformer";
import { registerDecorator, type ValidationOptions } from "class-validator";

/**
 * Deixa o documento só com os dígitos ANTES de validar e de gravar.
 *
 * Roda no `plainToInstance` do `ValidationPipe` (`transform: true` em
 * `main.ts`), então o que chega ao serviço e ao banco já é só dígito.
 *
 * ## Por que isto é correção de defeito
 *
 * CPF é um dos três identificadores de login da Rotta, junto de e-mail
 * e telefone. Até aqui ele era gravado exatamente como a pessoa
 * digitou, e `UsersService.findByIdentifier` procura por dígitos:
 * quem se cadastrou escrevendo "123.456.789-00" tinha uma conta que
 * nunca mais abria por CPF.
 *
 * O mesmo buraco furava a checagem de duplicidade: com e sem máscara
 * são duas strings, e o índice único deixava passar duas contas para a
 * mesma pessoa. É exatamente o defeito já corrigido no telefone em
 * 17/10/2026, no terceiro identificador.
 */
function NormalizaDocumento(): PropertyDecorator {
  return Transform(({ value }): unknown =>
    typeof value === "string" ? normalizarDocumento(value) : value,
  );
}

/** Valida CPF por dígito verificador (não apenas formato) — `@rotta/validators`. */
export function IsCpf(validationOptions?: ValidationOptions) {
  return applyDecorators(NormalizaDocumento(), ((object, propertyName) => {
    registerDecorator({
      name: "isCpf",
      target: object.constructor,
      propertyName: String(propertyName),
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
  }) satisfies PropertyDecorator);
}

export { NormalizaDocumento };
