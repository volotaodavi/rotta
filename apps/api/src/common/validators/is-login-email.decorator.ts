import { applyDecorators } from "@nestjs/common";
import { normalizarEmail } from "@rotta/validators";
import { Transform } from "class-transformer";
import { IsEmail, type ValidationOptions } from "class-validator";

/**
 * E-mail de uma CONTA: normalizado antes de validar e de gravar.
 *
 * ## Por que não basta `@IsEmail()`
 *
 * Porque `@IsEmail()` só valida, e o e-mail é o identificador de login
 * mais usado da Rotta. O teclado do celular capitaliza a primeira
 * letra por padrão, então "Ana@email.com" sai de um iPhone sem esforço
 * nenhum, e colar o endereço costuma trazer um espaço junto.
 *
 * A maioria dos caminhos de cadastro já fazia `trim().toLowerCase()` à
 * mão no serviço, mas não todos (a criação de conta de Admin Rotta,
 * por exemplo, gravava cru), e o login procurava exatamente o que foi
 * digitado. As duas pontas falhavam no mesmo ponto: conta que existe,
 * senha certa, e "não foi possível entrar".
 *
 * Com a normalização aqui, ela acontece uma vez, no mesmo lugar para
 * todo DTO, em vez de depender de cada serviço lembrar.
 */
export function IsLoginEmail(validationOptions?: ValidationOptions) {
  return applyDecorators(
    Transform(({ value }): unknown => (typeof value === "string" ? normalizarEmail(value) : value)),
    IsEmail({}, validationOptions),
  );
}
