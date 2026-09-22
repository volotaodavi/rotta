import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { SchoolStaffRole, UserStatus } from "@prisma/client";

/** Uma conta do Portal da Escola. Nunca traz hash de senha, obviamente. */
export class ContaDaEscolaResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty()
  nome!: string;

  @ApiProperty()
  email!: string;

  @ApiProperty()
  telefone!: string;

  @ApiProperty({ enum: SchoolStaffRole, nullable: true })
  papel!: SchoolStaffRole | null;

  @ApiProperty({ enum: UserStatus })
  status!: UserStatus;

  @ApiProperty()
  escolaId!: string;

  @ApiPropertyOptional({ nullable: true })
  escolaNome!: string | null;

  @ApiProperty()
  createdAt!: string;
}
