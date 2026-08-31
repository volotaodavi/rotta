import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { StudentAddressOverrideTrecho } from "@prisma/client";

/** Forma de resposta pública de `StudentAddressOverrideRecurrence`. */
export class StudentAddressOverrideRecurrenceResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty({ example: [2, 4], type: [Number] }) diasSemana!: number[];
  @ApiProperty({ example: "2026-09-01" }) vigenciaInicio!: string;
  @ApiPropertyOptional({ nullable: true, example: "2026-12-15" }) vigenciaFim!: string | null;
  @ApiProperty({ enum: StudentAddressOverrideTrecho }) trecho!: StudentAddressOverrideTrecho;
  @ApiProperty() cep!: string;
  @ApiProperty() logradouro!: string;
  @ApiProperty() numero!: string;
  @ApiPropertyOptional({ nullable: true }) complemento!: string | null;
  @ApiProperty() bairro!: string;
  @ApiProperty() cidade!: string;
  @ApiProperty() estado!: string;
  @ApiProperty() latitude!: number;
  @ApiProperty() longitude!: number;
  @ApiPropertyOptional({ nullable: true }) observacao!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
