import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SchoolAdministrativeDependency, SchoolShift, SchoolType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUrl,
  Length,
  MaxLength,
} from "class-validator";

import { IsBrazilianPhone, IsCep, IsCpfOrCnpj } from "@/common/validators";

/**
 * Cadastro de Escola (briefing "CADASTRO"/"ENDEREÇO"/"TIPOS"/
 * "DEPENDÊNCIA ADMINISTRATIVA"/"TURNOS") — nunca recebe `codigoInterno`
 * (gerado por `SchoolsService.create()`) nem `status`/`origemCadastro`
 * (decididos pelo service conforme quem/como está criando).
 */
export class CreateSchoolDto {
  @ApiPropertyOptional({ description: "Código oficial do Censo Escolar (INEP), quando existir" })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  codigoInep?: string;

  @ApiProperty({ example: "EMEF Professora Ana Souza" })
  @IsString()
  @MaxLength(200)
  nomeOficial!: string;

  @ApiPropertyOptional({ example: "Escola do Bairro" })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  nomeFantasia?: string;

  @ApiPropertyOptional({ example: "Rede Municipal de São Paulo" })
  @IsOptional()
  @IsString()
  @MaxLength(160)
  redeEnsino?: string;

  @ApiProperty({
    enum: SchoolAdministrativeDependency,
    example: SchoolAdministrativeDependency.MUNICIPAL,
  })
  @IsEnum(SchoolAdministrativeDependency)
  dependenciaAdministrativa!: SchoolAdministrativeDependency;

  @ApiPropertyOptional({ description: "CPF (autônomo) ou CNPJ, quando a escola tiver um próprio" })
  @IsOptional()
  @IsCpfOrCnpj()
  cnpj?: string;

  @ApiPropertyOptional({ example: "1131001000" })
  @IsOptional()
  @IsBrazilianPhone()
  telefone?: string;

  @ApiPropertyOptional({ example: "11987654321" })
  @IsOptional()
  @IsBrazilianPhone()
  whatsapp?: string;

  @ApiPropertyOptional({ example: "contato@escola.edu.br" })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: "https://escola.edu.br" })
  @IsOptional()
  @IsUrl()
  website?: string;

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

  @ApiPropertyOptional({ example: "Fundos" })
  @IsOptional()
  @IsString()
  @MaxLength(80)
  complemento?: string;

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

  @ApiPropertyOptional({ example: "Brasil", default: "Brasil" })
  @IsOptional()
  @IsString()
  @MaxLength(60)
  pais?: string;

  @ApiPropertyOptional({ example: -23.561684 })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  latitude?: number;

  @ApiPropertyOptional({ example: -46.655981 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  longitude?: number;

  @ApiPropertyOptional({ example: "Portão dos fundos é o único aberto ao transporte escolar." })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  observacoesLocalizacao?: string;

  @ApiProperty({ enum: SchoolType, isArray: true, example: [SchoolType.FUNDAMENTAL] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(SchoolType, { each: true })
  tipos!: SchoolType[];

  @ApiProperty({
    enum: SchoolShift,
    isArray: true,
    example: [SchoolShift.MANHA, SchoolShift.TARDE],
  })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsEnum(SchoolShift, { each: true })
  turnosAtendidos!: SchoolShift[];
}
