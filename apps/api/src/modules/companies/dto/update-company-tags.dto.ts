import { ApiProperty } from "@nestjs/swagger";
import { ServiceTag } from "@prisma/client";
import { ArrayNotEmpty, ArrayUnique, IsArray, IsEnum } from "class-validator";

/**
 * Habilitações desta transportadora (25/09/2026).
 *
 * A lista SUBSTITUI a anterior — não acrescenta. É o gesto que o Admin
 * espera de uma tela de caixinhas: ele marca as que valem e salva.
 *
 * `ArrayNotEmpty` porque empresa sem tag nenhuma não enxergaria
 * funcionalidade alguma, o que é um estado sem uso. Para tirar uma
 * empresa do ar existe `status`, que é o campo certo para isso e tem
 * auditoria própria.
 *
 * Endpoint só do Admin da Rotta: habilitar-se como licitada é uma
 * afirmação sobre um contrato com o poder público, não autoatendimento.
 */
export class UpdateCompanyTagsDto {
  @ApiProperty({
    enum: ServiceTag,
    isArray: true,
    description:
      "Habilitações da empresa. Acumulativas — com as duas, ela tem acesso a todas as funcionalidades.",
    example: ["LICITADA", "PRIVADA"],
  })
  @IsArray()
  @ArrayNotEmpty({ message: "Informe ao menos uma habilitação." })
  @ArrayUnique()
  @IsEnum(ServiceTag, { each: true })
  tags!: ServiceTag[];
}
