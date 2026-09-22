import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SchoolAdministrativeDependency } from "@prisma/client";

export class CompanyServiceAreaResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  companyId!: string;

  @ApiPropertyOptional({ nullable: true, example: "Maricá" })
  cidade!: string | null;

  @ApiPropertyOptional({ nullable: true, example: "RJ" })
  estado!: string | null;

  @ApiPropertyOptional({ nullable: true })
  schoolId!: string | null;

  @ApiPropertyOptional({
    description:
      "Nome da escola, quando a área é de uma escola específica — a tela mostra o nome, não o UUID.",
    nullable: true,
  })
  schoolNome!: string | null;

  @ApiProperty({
    enum: SchoolAdministrativeDependency,
    isArray: true,
    description: "Vazio = todas as redes daquele município.",
  })
  dependencias!: SchoolAdministrativeDependency[];

  @ApiProperty()
  createdAt!: string;
}
