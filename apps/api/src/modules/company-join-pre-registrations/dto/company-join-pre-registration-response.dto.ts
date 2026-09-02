import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import type { CompanyJoinPreRegistrationStatus } from "@prisma/client";

import { Role } from "@/shared/enums";


export class CompanyJoinPreRegistrationResponseDto {
  @ApiProperty()
  id!: string;

  @ApiProperty({ enum: [Role.MOTORISTA, Role.MONITOR] })
  role!: string;

  @ApiPropertyOptional()
  nome!: string | null;

  @ApiPropertyOptional()
  celular!: string | null;

  @ApiProperty({ enum: ["PENDENTE", "VINCULADO", "CANCELADO"] })
  status!: CompanyJoinPreRegistrationStatus;

  @ApiPropertyOptional()
  vinculadoEm!: Date | null;

  @ApiProperty()
  createdAt!: Date;
}

export class ListCompanyJoinPreRegistrationsResponseDto {
  @ApiProperty({ type: [CompanyJoinPreRegistrationResponseDto] })
  items!: CompanyJoinPreRegistrationResponseDto[];
}
