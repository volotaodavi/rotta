import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SchoolAccessPointType } from "@prisma/client";

export class SchoolAccessPointResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() schoolId!: string;
  @ApiProperty({ enum: SchoolAccessPointType }) tipo!: SchoolAccessPointType;
  @ApiProperty() nome!: string;
  @ApiPropertyOptional() descricao?: string | null;
  @ApiProperty() latitude!: number;
  @ApiProperty() longitude!: number;
  @ApiPropertyOptional() observacoes?: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
