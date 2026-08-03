import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

export class StudentAuthorizedPersonResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() studentId!: string;
  @ApiProperty() nome!: string;
  @ApiPropertyOptional() cpf?: string | null;
  @ApiPropertyOptional() telefone?: string | null;
  @ApiPropertyOptional() parentesco?: string | null;
  @ApiProperty() createdAt!: Date;
}
