import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { CompanyType } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsEnum,
  IsHexColor,
  IsLatitude,
  IsLongitude,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
  MaxLength,
  ValidateNested,
} from "class-validator";

import { CreateCompanyAdminDto } from "./create-company-admin.dto";

import { IsBrazilianPhone, IsCep, IsCpfOrCnpj } from "@/common/validators";


/** Cadastro de Empresa (Dossiê 16, `EMP-01`) — sempre cria o tenant + o primeiro usuário administrador. */
export class CreateCompanyDto {
  @ApiProperty({ example: "Transportes Rotta LTDA" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  razaoSocial!: string;

  @ApiProperty({ example: "Rotta Transportes" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(160)
  nomeFantasia!: string;

  @ApiProperty({
    description: "CPF (Motorista Autônomo) ou CNPJ (demais tipos)",
    example: "11222333000181",
  })
  @IsCpfOrCnpj()
  cpfCnpj!: string;

  @ApiProperty({ enum: CompanyType, example: CompanyType.LTDA })
  @IsEnum(CompanyType)
  tipo!: CompanyType;

  @ApiProperty({ example: "contato@rottatransportes.com.br" })
  @IsString()
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: "11987654321" })
  @IsBrazilianPhone()
  telefone!: string;

  @ApiPropertyOptional({ example: "11987654321" })
  @IsOptional()
  @IsBrazilianPhone()
  whatsapp?: string;

  @ApiProperty({ example: "01310100" })
  @IsCep()
  cep!: string;

  @ApiProperty({ example: "Avenida Paulista" })
  @IsString()
  @IsNotEmpty()
  endereco!: string;

  @ApiProperty({ example: "1000" })
  @IsString()
  @IsNotEmpty()
  numero!: string;

  @ApiPropertyOptional({ example: "Sala 10" })
  @IsOptional()
  @IsString()
  complemento?: string;

  @ApiProperty({ example: "Bela Vista" })
  @IsString()
  @IsNotEmpty()
  bairro!: string;

  @ApiProperty({ example: "São Paulo" })
  @IsString()
  @IsNotEmpty()
  cidade!: string;

  @ApiProperty({ example: "SP", minLength: 2, maxLength: 2 })
  @IsString()
  @Length(2, 2)
  estado!: string;

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

  @ApiPropertyOptional({
    example: "#3B6EF6",
    description: "Dossiê 24 — cor de destaque da marca da empresa",
  })
  @IsOptional()
  @IsHexColor()
  corPrimaria?: string;

  @ApiPropertyOptional({ example: "pt-BR" })
  @IsOptional()
  @IsString()
  idioma?: string;

  @ApiPropertyOptional({ example: "America/Sao_Paulo" })
  @IsOptional()
  @IsString()
  fusoHorario?: string;

  @ApiPropertyOptional({
    example: "STARTER",
    description: "Padrão: STARTER (único plano disponível hoje)",
  })
  @IsOptional()
  @IsString()
  planCode?: string;

  @ApiProperty({ type: CreateCompanyAdminDto })
  @ValidateNested()
  @Type(() => CreateCompanyAdminDto)
  administrador!: CreateCompanyAdminDto;
}
