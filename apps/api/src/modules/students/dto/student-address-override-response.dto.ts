import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { StudentAddressOverrideTrecho } from "@prisma/client";

/** Forma de resposta pública de `StudentAddressOverride`. */
export class StudentAddressOverrideResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty({ example: "2026-09-01" }) data!: string;
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
