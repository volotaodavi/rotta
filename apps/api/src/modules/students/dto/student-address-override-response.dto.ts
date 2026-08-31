import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { StudentAddressOverrideLocalTipo, StudentAddressOverrideTrecho } from "@prisma/client";

/** Forma de resposta pública de `StudentAddressOverride`. */
export class StudentAddressOverrideResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty({ example: "2026-09-01" }) data!: string;
  @ApiProperty({ enum: StudentAddressOverrideTrecho }) trecho!: StudentAddressOverrideTrecho;
  /** Frente 10(c) — ver doc do enum no schema. */
  @ApiProperty({ enum: StudentAddressOverrideLocalTipo })
  localTipo!: StudentAddressOverrideLocalTipo;
  @ApiPropertyOptional({ nullable: true }) cep!: string | null;
  @ApiPropertyOptional({ nullable: true }) logradouro!: string | null;
  @ApiPropertyOptional({ nullable: true }) numero!: string | null;
  @ApiPropertyOptional({ nullable: true }) complemento!: string | null;
  @ApiPropertyOptional({ nullable: true }) bairro!: string | null;
  @ApiPropertyOptional({ nullable: true }) cidade!: string | null;
  @ApiPropertyOptional({ nullable: true }) estado!: string | null;
  @ApiPropertyOptional({ nullable: true }) latitude!: number | null;
  @ApiPropertyOptional({ nullable: true }) longitude!: number | null;
  /** Frente 10(c) — "embarque adiado", formato "HH:mm". */
  @ApiPropertyOptional({ nullable: true, example: "16:30" }) horarioAlternativo!: string | null;
  @ApiPropertyOptional({ nullable: true }) observacao!: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
