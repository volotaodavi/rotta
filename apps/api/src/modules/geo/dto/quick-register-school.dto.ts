import { ApiProperty } from "@nestjs/swagger";
import { SchoolAdministrativeDependency } from "@prisma/client";
import { IsEnum, IsString, Length, MaxLength } from "class-validator";

import { IsCep } from "@/common/validators";

/**
 * `POST /geo/schools/quick-register` — autocadastro rápido de escola
 * pelo Responsável (Geocoding AI Agent, gatilho: "não aparece escolas
 * para clicar, nem busca rápida para ver se a escola existe" — pedido
 * do usuário). Só os campos que um Responsável digitando no meio do
 * cadastro do próprio filho realmente sabe de cabeça — nada de
 * `tipos`/`turnosAtendidos`/CNPJ, que um Gestor completa depois (mesmo
 * placeholder honesto que a Education Sync Agent já usa pra escola nova
 * vinda do Censo Escolar, `InepSyncService`).
 */
export class QuickRegisterSchoolDto {
  @ApiProperty({ example: "EMEF Professora Ana Souza" })
  @IsString()
  @MaxLength(200)
  nomeOficial!: string;

  @ApiProperty({
    enum: SchoolAdministrativeDependency,
    example: SchoolAdministrativeDependency.MUNICIPAL,
  })
  @IsEnum(SchoolAdministrativeDependency)
  dependenciaAdministrativa!: SchoolAdministrativeDependency;

  @ApiProperty({ example: "01310100" })
  @IsCep()
  cep!: string;

  @ApiProperty({ example: "Avenida Paulista" })
  @IsString()
  @MaxLength(200)
  logradouro!: string;

  @ApiProperty({ example: "1000" })
  @IsString()
  @MaxLength(20)
  numero!: string;

  @ApiProperty({ example: "Bela Vista" })
  @IsString()
  @MaxLength(120)
  bairro!: string;

  @ApiProperty({ example: "São Paulo" })
  @IsString()
  @MaxLength(120)
  cidade!: string;

  @ApiProperty({ example: "SP", minLength: 2, maxLength: 2 })
  @IsString()
  @Length(2, 2)
  estado!: string;
}
