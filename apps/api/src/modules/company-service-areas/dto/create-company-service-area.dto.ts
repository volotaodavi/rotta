import { ApiPropertyOptional } from "@nestjs/swagger";
import { SchoolAdministrativeDependency } from "@prisma/client";
import { IsArray, IsEnum, IsOptional, IsString, IsUUID, Length } from "class-validator";

/**
 * Uma área de atuação (fluxo público, 22/09/2026). Cada linha é UMA das
 * duas formas — município inteiro OU escola específica — e o serviço
 * recusa quem mandar as duas ou nenhuma.
 */
export class CreateCompanyServiceAreaDto {
  @ApiPropertyOptional({
    description: "Município. Vem junto de `estado`. Acento e caixa não importam na comparação.",
    example: "Maricá",
  })
  @IsOptional()
  @IsString()
  cidade?: string;

  @ApiPropertyOptional({ description: "UF de duas letras.", example: "RJ" })
  @IsOptional()
  @IsString()
  @Length(2, 2)
  estado?: string;

  @ApiPropertyOptional({
    description: "Escola específica, quando a área não é um município inteiro.",
  })
  @IsOptional()
  @IsUUID()
  schoolId?: string;

  @ApiPropertyOptional({
    enum: SchoolAdministrativeDependency,
    isArray: true,
    description:
      "Redes atendidas dentro do município (`se é repartição pública ou privada`). Vazio = todas. Só vale em área de município.",
    example: ["MUNICIPAL", "ESTADUAL"],
  })
  @IsOptional()
  @IsArray()
  @IsEnum(SchoolAdministrativeDependency, { each: true })
  dependencias?: SchoolAdministrativeDependency[];
}
