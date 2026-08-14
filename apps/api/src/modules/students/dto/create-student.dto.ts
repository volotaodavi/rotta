import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SchoolShift, StudentSex } from "@prisma/client";
import { Type } from "class-transformer";
import {
  IsDateString,
  IsEnum,
  IsLatitude,
  IsLongitude,
  IsOptional,
  IsString,
  IsUUID,
  Length,
  MaxLength,
} from "class-validator";

import { IsCep } from "@/common/validators";

/**
 * Cadastro de Aluno (briefing "CADASTRO DO ALUNO") — sempre pelo
 * próprio Responsável autenticado (`actor.sub`, nunca um `responsavelId`
 * vindo do body). `fotoUrl` não é aceita aqui: é definida por
 * `POST /students/:id/photo`, mesmo padrão de `Vehicle.fotoUrl`.
 */
export class CreateStudentDto {
  @ApiProperty({ example: "Maria Souza" })
  @IsString()
  @MaxLength(160)
  nome!: string;

  @ApiProperty({ example: "2015-03-20" })
  @IsDateString()
  dataNascimento!: string;

  @ApiProperty({ enum: StudentSex, example: StudentSex.FEMININO })
  @IsEnum(StudentSex)
  sexo!: StudentSex;

  @ApiProperty({ description: "Escola do catálogo compartilhado" })
  @IsUUID()
  schoolId!: string;

  @ApiProperty({ enum: SchoolShift, example: SchoolShift.MANHA })
  @IsEnum(SchoolShift)
  turno!: SchoolShift;

  @ApiProperty({ example: "01310100" })
  @IsCep()
  embarqueCep!: string;

  @ApiProperty({ example: "Avenida Paulista" })
  @IsString()
  @MaxLength(200)
  embarqueLogradouro!: string;

  @ApiProperty({ example: "1000" })
  @IsString()
  @MaxLength(20)
  embarqueNumero!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  embarqueComplemento?: string;

  @ApiProperty({ example: "Bela Vista" })
  @IsString()
  @MaxLength(120)
  embarqueBairro!: string;

  @ApiProperty({ example: "São Paulo" })
  @IsString()
  @MaxLength(120)
  embarqueCidade!: string;

  @ApiProperty({ example: "SP", minLength: 2, maxLength: 2 })
  @IsString()
  @Length(2, 2)
  embarqueEstado!: string;

  @ApiPropertyOptional({ example: -23.561684 })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  embarqueLatitude?: number;

  @ApiPropertyOptional({ example: -46.655981 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  embarqueLongitude?: number;

  @ApiProperty({ example: "01310100" })
  @IsCep()
  desembarqueCep!: string;

  @ApiProperty({ example: "Avenida Paulista" })
  @IsString()
  @MaxLength(200)
  desembarqueLogradouro!: string;

  @ApiProperty({ example: "1000" })
  @IsString()
  @MaxLength(20)
  desembarqueNumero!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(80)
  desembarqueComplemento?: string;

  @ApiProperty({ example: "Bela Vista" })
  @IsString()
  @MaxLength(120)
  desembarqueBairro!: string;

  @ApiProperty({ example: "São Paulo" })
  @IsString()
  @MaxLength(120)
  desembarqueCidade!: string;

  @ApiProperty({ example: "SP", minLength: 2, maxLength: 2 })
  @IsString()
  @Length(2, 2)
  desembarqueEstado!: string;

  @ApiPropertyOptional({ example: -23.561684 })
  @IsOptional()
  @Type(() => Number)
  @IsLatitude()
  desembarqueLatitude?: number;

  @ApiPropertyOptional({ example: -46.655981 })
  @IsOptional()
  @Type(() => Number)
  @IsLongitude()
  desembarqueLongitude?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  necessidadesEspeciais?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  medicamentos?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  observacoes?: string;

  @ApiPropertyOptional({
    description:
      "ID do StudentPreRegistration reivindicado (POST /student-pre-registrations/:id/claim) — " +
      "pedido do usuário: fluxo 'código do transporte + celular'. Opcional: cadastro direto (sem pré-cadastro) continua funcionando igual.",
  })
  @IsOptional()
  @IsUUID()
  preRegistrationId?: string;
}
