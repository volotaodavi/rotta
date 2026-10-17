import { applyDecorators } from "@nestjs/common";
import {
  isValidBrazilianMobile,
  isValidBrazilianPhone,
  normalizarTelefone,
} from "@rotta/validators";
import { Transform } from "class-transformer";
import { registerDecorator, type ValidationOptions } from "class-validator";

/**
 * Normaliza o telefone ANTES de validar e de gravar.
 *
 * Isto roda no `plainToInstance` do `ValidationPipe` (`transform: true`
 * em `main.ts`), ou seja, o que chega ao serviço e ao banco já é só
 * dígito: sem máscara, sem +55, sem o "0" de tronco.
 *
 * ## Por que isto é correção de defeito, e não arrumação
 *
 * O telefone é LOGIN na Rotta. Até 17/10/2026 ele era gravado
 * exatamente como a pessoa digitou, e o login procura por dígitos.
 * Quem cadastrava um responsável escrevendo "(21) 99709-9557" gravava
 * a máscara junto; na hora de entrar, a busca era por "21997099557", e
 * a conta não abria. Nunca. Sem mensagem que explicasse, porque para o
 * sistema aquele telefone simplesmente não existia.
 *
 * O mesmo buraco furava a checagem de duplicidade: com e sem máscara
 * são duas strings, então o índice único deixava passar duas contas
 * para a mesma pessoa.
 */
function NormalizaTelefone(): PropertyDecorator {
  return Transform(({ value }): unknown =>
    typeof value === "string" ? normalizarTelefone(value) : value,
  );
}

/**
 * Telefone brasileiro, fixo ou celular (`@rotta/validators`).
 *
 * Use em número de ESCOLA e de EMPRESA, que pode ser fixo e não serve
 * para entrar no sistema. Para o número de uma PESSOA, use
 * `IsBrazilianMobile`.
 */
export function IsBrazilianPhone(validationOptions?: ValidationOptions) {
  return applyDecorators(NormalizaTelefone(), ((object, propertyName) => {
    registerDecorator({
      name: "isBrazilianPhone",
      target: object.constructor,
      propertyName: String(propertyName),
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
  }) satisfies PropertyDecorator);
}

/**
 * Celular de uma PESSOA: login e canal de aviso (`@rotta/validators`).
 *
 * Exige DDD válido, onze dígitos e o nono dígito, porque o erro aqui
 * não custa um telefone errado numa ficha: custa uma pessoa que nunca
 * mais entra na conta dela. Quem cadastra o responsável costuma ser a
 * transportadora, e ninguém confere o dígito na hora.
 */
export function IsBrazilianMobile(validationOptions?: ValidationOptions) {
  return applyDecorators(NormalizaTelefone(), ((object, propertyName) => {
    registerDecorator({
      name: "isBrazilianMobile",
      target: object.constructor,
      propertyName: String(propertyName),
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === "string" && isValidBrazilianMobile(value);
        },
        defaultMessage(): string {
          return "Informe um celular com DDD, no formato (11) 91234-5678.";
        },
      },
    });
  }) satisfies PropertyDecorator);
}
