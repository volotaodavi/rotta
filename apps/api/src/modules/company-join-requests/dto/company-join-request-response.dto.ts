import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";

import { Role } from "@/shared/enums";

/** Visão do próprio solicitante (`GET /company-join-requests/me`) e da empresa (`GET /company-join-requests`). */
export class CompanyJoinRequestResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() companyId!: string;
  @ApiProperty() companyName!: string;
  @ApiProperty({ enum: [Role.MOTORISTA, Role.MONITOR] }) role!: Role;
  @ApiProperty({ enum: ["PENDENTE", "APROVADO", "RECUSADO"] })
  status!: "PENDENTE" | "APROVADO" | "RECUSADO";
  @ApiPropertyOptional() motivoRecusa?: string | null;
  @ApiProperty() createdAt!: Date;
  @ApiPropertyOptional() decidedAt?: Date | null;
}

/** Linha de `GET /company-join-requests` (visão da empresa) — inclui quem é o solicitante. */
export class CompanyJoinRequestListItemDto extends CompanyJoinRequestResponseDto {
  @ApiProperty() userId!: string;
  @ApiProperty() userName!: string;
  @ApiProperty() userEmail!: string;
  @ApiProperty() userTelefone!: string;
}
