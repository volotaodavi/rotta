import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SchoolShift, StudentSex } from "@prisma/client";

export class StudentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() responsavelId!: string;
  @ApiProperty() nome!: string;
  @ApiPropertyOptional() fotoUrl?: string | null;
  @ApiProperty() dataNascimento!: Date;
  @ApiProperty({ enum: StudentSex }) sexo!: StudentSex;

  @ApiProperty() schoolId!: string;
  @ApiProperty({ enum: SchoolShift }) turno!: SchoolShift;

  @ApiProperty() embarqueCep!: string;
  @ApiProperty() embarqueLogradouro!: string;
  @ApiProperty() embarqueNumero!: string;
  @ApiPropertyOptional() embarqueComplemento?: string | null;
  @ApiProperty() embarqueBairro!: string;
  @ApiProperty() embarqueCidade!: string;
  @ApiProperty() embarqueEstado!: string;
  @ApiPropertyOptional() embarqueLatitude?: number | null;
  @ApiPropertyOptional() embarqueLongitude?: number | null;

  @ApiProperty() desembarqueCep!: string;
  @ApiProperty() desembarqueLogradouro!: string;
  @ApiProperty() desembarqueNumero!: string;
  @ApiPropertyOptional() desembarqueComplemento?: string | null;
  @ApiProperty() desembarqueBairro!: string;
  @ApiProperty() desembarqueCidade!: string;
  @ApiProperty() desembarqueEstado!: string;
  @ApiPropertyOptional() desembarqueLatitude?: number | null;
  @ApiPropertyOptional() desembarqueLongitude?: number | null;

  @ApiPropertyOptional() necessidadesEspeciais?: string | null;
  @ApiPropertyOptional() medicamentos?: string | null;
  @ApiPropertyOptional() observacoes?: string | null;

  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}

export class ListStudentsResponseDto {
  @ApiProperty({ type: [StudentResponseDto] }) items!: StudentResponseDto[];
  @ApiProperty() total!: number;
  @ApiProperty() page!: number;
  @ApiProperty() pageSize!: number;
}
