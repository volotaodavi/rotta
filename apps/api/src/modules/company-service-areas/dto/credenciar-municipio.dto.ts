import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SchoolAdministrativeDependency } from "@prisma/client";
import { IsArray, IsEnum, IsOptional, IsString, Length } from "class-validator";

/**
 * Credencia a transportadora em TODAS as escolas de um município
 * (pedido do usuário 24/09/2026: "escolhendo a cidade da prestadora de
 * serviço, pegará TODAS as escolas daquele município já colocadas no
 * site pela planilha. Não deverá inventar ou faltar").
 *
 * As duas palavras finais do pedido viraram as duas garantias do
 * serviço: **não inventar** (só vincula escola que já existe no
 * catálogo, nunca cria) e **não faltar** (vincula todas as que casam,
 * sem paginação, e devolve a contagem para conferência).
 */
export class CredenciarMunicipioDto {
  @ApiProperty({ example: "Maricá" })
  @IsString()
  @Length(2, 120)
  cidade!: string;

  @ApiProperty({ example: "RJ" })
  @IsString()
  @Length(2, 2)
  estado!: string;

  @ApiPropertyOptional({
    enum: SchoolAdministrativeDependency,
    isArray: true,
    description:
      "Redes a credenciar dentro do município. Vazio = todas. Use `[MUNICIPAL, ESTADUAL]` para só a rede pública.",
    example: ["MUNICIPAL", "ESTADUAL"],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(SchoolAdministrativeDependency, { each: true })
  dependencias?: SchoolAdministrativeDependency[];
}
